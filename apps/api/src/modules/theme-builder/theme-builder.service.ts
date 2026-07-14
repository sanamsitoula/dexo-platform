import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, AuditService } from '@dexo/shared';
import { getTemplate } from '@dexo/shared/src/themes';

interface ActorCtx {
  tenantId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

const TOKEN_FIELDS = [
  'name', 'baseTemplateId',
  'colorPrimary', 'colorAccent', 'colorBackground', 'colorSurface', 'colorText', 'colorTextSecondary',
  'headingFont', 'bodyFont', 'borderRadius',
] as const;

function pickTokens(dto: any): Record<string, any> {
  const data: Record<string, any> = {};
  for (const key of TOKEN_FIELDS) if (dto[key] !== undefined) data[key] = dto[key];
  return data;
}

/**
 * Tenant-scoped Theme Builder — named, saved, switchable custom themes.
 * Exactly one theme may be active per tenant at a time (enforced here, not
 * left to the client). Mirrors PageBuilderService/FormsBuilderService's
 * tenant-isolation convention.
 */
@Injectable()
export class ThemeBuilderService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async listThemes(tenantId: string) {
    await this.ensureSeedTheme(tenantId);
    return this.prisma.tenantTheme.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /** Previously, a tenant who'd only ever picked a template + branding
   * colors in the old Website Builder page (never opened Theme Builder at
   * all) saw an EMPTY theme list here — even though their live site clearly
   * has a theme rendering (the template's palette + any branding
   * override). That's confusing: "the theme builder doesn't show my
   * theme." Fixed by seeding one real, editable, active TenantTheme from
   * whatever's actually live the first time this tenant's theme list is
   * ever requested — with the SAME effective token values already
   * rendering, so nothing visually changes for site visitors; it just
   * becomes the editable source of truth going forward instead of the
   * template+branding fallback path. */
  private async ensureSeedTheme(tenantId: string): Promise<void> {
    const existing = await this.prisma.tenantTheme.count({ where: { tenantId } });
    if (existing > 0) return;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
    const branding = ((tenant?.settings as any) || {}).branding || {};
    const templateId: string | undefined = branding.templateId;
    const tpl = templateId ? getTemplate(templateId) : undefined;
    if (!tpl) return; // nothing chosen yet — genuinely nothing to seed from

    await this.prisma.tenantTheme.create({
      data: {
        tenantId,
        name: `${tpl.templateName} (from your site)`,
        baseTemplateId: templateId,
        colorPrimary: branding.colorPrimary || tpl.palette.primary,
        colorAccent: branding.colorAccent || tpl.palette.accent,
        colorBackground: tpl.palette.background,
        colorSurface: tpl.palette.surface,
        colorText: tpl.palette.text,
        colorTextSecondary: tpl.palette.textSecondary,
        // Capped the same way getSiteTheme's no-active-theme fallback path
        // already capped it, so seeding doesn't silently change the radius
        // that's already rendering.
        borderRadius: Math.min(tpl.borderRadius, 14),
        isActive: true,
      },
    });
  }

  async getTheme(tenantId: string, themeId: string) {
    return this.mustOwnTheme(tenantId, themeId);
  }

  async createTheme(ctx: ActorCtx, dto: any) {
    const theme = await this.prisma.tenantTheme.create({
      data: {
        tenantId: ctx.tenantId,
        ...pickTokens(dto),
        name: dto.name || 'Untitled theme',
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });
    await this.logAudit(ctx, 'create', theme.id, { before: null, after: theme });
    return theme;
  }

  /** Copies an existing tenant theme (or a bare starting point if fromThemeId
   * is omitted) into a new, independent row — editing the copy never
   * touches the original. */
  async duplicateTheme(ctx: ActorCtx, fromThemeId: string | undefined, name: string) {
    const source = fromThemeId ? await this.mustOwnTheme(ctx.tenantId, fromThemeId) : null;
    const theme = await this.prisma.tenantTheme.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        baseTemplateId: source?.baseTemplateId,
        colorPrimary: source?.colorPrimary,
        colorAccent: source?.colorAccent,
        colorBackground: source?.colorBackground,
        colorSurface: source?.colorSurface,
        colorText: source?.colorText,
        colorTextSecondary: source?.colorTextSecondary,
        headingFont: source?.headingFont,
        bodyFont: source?.bodyFont,
        borderRadius: source?.borderRadius,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });
    await this.logAudit(ctx, 'duplicate', theme.id, { before: source, after: theme });
    return theme;
  }

  async updateTheme(ctx: ActorCtx, themeId: string, dto: any) {
    const existing = await this.mustOwnTheme(ctx.tenantId, themeId);
    const updated = await this.prisma.tenantTheme.update({
      where: { id: themeId },
      data: { ...pickTokens(dto), updatedBy: ctx.userId },
    });
    await this.logAudit(ctx, 'update', themeId, { before: existing, after: updated });
    return updated;
  }

  async deleteTheme(ctx: ActorCtx, themeId: string) {
    const existing = await this.mustOwnTheme(ctx.tenantId, themeId);
    await this.prisma.tenantTheme.delete({ where: { id: themeId } });
    await this.logAudit(ctx, 'delete', themeId, { before: existing, after: null });
    return { message: 'Theme deleted' };
  }

  /** Exactly one active theme per tenant — activating this one deactivates
   * any other. Deactivating (activate:false) falls the site back to the
   * legacy Tenant.settings.branding override / raw template, same as
   * before Theme Builder existed. */
  async setActive(ctx: ActorCtx, themeId: string, active: boolean) {
    const existing = await this.mustOwnTheme(ctx.tenantId, themeId);
    if (active) {
      await this.prisma.tenantTheme.updateMany({
        where: { tenantId: ctx.tenantId, isActive: true, NOT: { id: themeId } },
        data: { isActive: false },
      });
    }
    const updated = await this.prisma.tenantTheme.update({ where: { id: themeId }, data: { isActive: active } });
    await this.logAudit(ctx, active ? 'activate' : 'deactivate', themeId, { before: existing, after: updated });
    return updated;
  }

  // ------------------------------------------------------------- Public

  /** The tenant's active theme, if any — for the public site's rendering
   * pipeline (apps/tenant-website/lib/site-theme.ts). No auth. */
  async getActiveTheme(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain }, select: { id: true } });
    if (!tenant) return null;
    return this.prisma.tenantTheme.findFirst({ where: { tenantId: tenant.id, isActive: true } });
  }

  // ------------------------------------------------------------- helpers

  private async mustOwnTheme(tenantId: string, themeId: string) {
    const theme = await this.prisma.tenantTheme.findFirst({ where: { id: themeId, tenantId } });
    if (!theme) throw new NotFoundException('Theme not found');
    return theme;
  }

  private async logAudit(ctx: ActorCtx, action: string, resourceId: string, diff: { before: any; after: any }) {
    await this.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: `theme.${action}`,
      resourceType: 'tenant_theme',
      resourceId,
      changes: diff,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }
}
