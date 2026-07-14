import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, AuditService } from '@dexo/shared';
import { getComponentDef } from '@dexo/shared/src/page-builder';

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
    .slice(0, 80) || 'page';
}

// Top-level page slugs render as public-site paths (/<slug>). "admin" and
// "portal" are reserved by nginx's path-based routing to the tenant-admin
// and tenant-app upstreams — see infra/nginx/dexo.conf and the identical
// guard in menu-builder.service.ts (menus don't currently occupy top-level
// paths, but pages will, so this check is load-bearing here).
const RESERVED_PAGE_SLUGS = new Set(['admin', 'portal', 'api']);

function assertNotReservedSlug(slug: string) {
  if (RESERVED_PAGE_SLUGS.has(slug)) {
    throw new ForbiddenException(`"${slug}" is a reserved path and can't be used as a page slug.`);
  }
}

/**
 * Tenant-scoped Page Builder — pages made of an ordered list of
 * PageSections drawn from the fixed Component Library (packages/shared/src
 * /page-builder/components.ts). Every read/write is scoped by the caller's
 * own tenantId (never a client-supplied one), mirroring MenuBuilderService.
 */
@Injectable()
export class PageBuilderService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ---------------------------------------------------------------- Pages

  async listPages(tenantId: string) {
    return this.prisma.page.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { sections: true } } },
    });
  }

  async getPage(tenantId: string, pageId: string) {
    const page = await this.prisma.page.findFirst({
      where: { id: pageId, tenantId },
      include: { sections: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async createPage(ctx: ActorCtx, dto: any) {
    const slug = slugify(dto.slug || dto.name);
    assertNotReservedSlug(slug);
    if (dto.parentId) await this.mustOwnPage(ctx.tenantId, dto.parentId);

    const maxOrder = await this.prisma.page.aggregate({
      where: { tenantId: ctx.tenantId },
      _max: { sortOrder: true },
    });

    const page = await this.prisma.page.create({
      data: {
        tenantId: ctx.tenantId,
        parentId: dto.parentId ?? null,
        name: dto.name,
        slug,
        template: dto.template || 'default',
        status: 'draft', // every page always starts in draft — enters the workflow via the transition endpoints
        isHomepage: !!dto.isHomepage,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        ogImage: dto.ogImage,
        canonicalUrl: dto.canonicalUrl,
        robotsIndex: dto.robotsIndex ?? true,
        robotsFollow: dto.robotsFollow ?? true,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });
    await this.logAudit(ctx, 'create', 'page', page.id, { before: null, after: page });
    return page;
  }

  /** Content/settings edits only — status changes go through the explicit
   * workflow transition methods below, which enforce valid state moves.
   * (dto.status is intentionally ignored here, not silently accepted, so a
   * stray "status" in a settings-save payload can't skip the workflow.) */
  async updatePage(ctx: ActorCtx, pageId: string, dto: any) {
    const existing = await this.mustOwnPage(ctx.tenantId, pageId);
    const data: any = { updatedBy: ctx.userId };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) {
      data.slug = slugify(dto.slug);
      assertNotReservedSlug(data.slug);
    }
    if (dto.template !== undefined) data.template = dto.template;
    if (dto.isHomepage !== undefined) data.isHomepage = dto.isHomepage;
    if (dto.metaTitle !== undefined) data.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) data.metaDescription = dto.metaDescription;
    if (dto.ogImage !== undefined) data.ogImage = dto.ogImage;
    if (dto.canonicalUrl !== undefined) data.canonicalUrl = dto.canonicalUrl;
    if (dto.robotsIndex !== undefined) data.robotsIndex = dto.robotsIndex;
    if (dto.robotsFollow !== undefined) data.robotsFollow = dto.robotsFollow;
    if (dto.parentId !== undefined) {
      if (dto.parentId) await this.mustOwnPage(ctx.tenantId, dto.parentId);
      data.parentId = dto.parentId;
    }

    // Only one homepage per tenant — setting this one clears any other.
    if (data.isHomepage === true) {
      await this.prisma.page.updateMany({
        where: { tenantId: ctx.tenantId, isHomepage: true, NOT: { id: pageId } },
        data: { isHomepage: false },
      });
    }

    const updated = await this.prisma.page.update({ where: { id: pageId }, data });
    await this.logAudit(ctx, 'update', 'page', pageId, { before: existing, after: updated });
    return updated;
  }

  async deletePage(ctx: ActorCtx, pageId: string) {
    const existing = await this.mustOwnPage(ctx.tenantId, pageId);
    await this.prisma.page.delete({ where: { id: pageId } });
    await this.logAudit(ctx, 'delete', 'page', pageId, { before: existing, after: null });
    return { message: 'Page deleted' };
  }

  // ------------------------------------------- Publishing Workflow
  // Linear happy path: draft -> in_review -> approved -> published|scheduled
  // -> archived. Any state may revert to draft (a plain revert, not a
  // tracked/undoable rollback — no version history is kept, by design).
  // No cron job for scheduled publishing: getPublicPage() below checks
  // publishAt against "now" at read time instead, so a scheduled page goes
  // live exactly on read after its time passes, with zero extra infra.

  private static readonly ALLOWED_TRANSITIONS: Record<string, string[]> = {
    draft: ['in_review'],
    in_review: ['approved', 'draft'],
    approved: ['published', 'scheduled', 'draft'],
    scheduled: ['published', 'draft', 'archived'],
    published: ['archived', 'draft'],
    archived: ['draft'],
  };

  private async transition(ctx: ActorCtx, pageId: string, toStatus: string, extra: Record<string, any> = {}) {
    const existing = await this.mustOwnPage(ctx.tenantId, pageId);
    const allowed = PageBuilderService.ALLOWED_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(toStatus)) {
      throw new ForbiddenException(`Cannot move a page from "${existing.status}" to "${toStatus}". Allowed: ${allowed.join(', ') || '(none)'}`);
    }
    const updated = await this.prisma.page.update({
      where: { id: pageId },
      data: { status: toStatus as any, updatedBy: ctx.userId, ...extra },
    });
    await this.logAudit(ctx, `workflow.${toStatus}`, 'page', pageId, { before: existing, after: updated });
    return updated;
  }

  submitForReview(ctx: ActorCtx, pageId: string) {
    return this.transition(ctx, pageId, 'in_review');
  }

  approvePage(ctx: ActorCtx, pageId: string) {
    return this.transition(ctx, pageId, 'approved');
  }

  publishNow(ctx: ActorCtx, pageId: string) {
    return this.transition(ctx, pageId, 'published', { publishAt: null });
  }

  schedulePage(ctx: ActorCtx, pageId: string, publishAt: string) {
    const when = new Date(publishAt);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      throw new ForbiddenException('publishAt must be a valid future date/time');
    }
    return this.transition(ctx, pageId, 'scheduled', { publishAt: when });
  }

  archivePage(ctx: ActorCtx, pageId: string) {
    return this.transition(ctx, pageId, 'archived');
  }

  revertToDraft(ctx: ActorCtx, pageId: string) {
    return this.transition(ctx, pageId, 'draft', { publishAt: null });
  }

  // ----------------------------------------------------------- Sections

  async createSection(ctx: ActorCtx, pageId: string, dto: any) {
    await this.mustOwnPage(ctx.tenantId, pageId);
    const def = getComponentDef(dto.componentType);
    if (!def) throw new ForbiddenException(`Unknown component type "${dto.componentType}"`);

    const maxOrder = await this.prisma.pageSection.aggregate({
      where: { tenantId: ctx.tenantId, pageId },
      _max: { sortOrder: true },
    });

    const section = await this.prisma.pageSection.create({
      data: {
        tenantId: ctx.tenantId,
        pageId,
        componentType: dto.componentType,
        content: dto.content ?? def.defaultContent,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        status: dto.status || 'published',
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });
    await this.logAudit(ctx, 'create', 'page_section', section.id, { before: null, after: section });
    return section;
  }

  async updateSection(ctx: ActorCtx, sectionId: string, dto: any) {
    const existing = await this.mustOwnSection(ctx.tenantId, sectionId);
    const data: any = { updatedBy: ctx.userId };
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.status !== undefined) data.status = dto.status;

    const updated = await this.prisma.pageSection.update({ where: { id: sectionId }, data });
    await this.logAudit(ctx, 'update', 'page_section', sectionId, { before: existing, after: updated });
    return updated;
  }

  async deleteSection(ctx: ActorCtx, sectionId: string) {
    const existing = await this.mustOwnSection(ctx.tenantId, sectionId);
    await this.prisma.pageSection.delete({ where: { id: sectionId } });
    await this.logAudit(ctx, 'delete', 'page_section', sectionId, { before: existing, after: null });
    return { message: 'Section deleted' };
  }

  /** Swaps sortOrder with the section's immediate sibling on the same page. */
  async reorderSection(ctx: ActorCtx, sectionId: string, direction: 'up' | 'down') {
    const section = await this.mustOwnSection(ctx.tenantId, sectionId);
    const sibling = await this.prisma.pageSection.findFirst({
      where: {
        tenantId: ctx.tenantId,
        pageId: section.pageId,
        sortOrder: direction === 'up' ? { lt: section.sortOrder } : { gt: section.sortOrder },
      },
      orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
    });
    if (!sibling) return section;

    await this.prisma.$transaction([
      this.prisma.pageSection.update({ where: { id: section.id }, data: { sortOrder: sibling.sortOrder } }),
      this.prisma.pageSection.update({ where: { id: sibling.id }, data: { sortOrder: section.sortOrder } }),
    ]);
    await this.logAudit(ctx, 'reorder', 'page_section', sectionId, {
      before: { sortOrder: section.sortOrder },
      after: { sortOrder: sibling.sortOrder },
    });
    return this.prisma.pageSection.findUnique({ where: { id: sectionId } });
  }

  /** Bulk reorder for the drag-and-drop canvas — one call per drop instead
   * of N sequential up/down swaps. `orderedIds` must be exactly the page's
   * current section IDs (validated below), in the new desired order;
   * sortOrder is set to each id's array index. */
  async reorderSections(ctx: ActorCtx, pageId: string, orderedIds: string[]) {
    await this.mustOwnPage(ctx.tenantId, pageId);
    const existing = await this.prisma.pageSection.findMany({ where: { tenantId: ctx.tenantId, pageId }, select: { id: true } });
    const existingIds = new Set(existing.map((s) => s.id));

    if (orderedIds.length !== existing.length || !orderedIds.every((id) => existingIds.has(id))) {
      throw new ForbiddenException('orderedIds must be exactly this page\'s current sections, no more or fewer');
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) => this.prisma.pageSection.update({ where: { id }, data: { sortOrder: index } })),
    );
    await this.logAudit(ctx, 'reorder_all', 'page_section', pageId, { before: null, after: { orderedIds } });
    return this.prisma.pageSection.findMany({ where: { tenantId: ctx.tenantId, pageId }, orderBy: { sortOrder: 'asc' } });
  }

  // ------------------------------------------------------------- Public

  /** Published page + published sections only, for the tenant's public site.
   * No auth. Also serves — and flips to "published" — a "scheduled" page
   * whose publishAt has passed, so scheduling needs no cron job: the first
   * visitor after the scheduled time is what makes it go live. */
  async getPublicPage(subdomain: string, slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain }, select: { id: true } });
    if (!tenant) return null;

    const page = await this.prisma.page.findFirst({
      where: {
        tenantId: tenant.id,
        slug,
        OR: [
          { status: 'published' },
          { status: 'scheduled', publishAt: { lte: new Date() } },
        ],
      },
      include: {
        sections: {
          where: { status: 'published' },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!page) return null;

    if (page.status === 'scheduled') {
      await this.prisma.page.update({ where: { id: page.id }, data: { status: 'published', publishAt: null } });
      page.status = 'published' as any;
    }
    return page;
  }

  // ------------------------------------------------------------- helpers

  private async mustOwnPage(tenantId: string, pageId: string) {
    const page = await this.prisma.page.findFirst({ where: { id: pageId, tenantId } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  private async mustOwnSection(tenantId: string, sectionId: string) {
    const section = await this.prisma.pageSection.findFirst({ where: { id: sectionId, tenantId } });
    if (!section) throw new NotFoundException('Page section not found');
    return section;
  }

  private async logAudit(ctx: ActorCtx, action: string, resourceType: 'page' | 'page_section', resourceId: string, diff: { before: any; after: any }) {
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
