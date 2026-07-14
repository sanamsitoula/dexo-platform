import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService, AuditService } from '@dexo/shared';

interface ActorCtx {
  tenantId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SiteNavItem {
  id: string;
  label: string;
  order: number;
  /** 'page' -> targetValue is a Page.slug; 'route' -> a built-in path like
   * /shop or /blog; 'external' -> a full URL. */
  kind: 'page' | 'route' | 'external';
  targetValue: string;
  enabled: boolean;
}

function randomId(): string {
  return `nav_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Site Navigation — Workstream A. Unlike Menu Builder/Page Builder (which
 * have real ordering AND nesting requirements), nav items are a small flat
 * list, so this deliberately follows the lighter-weight pattern already
 * established for settings.branding.navFlags: stored as JSON on
 * Tenant.settings.navigation.items rather than a new Prisma model/migration.
 * Tenant isolation, audit logging (same AuditService/AuditLog every other
 * builder module uses) and a public read path are still first-class, same
 * as every other tenant-owned module.
 */
@Injectable()
export class SiteNavigationService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async getTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, settings: true } });
    if (!tenant) throw new BadRequestException('Tenant not found');
    return tenant;
  }

  private readItems(settings: any): SiteNavItem[] {
    const items = settings?.navigation?.items;
    return Array.isArray(items) ? items : [];
  }

  private async writeItems(tenantId: string, settings: any, items: SiteNavItem[]) {
    const nextSettings = {
      ...(settings || {}),
      navigation: { ...(settings?.navigation || {}), items },
    };
    await this.prisma.tenant.update({ where: { id: tenantId }, data: { settings: nextSettings } });
    return items;
  }

  /**
   * Auto-populates nav items the first time they're requested for a tenant
   * that has none yet — About/Services/Contact (already seeded per-tenant,
   * see provisioning.service.ts), Blog (only if >=1 published post) and Shop
   * (only if the tenant is on an ecommerce domain). Idempotent: only runs
   * when the stored list is empty, matching ThemeBuilderService's
   * ensureSeedTheme / lazy-backfill convention.
   */
  private async ensureDefaults(tenantId: string, settings: any): Promise<SiteNavItem[]> {
    const existing = this.readItems(settings);
    if (existing.length > 0) return existing;

    const items = await this.buildDefaultItems(tenantId);
    if (items.length === 0) return items;
    await this.writeItems(tenantId, settings, items);
    return items;
  }

  async buildDefaultItems(tenantId: string): Promise<SiteNavItem[]> {
    const [aboutPage, servicesPage, contactPage, publishedPostCount, tenantDomain] = await Promise.all([
      this.prisma.page.findFirst({ where: { tenantId, slug: 'about' }, select: { id: true } }),
      this.prisma.page.findFirst({ where: { tenantId, slug: 'services' }, select: { id: true } }),
      this.prisma.page.findFirst({ where: { tenantId, slug: 'contact' }, select: { id: true } }),
      this.prisma.blog.count({ where: { tenantId, status: 'published' } }).catch(() => 0),
      this.prisma.tenantDomain.findFirst({ where: { tenantId }, include: { domain: true } }).catch(() => null),
    ]);
    const domainCode = (tenantDomain as any)?.domain?.code as string | undefined;
    const isEcommerce = isEcommerceDomainCode(domainCode);

    let order = 0;
    const items: SiteNavItem[] = [];
    if (aboutPage) items.push({ id: randomId(), label: 'About', order: order++, kind: 'page', targetValue: 'about', enabled: true });
    if (servicesPage) items.push({ id: randomId(), label: 'Services', order: order++, kind: 'page', targetValue: 'services', enabled: true });
    if (isEcommerce) items.push({ id: randomId(), label: 'Shop', order: order++, kind: 'route', targetValue: '/shop', enabled: true });
    if ((publishedPostCount as number) > 0) items.push({ id: randomId(), label: 'Blog', order: order++, kind: 'route', targetValue: '/blog', enabled: true });
    items.push({ id: randomId(), label: 'Book', order: order++, kind: 'route', targetValue: '/book', enabled: true });
    if (contactPage) items.push({ id: randomId(), label: 'Contact', order: order++, kind: 'page', targetValue: 'contact', enabled: true });
    return items;
  }

  async listItems(tenantId: string): Promise<SiteNavItem[]> {
    const tenant = await this.getTenant(tenantId);
    const items = await this.ensureDefaults(tenantId, tenant.settings);
    return [...items].sort((a, b) => a.order - b.order);
  }

  async createItem(ctx: ActorCtx, dto: Partial<SiteNavItem>) {
    if (!dto.label || !dto.targetValue || !dto.kind) {
      throw new BadRequestException('label, kind and targetValue are required');
    }
    const tenant = await this.getTenant(ctx.tenantId);
    const items = await this.ensureDefaults(ctx.tenantId, tenant.settings);
    const maxOrder = items.reduce((m, i) => Math.max(m, i.order), -1);
    const item: SiteNavItem = {
      id: randomId(),
      label: dto.label,
      kind: dto.kind,
      targetValue: dto.targetValue,
      enabled: dto.enabled ?? true,
      order: maxOrder + 1,
    };
    const next = [...items, item];
    await this.writeItems(ctx.tenantId, tenant.settings, next);
    await this.logAudit(ctx, 'create', item.id, { before: null, after: item });
    return item;
  }

  async updateItem(ctx: ActorCtx, itemId: string, dto: Partial<SiteNavItem>) {
    const tenant = await this.getTenant(ctx.tenantId);
    const items = await this.ensureDefaults(ctx.tenantId, tenant.settings);
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new BadRequestException('Nav item not found');
    const before = items[idx];
    const after: SiteNavItem = {
      ...before,
      label: dto.label ?? before.label,
      kind: dto.kind ?? before.kind,
      targetValue: dto.targetValue ?? before.targetValue,
      enabled: dto.enabled ?? before.enabled,
      order: dto.order ?? before.order,
    };
    const next = [...items];
    next[idx] = after;
    await this.writeItems(ctx.tenantId, tenant.settings, next);
    await this.logAudit(ctx, 'update', itemId, { before, after });
    return after;
  }

  async deleteItem(ctx: ActorCtx, itemId: string) {
    const tenant = await this.getTenant(ctx.tenantId);
    const items = await this.ensureDefaults(ctx.tenantId, tenant.settings);
    const before = items.find((i) => i.id === itemId);
    const next = items.filter((i) => i.id !== itemId);
    await this.writeItems(ctx.tenantId, tenant.settings, next);
    await this.logAudit(ctx, 'delete', itemId, { before: before ?? null, after: null });
    return { message: 'Nav item deleted' };
  }

  /** Bulk reorder (drag-and-drop canvas) — orderedIds must be exactly the
   * tenant's current nav item IDs, same contract as Page Builder's
   * reorder-all for sections. */
  async reorderAll(ctx: ActorCtx, orderedIds: string[]) {
    const tenant = await this.getTenant(ctx.tenantId);
    const items = await this.ensureDefaults(ctx.tenantId, tenant.settings);
    if (orderedIds.length !== items.length || !orderedIds.every((id) => items.some((i) => i.id === id))) {
      throw new BadRequestException('orderedIds must be exactly the current nav item IDs');
    }
    const before = items;
    const byId = new Map(items.map((i) => [i.id, i]));
    const after = orderedIds.map((id, order) => ({ ...byId.get(id)!, order }));
    await this.writeItems(ctx.tenantId, tenant.settings, after);
    await this.logAudit(ctx, 'reorder', 'all', { before, after });
    return after;
  }

  // ------------------------------------------------------------- Public

  /** Enabled nav items, sorted, resolved to real hrefs, for the public site
   * (SiteNav.tsx). No auth. */
  async getPublicNav(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain }, select: { id: true, settings: true } });
    if (!tenant) return [];
    const items = await this.ensureDefaults(tenant.id, tenant.settings);
    return items
      .filter((i) => i.enabled)
      .sort((a, b) => a.order - b.order)
      .map((i) => ({
        id: i.id,
        label: i.label,
        href: i.kind === 'page' ? `/${i.targetValue}` : i.kind === 'route' ? i.targetValue : i.targetValue,
        external: i.kind === 'external',
      }));
  }

  private async logAudit(ctx: ActorCtx, action: string, resourceId: string, diff: { before: any; after: any }) {
    await this.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: `site_navigation.${action}`,
      resourceType: 'site_navigation',
      resourceId,
      changes: diff,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }
}

/** Mirrors ProvisioningService.isEcommerceDomain / the frontend's
 * lib/domainType.ts isEcommerceDomainCode — kept as a local copy since no
 * shared cross-package export exists for this substring check. */
function isEcommerceDomainCode(domainCode?: string | null): boolean {
  const d = (domainCode || '').toLowerCase();
  return d.includes('ecommerce') || d.includes('e-commerce') || d.includes('retail') || d.includes('shop');
}
