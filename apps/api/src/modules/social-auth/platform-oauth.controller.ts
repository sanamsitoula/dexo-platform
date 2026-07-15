import { Controller, Get, Post, Put, Body, Param, UseGuards, Req, Res, Query } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '@dexo/auth';
import { SocialAuthService } from './social-auth.service';

@Controller('auth/platform')
export class PlatformOAuthController {
  constructor(private socialAuthService: SocialAuthService) {}

  // ===================== PLATFORM-LEVEL OAUTH (for platform admins) =====================

  @Get(':provider/url')
  async getPlatformAuthUrl(
    @Param('provider') provider: any,
    // `returnUrl` = where the user should land after sign-in (their app's
    // /auth/callback page). `redirectUri` kept as a deprecated alias.
    @Query('returnUrl') returnUrl?: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    const url = await this.socialAuthService.getPlatformAuthUrl(provider, returnUrl || redirectUri);
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
    // Land the user back on whichever app started the flow (carried in state);
    // fall back to the platform site for older/naked states.
    const { returnUrl } = this.socialAuthService.extractStateData(state);
    const base = this.socialAuthService.validateReturnUrl(returnUrl || undefined)
      || `${process.env.ADMIN_URL || 'https://onedexo.com'}/auth/callback`;
    const sep = base.includes('?') ? '&' : '?';
    res.redirect(`${base}${sep}token=${result.accessToken}&refresh=${result.refreshToken}&new=${result.isNewUser}`);
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

  /**
   * Non-interactive config health check (curl-able). Validates saved fields,
   * that the redirect URI matches this API's platform callback, and that the
   * provider's endpoints are reachable. `returnUrl`/`redirectUri` query params
   * are NOT used here — kept off this route to avoid confusion with the OAuth
   * start/callback routes.
   */
  @Get(':provider/test')
  @UseGuards(JwtAuthGuard)
  async testPlatformConfig(@Req() req: Request, @Param('provider') provider: any) {
    const proto = (req.headers['x-forwarded-proto'] as string) || (req.headers['x-forwarded-protocol'] as string) || 'https';
    const host = req.headers.host || '';
    const expectedCallback = `${proto}://${host}/api/auth/platform/${provider}/callback`;
    return this.socialAuthService.testPlatformConfig(provider, expectedCallback);
  }
}
