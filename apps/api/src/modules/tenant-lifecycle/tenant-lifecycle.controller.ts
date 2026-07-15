import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public, JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { PrismaService } from '@dexo/shared';
import { TenantLifecycleService } from './tenant-lifecycle.service';
import { SlugService } from './slug.service';
import { ProvisioningService } from './provisioning.service';
import type { CreateTenantInput } from './provisioning.service';
import { CustomDomainService } from './custom-domain.service';

@ApiTags('tenants')
@Controller('tenants')
export class TenantLifecycleController {
  constructor(
    private readonly lifecycle: TenantLifecycleService,
    private readonly slug: SlugService,
    private readonly provisioning: ProvisioningService,
    private readonly customDomain: CustomDomainService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('check-slug')
  @ApiOperation({ summary: 'Public: check if a subdomain slug is available' })
  async checkSlug(@Query('slug') slug: string) {
    if (!slug) throw new BadRequestException('slug query param required');
    return this.slug.validateSlug(slug);
  }

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public: list ACTIVE tenants (mobile tenant selector, server-side search)' })
  async listPublic(@Query('q') q?: string, @Query('limit') limit?: string) {
    const take = Math.min(Math.max(parseInt(limit || '10', 10) || 10, 1), 50);
    const where: any = {
      status: 'active',
      tenantLifecycle: { status: 'ACTIVE' },
    };
    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { subdomain: { contains: term, mode: 'insensitive' } },
      ];
    }
    return this.prisma.tenant.findMany({
      where,
      select: { id: true, name: true, subdomain: true },
      orderBy: { name: 'asc' },
      take,
    });
  }

  @Public()
  @Post('provision')
  @ApiOperation({ summary: 'Create a new tenant (validates + reserves slug + provisions)' })
  async create(@Body() body: CreateTenantInput) {
    return this.provisioning.provisionTenant(body);
  }

  // ---- Public: resolve "the current tenant" for shared rendering (platform-web
  // TenantProvider, and any front-end that needs branding on a tenant host).
  // Resolves by ?subdomain= or by deriving the subdomain from the request's
  // Origin/Referer host (<slug>.<platformDomain>). Returns 200 with
  // { tenant: null } when there is no tenant (e.g. the apex marketing site) —
  // never 404, so public pages don't log a console error on every load.
  @Public()
  @Get('current')
  @ApiOperation({ summary: 'Public: resolve the current tenant by subdomain/host' })
  async getCurrentTenant(@Req() req: any, @Query('subdomain') subdomain?: string) {
    const platformDomain = (process.env.PLATFORM_DOMAIN || 'onedexo.com').toLowerCase();
    let slug = subdomain || '';
    if (!slug) {
      const raw = req.headers?.origin || req.headers?.referer || '';
      try {
        const host = new URL(raw).hostname.toLowerCase();
        if (host.endsWith(`.${platformDomain}`) && host !== platformDomain && host !== `www.${platformDomain}`) {
          slug = host.slice(0, -(platformDomain.length + 1));
        }
      } catch {
        /* not a URL — leave slug empty */
      }
    }
    if (!slug) return { tenant: null };
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain: slug },
      select: { id: true, name: true, subdomain: true, status: true, settings: true },
    });
    return { tenant };
  }

  // ---- Self-service: the logged-in tenant's OWN branding settings — scoped
  // strictly from req.user.tenantId (never a body/param tenantId), reachable
  // by any authenticated tenant user (not platform-admin-only like the
  // section below). Backs tenant-admin's Gym Settings page and Website
  // Builder Overview page, both of which save their own subset of
  // settings.branding without clobbering the other's fields (shallow merge).
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me/branding')
  @ApiOperation({ summary: "Get the current tenant's branding settings" })
  async getOwnBranding(@Req() req: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { settings: true },
    });
    return ((tenant?.settings as any)?.branding) || {};
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('me/branding')
  @ApiOperation({ summary: "Shallow-merge fields into the current tenant's settings.branding" })
  async updateOwnBranding(@Req() req: any, @Body() body: Record<string, any>) {
    const tenantId = req.user.tenantId;
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const settings = ((tenant?.settings as any) || {});
    const branding = { ...(settings.branding || {}), ...(body || {}) };
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: { ...settings, branding } },
    });
    return ((updated.settings as any)?.branding) || {};
  }

  // ---- Everything below manages an EXISTING tenant's lifecycle, domain or
  // module access — platform-admin only. (Previously unguarded — no global
  // default auth guard exists in this API, so @Public()-less routes here
  // were reachable by anyone with the URL. Fixed as part of the RBAC
  // hierarchy work — see docs/RBAC_ARCHITECTURE.md.) ----
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Get(':id/lifecycle')
  @ApiOperation({ summary: 'Get full tenant lifecycle state' })
  async getLifecycle(@Param('id') id: string) {
    return this.lifecycle.getLifecycle(id);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Post(':id/lifecycle/suspend')
  @ApiOperation({ summary: 'Suspend a tenant (platform admin only)' })
  async suspend(
    @Param('id') id: string,
    @Body() body: { reason: string; suspendedBy: string },
  ) {
    return this.lifecycle.suspendTenant(id, body.reason, body.suspendedBy);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Post(':id/lifecycle/reactivate')
  @ApiOperation({ summary: 'Reactivate a suspended tenant' })
  async reactivate(
    @Param('id') id: string,
    @Body() body: { reactivatedBy: string },
  ) {
    return this.lifecycle.reactivateTenant(id, body.reactivatedBy);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Post(':id/lifecycle/archive')
  @ApiOperation({ summary: 'Archive a SUSPENDED tenant' })
  async archive(
    @Param('id') id: string,
    @Body() body: { archivedBy: string },
  ) {
    return this.lifecycle.archiveTenant(id, body.archivedBy);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Post(':id/lifecycle/delete')
  @ApiOperation({ summary: 'Schedule deletion (30-day grace period)' })
  async scheduleDelete(
    @Param('id') id: string,
    @Body() body: { requestedBy: string },
  ) {
    return this.lifecycle.scheduleDeletion(id, body.requestedBy);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Post(':id/lifecycle/cancel-delete')
  @ApiOperation({ summary: 'Cancel a scheduled deletion' })
  async cancelDelete(@Param('id') id: string) {
    return this.lifecycle.cancelDeletion(id);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Post(':id/domain/request')
  @ApiOperation({ summary: 'Request a custom domain (returns DNS instructions)' })
  async requestDomain(
    @Param('id') id: string,
    @Body() body: { domain: string },
  ) {
    return this.customDomain.requestCustomDomain(id, body.domain);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Post(':id/domain/verify')
  @ApiOperation({ summary: 'Verify TXT record and unlock SSL provisioning' })
  async verifyDomain(@Param('id') id: string) {
    return this.customDomain.verifyCustomDomain(id);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Get(':id/domain/status')
  @ApiOperation({ summary: 'Get domain + SSL status' })
  async domainStatus(@Param('id') id: string) {
    return this.customDomain.getDomainStatus(id);
  }

  // ---- Tenant Module Overrides — explicit platform-admin grant/restriction
  // per tenant per module, taking precedence over the subscription plan.
  // See ModuleAccessGuard in @dexo/shared and docs/RBAC_ARCHITECTURE.md. ----
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Get(':id/module-overrides')
  @ApiOperation({ summary: 'List explicit module grants/restrictions for a tenant' })
  async listModuleOverrides(@Param('id') id: string) {
    return this.prisma.tenantModuleOverride.findMany({ where: { tenantId: id }, orderBy: { moduleKey: 'asc' } });
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Put(':id/module-overrides/:moduleKey')
  @ApiOperation({ summary: 'Grant or restrict a specific module for a tenant, overriding their plan' })
  async setModuleOverride(
    @Param('id') id: string,
    @Param('moduleKey') moduleKey: string,
    @Body() body: { enabled: boolean; reason?: string; setBy?: string },
  ) {
    return this.prisma.tenantModuleOverride.upsert({
      where: { tenantId_moduleKey: { tenantId: id, moduleKey } },
      create: { tenantId: id, moduleKey, enabled: body.enabled, reason: body.reason || null, setBy: body.setBy || null },
      update: { enabled: body.enabled, reason: body.reason || null, setBy: body.setBy || null },
    });
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @ApiBearerAuth()
  @Delete(':id/module-overrides/:moduleKey')
  @ApiOperation({ summary: 'Remove an override — module access reverts to the plan default' })
  async removeModuleOverride(@Param('id') id: string, @Param('moduleKey') moduleKey: string) {
    return this.prisma.tenantModuleOverride.deleteMany({ where: { tenantId: id, moduleKey } });
  }
}
