import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '@dexo/auth';
import { SocialAuthService } from './social-auth.service';
import { OAuthProvider } from '@prisma/client';

@Controller('auth/social')
export class SocialAuthController {
  constructor(private socialAuthService: SocialAuthService) {}

  // ===================== TENANT-LEVEL OAUTH =====================

  @Get('tenant/:tenantId/:provider/url')
  async getTenantAuthUrl(
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: OAuthProvider,
    @Query('redirectUri') redirectUri?: string,
  ) {
    const url = await this.socialAuthService.getTenantAuthUrl(tenantId, provider, redirectUri);
    return { url, provider, tenantId };
  }

  @Get('tenant/:tenantId/:provider/callback')
  async handleTenantCallback(
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: OAuthProvider,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const result = await this.socialAuthService.handleProviderCallback(provider, code, state);
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${result.accessToken}&refresh=${result.refreshToken}&new=${result.isNewUser}`;
    res.redirect(redirectUrl);
  }

  @Post('tenant/:tenantId/:provider/config')
  @UseGuards(JwtAuthGuard)
  async updateTenantConfig(
    @Req() req: any,
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: OAuthProvider,
    @Body() data: any,
  ) {
    return this.socialAuthService.updateTenantConfig(tenantId, provider, data);
  }

  @Get('tenant/:tenantId/configs')
  @UseGuards(JwtAuthGuard)
  async getTenantConfigs(@Req() req: any, @Param('tenantId') tenantId: string) {
    return this.socialAuthService.getTenantConfigs(tenantId);
  }

  // ===================== USER ACCOUNT LINKING =====================

  @Get('linked-accounts')
  @UseGuards(JwtAuthGuard)
  async getLinkedAccounts(@Req() req: any) {
    return this.socialAuthService.getLinkedAccounts(req.user.id);
  }

  @Post('unlink/:provider')
  @UseGuards(JwtAuthGuard)
  async unlinkAccount(@Req() req: any, @Param('provider') provider: OAuthProvider) {
    await this.socialAuthService.unlinkAccount(req.user.id, provider);
    return { message: `${provider} account unlinked successfully` };
  }
}
