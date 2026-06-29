import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PrismaModule, AuditModule } from '@dexo/shared';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    PrismaModule,
    AuditModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRATION || '1h',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, PlatformAdminGuard],
  exports: [AuthService, JwtAuthGuard, PlatformAdminGuard, JwtModule],
})
export class AuthModule {}
