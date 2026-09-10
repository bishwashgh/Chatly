import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OtpMailer } from './otp-mailer';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const CODE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService, private otpMailer: OtpMailer) {}

  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }

  private hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const key = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${key}`;
  }

  private verifyPassword(password: string, stored?: string | null) {
    if (!stored) return false;
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const actual = scryptSync(password, salt, 64);
    const expected = Buffer.from(key, 'hex');
    return expected.length === actual.length && timingSafeEqual(actual, expected);
  }

  private makeCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }

  private async createTokens(user: any) {
    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email }, { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' });
    const refreshToken = this.jwtService.sign({ sub: user.id }, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '30d' });
    const saved = await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken, isOnline: true } });
    return { accessToken, refreshToken, user: saved };
  }

  private async issueCode(userId: string, type: 'signup' | 'reset', destination: string) {
    const code = this.makeCode();
    const challengeId = randomBytes(18).toString('hex');
    const expires = new Date(Date.now() + CODE_TTL_MS);
    await this.prisma.user.update({
      where: { id: userId },
      data: type === 'signup' ? { signupCodeHash: `${challengeId}:${this.hash(code)}`, signupCodeExpiresAt: expires } : { resetCodeHash: `${challengeId}:${this.hash(code)}`, resetCodeExpiresAt: expires },
    });
    await this.otpMailer.send(destination, code, type);
    return { challengeId, destination, expiresInSeconds: CODE_TTL_MS / 1000 };
  }

  async signUp(name: string, email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing?.isActive) throw new ConflictException('An account with this email already exists');
    const usernameBase = email.toLowerCase().split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 24) || 'chatly';
    let username = `${usernameBase}_${randomBytes(2).toString('hex')}`;
    while (await this.prisma.user.findUnique({ where: { username } })) username = `${usernameBase}_${randomBytes(2).toString('hex')}`;
    const user = existing
      ? await this.prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash: this.hashPassword(password), isActive: true, googleId: null } })
      : await this.prisma.user.create({ data: { name, email: email.toLowerCase(), username, passwordHash: this.hashPassword(password) } });
    return this.issueCode(user.id, 'signup', user.email);
  }

  async resendSignupCode(challengeId: string) {
    const user = await this.prisma.user.findFirst({ where: { signupCodeHash: { startsWith: `${challengeId}:` } } });
    if (!user) throw new BadRequestException('Verification challenge not found');
    return this.issueCode(user.id, 'signup', user.email);
  }

  async verifySignup(challengeId: string, code: string) {
    const user = await this.prisma.user.findFirst({ where: { signupCodeHash: { startsWith: `${challengeId}:` } } });
    if (!user || !user.signupCodeExpiresAt || user.signupCodeExpiresAt < new Date() || user.signupCodeHash !== `${challengeId}:${this.hash(code)}`) throw new BadRequestException('Invalid or expired verification code');
    await this.prisma.user.update({ where: { id: user.id }, data: { signupCodeHash: null, signupCodeExpiresAt: null, isOnline: true } });
    return this.createTokens(user);
  }

  async signIn(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive || !this.verifyPassword(password, user.passwordHash)) throw new UnauthorizedException('Invalid email or password');
    return this.createTokens(user);
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) throw new BadRequestException('No active account found for this email');
    return this.issueCode(user.id, 'reset', user.email);
  }

  async resendPasswordResetCode(email: string, challengeId: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) throw new BadRequestException('No active account found for this email');
    if (!user.resetCodeHash?.startsWith(`${challengeId}:`)) throw new BadRequestException('Reset challenge not found');
    return this.issueCode(user.id, 'reset', user.email);
  }

  async resetPassword(email: string, challengeId: string, code: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt || user.resetCodeExpiresAt < new Date()) throw new BadRequestException('Invalid or expired reset code');
    const [, storedHash] = user.resetCodeHash.split(':');
    if (!user.resetCodeHash.startsWith(`${challengeId}:`) || storedHash !== this.hash(code)) throw new BadRequestException('Invalid or expired reset code');
    return this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: this.hashPassword(password), resetCodeHash: null, resetCodeExpiresAt: null, refreshToken: null } });
  }

  async loginWithGoogle(idToken: string) {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email) throw new UnauthorizedException('Invalid Google token');
    const existingUser = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (existingUser && !existingUser.isActive) throw new UnauthorizedException('This account has been deactivated');
    const user = await this.prisma.user.upsert({
      where: { email: payload.email },
      update: { googleId: payload.sub, name: payload.name ?? '', avatarUrl: payload.picture, isOnline: true },
      create: { email: payload.email, googleId: payload.sub, name: payload.name ?? payload.email.split('@')[0], username: payload.email.split('@')[0] + '_' + payload.sub.slice(-4), avatarUrl: payload.picture, isOnline: true },
    });
    return this.createTokens(user);
  }

  async refreshToken(refreshToken: string) {
    let payload: { sub: string };
    try { payload = this.jwtService.verify(refreshToken, { secret: process.env.JWT_REFRESH_SECRET }) as { sub: string }; } catch { throw new UnauthorizedException('Invalid refresh token'); }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.refreshToken !== refreshToken) throw new UnauthorizedException('Invalid refresh token');
    return this.createTokens(user);
  }
}
