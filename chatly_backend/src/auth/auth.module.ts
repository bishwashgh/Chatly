import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtStrategy } from './jwt.strategy';
import { OtpMailer } from './otp-mailer';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  providers: [AuthService, AuthResolver, JwtStrategy, OtpMailer],
  exports: [AuthService],
})
export class AuthModule {}
