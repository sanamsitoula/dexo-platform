import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, AuditService } from '@dexo/shared';

interface ActorCtx {
  tenantId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

// Top-level menu slugs render as public-site paths (/<slug>). "admin" and
// "portal" are reserved by nginx's path-based routing to the tenant-admin
// and tenant-app upstreams — a menu claiming either would be shadowed and
// unreachable, so it's rejected at creation/rename time instead.
const RESERVED_MENU_SLUGS = new Set(['admin', 'portal', 'api']);

function assertNotReservedSlug(slug: string) {
  if (RESERVED_MENU_SLUGS.has(slug)) {
    throw new ForbiddenException(`"${slug}" is a reserved path and can't be used as a menu slug.`);
  }
}

/**
 * Tenant-scoped Menu Builder — named, ordered (optionally hierarchical)
 * collections of MenuItems rendered on the public site per a display
 * template (grid/table/carousel/list/accordion/map). Every read/write is
 * scoped by the caller's own tenantId (never a client-supplied one) and
 * every mutation is audited via the existing AuditLog model.
 */
@Injectable()
export class MenuBuilderService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ---------------------------------------------------------------- Menus

  async listMenus(tenantId: string) {
    return this.prisma.menu.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async getMenu(tenantId: string, menuId: string) {
    const menu = await this.prisma.menu.findFirst({
      where: { id: menuId, tenantId },
      include: {
        items: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!menu) throw new NotFoundException('Menu not found');
    return menu;
  }

  async createMenu(ctx: ActorCtx, dto: any) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    assertNotReservedSlug(slug);
    const menu = await this.prisma.menu.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        slug,
        type: dto.type || 'static',
        displayTemplate: dto.displayTemplate || 'grid',
        maxDepth: dto.maxDepth ?? 1,
        status: dto.status || 'draft',
        settings: dto.settings ?? undefined,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });
    await this.logAudit(ctx, 'create', 'menu', menu.id, { before: null, after: menu });
    return menu;
  }

