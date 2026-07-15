import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService, AuditService } from '@dexo/shared';
// Root import — see provisioning.service.ts: deep src/ imports crash at runtime.
import { getTemplate } from '@dexo/shared';
import * as crypto from 'crypto';

interface ActorCtx {
  tenantId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

const PREVIEW_SECRET = process.env.THEME_PREVIEW_SECRET || process.env.JWT_SECRET || 'dev-theme-preview-secret';
const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000; // 24h — long enough for a review session, short enough not to be a permanent bypass

/** Signs `${themeId}.${expiresAt}` so an admin-only preview link can be
 * shared/opened without a full auth session, while still being unforgeable
 * and time-limited. Checked in getActiveTheme BEFORE the public (published-
 * only) resolution path — see website_builder_remaining.md Phase 3. */
function signPreviewToken(themeId: string, expiresAt: number): string {
  const payload = `${themeId}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', PREVIEW_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

function verifyPreviewToken(token: string, themeId: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [id, expiresAtStr, sig] = decoded.split('.');
    if (id !== themeId) return false;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (!expiresAt || Date.now() > expiresAt) return false;
    const expected = crypto.createHmac('sha256', PREVIEW_SECRET).update(`${id}.${expiresAtStr}`).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

const TOKEN_FIELDS = [
  'name', 'baseTemplateId',
  'colorPrimary', 'colorAccent', 'colorBackground', 'colorSurface', 'colorText', 'colorTextSecondary',
  'headingFont', 'bodyFont', 'borderRadius',
  // Workstream B item 1: hero layout is just another token, going through
  // the exact same draft/publish/preview/revert lifecycle as every other
  // field above — no parallel mechanism.
  'heroLayout',
  // Workstream B item 3: footer structure (columns/links/social/newsletter/
  // copyright) as JSON data — same lifecycle, same mechanism, no exceptions.
  'footerConfig',
  // Workstream B item 4: card/button/icon style tokens — same lifecycle,
  // same mechanism, no exceptions.
  'cardStyle', 'ctaStyle', 'iconStyle',
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
        heroLayout: source?.heroLayout,
        footerConfig: source?.footerConfig ?? undefined,
        cardStyle: source?.cardStyle,
        ctaStyle: source?.ctaStyle,
        iconStyle: source?.iconStyle,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });
    await this.logAudit(ctx, 'duplicate', theme.id, { before: source, after: theme });
    return theme;
  }

  /** Saving token edits ALWAYS lands in draft — it never touches the live
   * site by itself anymore (Phase 3 safety fix). A separate, explicit
   * `publish(themeId)` call is required to make edited tokens visible to
   * public visitors. If this is the tenant's first-ever edit (no
   * lastPublishedSnapshot yet), the pre-edit token values are captured as
   * that snapshot so "revert to last published" has something real to
   * revert to, and the public resolver has something to keep serving while
   * the draft is being worked on. */
  async updateTheme(ctx: ActorCtx, themeId: string, dto: any) {
    const existing = await this.mustOwnTheme(ctx.tenantId, themeId);
    const data: any = { ...pickTokens(dto), updatedBy: ctx.userId, status: 'draft' as const };
    if (!existing.lastPublishedSnapshot) {
      data.lastPublishedSnapshot = pickTokens(existing);
      data.lastPublishedAt = existing.updatedAt;
    }
    const updated = await this.prisma.tenantTheme.update({ where: { id: themeId }, data });
    await this.logAudit(ctx, 'update', themeId, { before: existing, after: updated });
    return updated;
  }

  /** Explicit "Publish theme" action — flips the current draft token values
   * live for every visitor and refreshes the one-shot "last known good"
   * snapshot used by revert(). Separate from updateTheme on purpose: saving
   * edits and going live are two different actions now, matching the
   * publishing-workflow discipline Page Builder already has. */
  async publish(ctx: ActorCtx, themeId: string) {
    const existing = await this.mustOwnTheme(ctx.tenantId, themeId);
    const updated = await this.prisma.tenantTheme.update({
      where: { id: themeId },
      data: {
        status: 'published',
        lastPublishedSnapshot: pickTokens(existing),
        lastPublishedAt: new Date(),
        updatedBy: ctx.userId,
      },
    });
    await this.logAudit(ctx, 'publish', themeId, { before: existing, after: updated });
    return updated;
  }

  /** One-click revert-to-last-published — restores the token fields from
   * `lastPublishedSnapshot` (NOT full version history, just this one
   * snapshot, per the explicit descope). Immediately re-published, since a
   * revert is meant to undo a bad live change, not create yet another
   * draft to publish separately. */
  async revertToLastPublished(ctx: ActorCtx, themeId: string) {
    const existing = await this.mustOwnTheme(ctx.tenantId, themeId);
    if (!existing.lastPublishedSnapshot) {
      throw new NotFoundException('No published snapshot to revert to yet');
    }
    const snapshot = existing.lastPublishedSnapshot as Record<string, any>;
    const updated = await this.prisma.tenantTheme.update({
      where: { id: themeId },
      data: { ...snapshot, status: 'published', updatedBy: ctx.userId },
    });
    await this.logAudit(ctx, 'revert', themeId, { before: existing, after: updated });
    return updated;
  }

  /** Signed, time-limited admin preview link for this theme's current
   * (possibly draft) tokens — see getActiveTheme's preview-token check. */
  async createPreviewToken(ctx: ActorCtx, themeId: string) {
    await this.mustOwnTheme(ctx.tenantId, themeId);
    const expiresAt = Date.now() + PREVIEW_TTL_MS;
    return { token: signPreviewToken(themeId, expiresAt), expiresAt };
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
   * pipeline (apps/tenant-website/lib/site-theme.ts). No auth on the route
   * itself, but the draft-safety rule is enforced here:
   *   - No previewToken (the normal public visitor path): only ever returns
   *     `published` token values. If the active theme is currently a draft
   *     (unpublished edits in progress), this falls back to its
   *     `lastPublishedSnapshot` instead — so a tenant mid-edit never
   *     accidentally ships half-finished tokens to real visitors, and never
   *     regresses to "no theme" either.
   *   - A valid signed previewToken (admin-only preview link, see
   *     createPreviewToken) bypasses the published-only filter and returns
   *     the theme's current (draft) values, checked BEFORE falling through
   *     to the published-only resolution below. */
  async getActiveTheme(subdomain: string, previewToken?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain }, select: { id: true } });
    if (!tenant) return null;
    const theme = await this.prisma.tenantTheme.findFirst({ where: { tenantId: tenant.id, isActive: true } });
    if (!theme) return null;

    if (previewToken && verifyPreviewToken(previewToken, theme.id)) {
      return theme; // admin preview — current values, draft or published
    }

    if (theme.status === 'published') return theme;

    // Draft in progress on the active theme — serve the last known good
    // published snapshot instead of the in-progress edit, so the live site
    // doesn't change until "Publish theme" is pressed.
    if (theme.lastPublishedSnapshot) {
      return { ...theme, ...(theme.lastPublishedSnapshot as Record<string, any>), status: 'published' as const };
    }
    // Never published before — nothing safe to show yet; layered resolution
    // in site-theme.ts falls back further (legacy branding/template).
    return null;
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
