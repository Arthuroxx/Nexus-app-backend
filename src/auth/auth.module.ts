import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { requireEnv } from '../config/env';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleAuthService } from './google-auth.service';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: requireEnv('JWT_SECRET'),
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, GoogleAuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
