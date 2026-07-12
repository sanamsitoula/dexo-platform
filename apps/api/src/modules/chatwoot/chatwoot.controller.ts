import { Body, Controller, Get, Param, Post, Put, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard, PlatformAdminGuard, Public } from '@dexo/auth';
import { PrismaService } from '@dexo/shared';
import { ChatwootService } from './chatwoot.service';

/**
 * Super-admin management of the Chatwoot CONNECTION (base URL, API token,
 * the platform account + Tier-2 inbox) — the equivalent of Settings → Email
 * for messaging. `/platform-email` and `/chatwoot` are deliberately the same
 * shape: get/save/test, platform-admin-only.
 */
@Controller('chatwoot')
export class ChatwootController {
  constructor(private chatwoot: ChatwootService, private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get('config')
  getConfig() {
    return this.chatwoot.getGlobalConfig(true);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Put('config')
  saveConfig(@Req() req: any, @Body() dto: any) {
    return this.chatwoot.saveGlobalConfig(dto, req.user?.id || req.user?.sub);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('test')
  test() {
    return this.chatwoot.testGlobalConfig();
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post('provision-platform-inbox')
  provisionPlatformInbox() {
    return this.chatwoot.provisionPlatformInbox();
  }

  // ---- Tenant-admin: the Tier-2 widget (tenant owner/staff <-> platform) ----
  @UseGuards(JwtAuthGuard)
  @Get('platform-widget')
  async getPlatformWidget() {
    const cfg = await this.chatwoot.getGlobalConfig(false);
    if (!cfg?.platformWebsiteToken) return { configured: false };
    return { configured: true, baseUrl: cfg.baseUrl, websiteToken: cfg.platformWebsiteToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get('tenant-config')
  getTenantConfig(@Req() req: any) {
    return this.chatwoot.getTenantConfig(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('re-provision')
  reProvision(@Req() req: any) {
    return this.chatwoot.provisionTenantInbox(req.user.tenantId);
  }

  // ---- Public: the Tier-1 widget (customer <-> tenant), by subdomain — the
  // tenant-website visitor is anonymous, so this cannot require auth. ----
  @Public()
  @Get('public/:subdomain/widget')
  async getPublicWidget(@Param('subdomain') subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain }, select: { id: true } });
    if (!tenant) return { configured: false };
    const tenantCfg = await this.chatwoot.getTenantConfig(tenant.id);
    if (!tenantCfg?.websiteToken) return { configured: false };
    const globalCfg = await this.chatwoot.getGlobalConfig(true);
    return { configured: true, baseUrl: globalCfg?.baseUrl, websiteToken: tenantCfg.websiteToken };
  }

  // ---- Inbound webhook receiver — Chatwoot posts conversation/message
  // events here. Signature verification: Chatwoot's webhook payload doesn't
  // include a shared-secret header by default; treat this as best-effort
  // audit logging, not a trust boundary (see docs/CHATWOOT_INTEGRATION.md
  // "Roadmap" for HMAC verification once Chatwoot's webhook config supports it). ----
  @Public()
  @Post('webhook')
  async webhook(@Body() payload: any) {
    // Best-effort — never let a malformed/unexpected payload 500 the endpoint,
    // Chatwoot will retry a failing webhook and could hammer us.
    return { received: true, event: payload?.event || 'unknown' };
  }
}
