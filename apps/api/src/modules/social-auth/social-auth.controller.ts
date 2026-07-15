import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '@dexo/auth';
import { PrismaService } from '@dexo/shared';
import { SocialAuthService } from './social-auth.service';
import { OAuthProvider } from './social-auth.service';

@Controller('auth/social')
export class SocialAuthController {
  constructor(
    private socialAuthService: SocialAuthService,
    private prisma: PrismaService,
  ) {}

  // ===================== TENANT-LEVEL OAUTH =====================

  @Get('tenant/:tenantId/:provider/url')
  async getTenantAuthUrl(
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: any,
    // `returnUrl` = where the user should land after sign-in (their app's
    // /auth/callback page). `redirectUri` kept as a deprecated alias.
    @Query('returnUrl') returnUrl?: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    const url = await this.socialAuthService.getTenantAuthUrl(tenantId, provider, returnUrl || redirectUri);
    return { url, provider, tenantId };
  }

  @Get('tenant/:tenantId/:provider/callback')
  async handleTenantCallback(
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: any,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const result = await this.socialAuthService.handleProviderCallback(provider, code, state);
    // Priority: the exact page that started the flow (carried in state) →
    // the tenant's own subdomain → global FRONTEND_URL. Never a fixed URL for
    // all tenants: this is a multi-tenant platform.
    const { returnUrl } = this.socialAuthService.extractStateData(state);
    let base = this.socialAuthService.validateReturnUrl(returnUrl || undefined);
    if (!base) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subdomain: true },
      });
      const platformDomain = process.env.PLATFORM_DOMAIN || 'onedexo.com';
      base = tenant?.subdomain
        ? `https://${tenant.subdomain}.${platformDomain}/auth/callback`
        : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback`;
    }
    const sep = base.includes('?') ? '&' : '?';
    res.redirect(`${base}${sep}token=${result.accessToken}&refresh=${result.refreshToken}&new=${result.isNewUser}`);
  }

  @Post('tenant/:tenantId/:provider/config')
  @UseGuards(JwtAuthGuard)
  async updateTenantConfig(
    @Req() req: any,
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: any,
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