  async updateMenu(ctx: ActorCtx, menuId: string, dto: any) {
    const existing = await this.mustOwnMenu(ctx.tenantId, menuId);
    const data: any = { updatedBy: ctx.userId };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) {
      data.slug = slugify(dto.slug);
      assertNotReservedSlug(data.slug);
    }
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.displayTemplate !== undefined) data.displayTemplate = dto.displayTemplate;
    if (dto.maxDepth !== undefined) data.maxDepth = dto.maxDepth;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.settings !== undefined) data.settings = dto.settings;

    const updated = await this.prisma.menu.update({ where: { id: menuId }, data });
    await this.logAudit(ctx, dto.status && dto.status !== existing.status
      ? (dto.status === 'published' ? 'publish' : 'unpublish')
      : 'update', 'menu', menuId, { before: existing, after: updated });
    return updated;
  }

  async deleteMenu(ctx: ActorCtx, menuId: string) {
    const existing = await this.mustOwnMenu(ctx.tenantId, menuId);
    await this.prisma.menu.delete({ where: { id: menuId } });
    await this.logAudit(ctx, 'delete', 'menu', menuId, { before: existing, after: null });
    return { message: 'Menu deleted' };
  }

  // ------------------------------------------------------------ MenuItems

  async listItems(tenantId: string, menuId: string) {
    await this.mustOwnMenu(tenantId, menuId);
    return this.prisma.menuItem.findMany({
      where: { tenantId, menuId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createItem(ctx: ActorCtx, menuId: string, dto: any) {
    const menu = await this.mustOwnMenu(ctx.tenantId, menuId);
    if (dto.parentId) await this.mustOwnItem(ctx.tenantId, dto.parentId);
    if (dto.parentId && menu.maxDepth <= 1) {
      throw new ForbiddenException(`This menu's max depth (${menu.maxDepth}) does not allow nested items`);
    }

    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.title);
    const maxOrder = await this.prisma.menuItem.aggregate({
      where: { tenantId: ctx.tenantId, menuId, parentId: dto.parentId ?? null },
      _max: { sortOrder: true },
    });

    const item = await this.prisma.menuItem.create({
      data: {
        tenantId: ctx.tenantId,
        menuId,
        parentId: dto.parentId ?? null,
        title: dto.title,
        slug,
        shortDescription: dto.shortDescription,
        description: dto.description,
        icon: dto.icon,
        images: dto.images ?? [],
        location: dto.location ?? undefined,
        linkUrl: dto.linkUrl,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        status: dto.status || 'draft',
        customFields: dto.customFields ?? undefined,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });
    await this.logAudit(ctx, 'create', 'menu_item', item.id, { before: null, after: item });
    return item;
  }

  async updateItem(ctx: ActorCtx, itemId: string, dto: any) {
    const existing = await this.mustOwnItem(ctx.tenantId, itemId);
    const data: any = { updatedBy: ctx.userId };
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = slugify(dto.slug);
    if (dto.shortDescription !== undefined) data.shortDescription = dto.shortDescription;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.linkUrl !== undefined) data.linkUrl = dto.linkUrl;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.customFields !== undefined) data.customFields = dto.customFields;
    if (dto.parentId !== undefined) {
      if (dto.parentId) await this.mustOwnItem(ctx.tenantId, dto.parentId);
      data.parentId = dto.parentId;
    }

    const updated = await this.prisma.menuItem.update({ where: { id: itemId }, data });
    await this.logAudit(ctx, dto.status && dto.status !== existing.status
      ? (dto.status === 'published' ? 'publish' : 'unpublish')
      : 'update', 'menu_item', itemId, { before: existing, after: updated });
    return updated;
  }

  async deleteItem(ctx: ActorCtx, itemId: string) {
    const existing = await this.mustOwnItem(ctx.tenantId, itemId);
    await this.prisma.menuItem.delete({ where: { id: itemId } });
    await this.logAudit(ctx, 'delete', 'menu_item', itemId, { before: existing, after: null });
    return { message: 'Menu item deleted' };
  }

  /** Swaps sortOrder with the item's immediate sibling in the given direction. */
  async reorderItem(ctx: ActorCtx, itemId: string, direction: 'up' | 'down') {
    const item = await this.mustOwnItem(ctx.tenantId, itemId);
    const sibling = await this.prisma.menuItem.findFirst({
      where: {
        tenantId: ctx.tenantId,
        menuId: item.menuId,
        parentId: item.parentId,
        sortOrder: direction === 'up' ? { lt: item.sortOrder } : { gt: item.sortOrder },
      },
      orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
    });
    if (!sibling) return item;

    await this.prisma.$transaction([
      this.prisma.menuItem.update({ where: { id: item.id }, data: { sortOrder: sibling.sortOrder } }),
      this.prisma.menuItem.update({ where: { id: sibling.id }, data: { sortOrder: item.sortOrder } }),
    ]);
    await this.logAudit(ctx, 'reorder', 'menu_item', itemId, {
      before: { sortOrder: item.sortOrder },
      after: { sortOrder: sibling.sortOrder },
    });
    return this.prisma.menuItem.findUnique({ where: { id: itemId } });
  }

  // ------------------------------------------------------------- Public

  /** Published menus + published items only, for the tenant's public site. No auth. */
  async getPublicMenus(subdomain: string, menuSlug?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain }, select: { id: true } });
    if (!tenant) return [];
    const menus = await this.prisma.menu.findMany({
      where: { tenantId: tenant.id, status: 'published', ...(menuSlug ? { slug: menuSlug } : {}) },
      include: {
        items: {
          where: { status: 'published' },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    // Nest children under their parent for accordion/hierarchical templates;
    // flat menus (maxDepth = 1) simply have no children to nest.
    return menus.map((m) => ({
      ...m,
      items: this.nestItems(m.items),
    }));
  }

  private nestItems(items: any[]): any[] {
    const byId = new Map(items.map((i) => [i.id, { ...i, children: [] as any[] }]));
    const roots: any[] = [];
    for (const item of byId.values()) {
      if (item.parentId && byId.has(item.parentId)) {
        byId.get(item.parentId)!.children.push(item);
      } else {
        roots.push(item);
      }
    }
    return roots;
  }

  // ------------------------------------------------------------- helpers

  private async mustOwnMenu(tenantId: string, menuId: string) {
    const menu = await this.prisma.menu.findFirst({ where: { id: menuId, tenantId } });
    if (!menu) throw new NotFoundException('Menu not found');
    return menu;
  }

  private async mustOwnItem(tenantId: string, itemId: string) {
    const item = await this.prisma.menuItem.findFirst({ where: { id: itemId, tenantId } });
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  private async logAudit(ctx: ActorCtx, action: string, resourceType: 'menu' | 'menu_item', resourceId: string, diff: { before: any; after: any }) {
    await this.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: `${resourceType}.${action}`,
      resourceType,
      resourceId,
      changes: diff,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }
}
