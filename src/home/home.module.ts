import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { requireEnv } from '../config/env';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { RoutinesModule } from '../routines/routines.module';
import { HomeService } from './home.service';
import { HomeController } from './home.controller';

@Module({
  imports: [
    UsersModule,
    RoutinesModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireEnv('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [HomeService, JwtAuthGuard],
  controllers: [HomeController],
})
export class HomeModule {}
