import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '@dexo/shared';
import { AuthModule } from '@dexo/auth';
import { SocialAuthService } from './social-auth.service';
import { SocialAuthController } from './social-auth.controller';
import { PlatformOAuthController } from './platform-oauth.controller';

@Module({
  imports: [PrismaModule, AuthModule, HttpModule],
  providers: [SocialAuthService],
  controllers: [SocialAuthController, PlatformOAuthController],
  exports: [SocialAuthService],
})
export class SocialAuthModule {}
