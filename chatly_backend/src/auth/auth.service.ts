import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async loginWithGoogle(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (existingUser && !existingUser.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const user = await this.prisma.user.upsert({
      where: { email: payload.email },
      update: {
        googleId: payload.sub,
        name: payload.name ?? '',
        avatarUrl: payload.picture,
        isOnline: true,
      },
      create: {
        email: payload.email,
        googleId: payload.sub,
        name: payload.name ?? payload.email.split('@')[0],
        username: payload.email.split('@')[0] + '_' + payload.sub.slice(-4),
        avatarUrl: payload.picture,
        isOnline: true,
      },
    });

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '30d' },
    );

    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

    return { accessToken, refreshToken, user };
  }

  async refreshToken(refreshToken: string) {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      }) as { sub: string };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
    const nextRefreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '30d' },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: nextRefreshToken },
    });

    return { accessToken, refreshToken: nextRefreshToken, user };
  }
}
