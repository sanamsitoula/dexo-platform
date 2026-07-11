import { Controller, Get, Post, Put, Body, Param, UseGuards, Req, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '@dexo/auth';
import { SocialAuthService } from './social-auth.service';

@Controller('auth/platform')
export class PlatformOAuthController {
  constructor(private socialAuthService: SocialAuthService) {}

  // ===================== PLATFORM-LEVEL OAUTH (for platform admins) =====================

  @Get(':provider/url')
  async getPlatformAuthUrl(
    @Param('provider') provider: any,
    @Query('redirectUri') redirectUri?: string,
  ) {
    const url = await this.socialAuthService.getPlatformAuthUrl(provider, redirectUri);
    return { url, provider };
  }

  @Get(':provider/callback')
  async handlePlatformCallback(
    @Param('provider') provider: any,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const result = await this.socialAuthService.handleProviderCallback(provider, code, state);
    const redirectUrl = `${process.env.ADMIN_URL || 'http://onedexo.com'}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}&new=${result.isNewUser}`;
    res.redirect(redirectUrl);
  }

  // ===================== PLATFORM OAUTH CONFIG MANAGEMENT =====================

  @Get('configs')
  @UseGuards(JwtAuthGuard)
  async getPlatformConfigs(@Req() req: any) {
    if (!req.user.isPlatformAdmin) {
      throw new Error('Unauthorized');
    }
    return this.socialAuthService.getPlatformConfigs();
  }

  @Post(':provider/config')
  @UseGuards(JwtAuthGuard)
  async updatePlatformConfig(
    @Req() req: any,
    @Param('provider') provider: any,
    @Body() data: any,
  ) {
    if (!req.user.isPlatformAdmin) {
      throw new Error('Unauthorized');
    }
    return this.socialAuthService.updatePlatformConfig(provider, data);
  }
}
