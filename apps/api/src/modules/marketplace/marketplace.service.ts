import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { CreateMarketplaceItemDto, UpdateMarketplaceItemDto } from './marketplace.dto';

export interface ListQuery {
  type?: string;
  category?: string;
  domainType?: string;
  search?: string;
  sort?: string; // popular | newest | rating
  status?: string; // admin only
  page?: number;
  limit?: number;
  includeUnpublished?: boolean;
}

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async list(q: ListQuery) {
    const page = Math.max(1, q.page || 1);
    const limit = Math.min(100, Math.max(1, q.limit || 12));

    const where: any = {};
    if (q.includeUnpublished) {
      if (q.status && q.status !== 'all') where.status = q.status;
    } else {
      where.status = 'published';
    }
    if (q.type && q.type !== 'all') where.type = q.type;
    if (q.category && q.category !== 'all') where.category = q.category;
    // domainType filter: items targeting the vertical + general (null) items.
    if (q.domainType && q.domainType !== 'all') {
      where.OR = [{ domainType: q.domainType }, { domainType: null }];
    }
    if (q.search) {
      const search = {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { description: { contains: q.search, mode: 'insensitive' } },
          { category: { contains: q.search, mode: 'insensitive' } },
        ],
      };
      where.AND = where.AND ? [...where.AND, search] : [search];
    }

    let orderBy: any = { installCount: 'desc' };
    if (q.sort === 'newest') orderBy = { createdAt: 'desc' };
    else if (q.sort === 'rating') orderBy = [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }];

    const [items, total] = await Promise.all([
      this.prisma.marketplaceItem.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.marketplaceItem.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getBySlug(slug: string, includeUnpublished = false) {
    const item = await this.prisma.marketplaceItem.findUnique({
      where: { slug },
      include: {
        reviews: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!item || (!includeUnpublished && item.status !== 'published')) {
      throw new NotFoundException('Marketplace item not found');
    }
    return item;
  }

  private async getItemOrThrow(id: string) {
    const item = await this.prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Marketplace item not found');
    return item;
  }

  // ---- Tenant actions ----

  async install(itemId: string, tenantId: string) {
    const item = await this.getItemOrThrow(itemId);
    if (item.status !== 'published') {
      throw new BadRequestException('Item is not available for install');
    }
    if (item.priceCents > 0) {
      throw new HttpException(
        {
          statusCode: 402,
          message:
            'This is a paid item — payment integration pending. Only free items can be installed right now.',
        },
        402,
      );
    }

    const existing = await this.prisma.marketplaceInstall.findUnique({
      where: { itemId_tenantId: { itemId, tenantId } },
    });
    const wasInstalled = existing?.status === 'installed';

    const install = await this.prisma.marketplaceInstall.upsert({
      where: { itemId_tenantId: { itemId, tenantId } },
      update: { status: 'installed', uninstalledAt: null, installedAt: new Date() },
      create: { itemId, tenantId, status: 'installed' },
    });

    if (!wasInstalled) {
      await this.prisma.marketplaceItem.update({
        where: { id: itemId },
        data: { installCount: { increment: 1 } },
      });
    }
    return { success: true, install };
  }

  async uninstall(itemId: string, tenantId: string) {
    const existing = await this.prisma.marketplaceInstall.findUnique({
      where: { itemId_tenantId: { itemId, tenantId } },
    });
    if (!existing || existing.status === 'uninstalled') {
      throw new NotFoundException('Item is not installed');
    }
    const install = await this.prisma.marketplaceInstall.update({
      where: { itemId_tenantId: { itemId, tenantId } },
      data: { status: 'uninstalled', uninstalledAt: new Date() },
    });
    await this.prisma.marketplaceItem.update({
      where: { id: itemId },
      data: { installCount: { decrement: 1 } },
    });
    return { success: true, install };
  }

  async listInstalled(tenantId: string) {
    const installs = await this.prisma.marketplaceInstall.findMany({
      where: { tenantId, status: { not: 'uninstalled' } },
      orderBy: { installedAt: 'desc' },
      include: { item: true },
    });
    return { installs, total: installs.length };
  }

  async review(itemId: string, tenantId: string | null, userId: string, rating: number, comment?: string) {
    const item = await this.getItemOrThrow(itemId);
    if (item.status !== 'published') {
      throw new BadRequestException('Cannot review an unpublished item');
    }

    const review = await this.prisma.marketplaceReview.upsert({
      where: { itemId_userId: { itemId, userId } },
      update: { rating, comment: comment ?? null, tenantId },
      create: { itemId, tenantId, userId, rating, comment: comment ?? null },
    });

    // Recompute rating aggregates.
    const agg = await this.prisma.marketplaceReview.aggregate({
      where: { itemId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await this.prisma.marketplaceItem.update({
      where: { id: itemId },
      data: {
        ratingAvg: Math.round((agg._avg.rating || 0) * 10) / 10,
        ratingCount: agg._count.rating,
      },
    });

    return { success: true, review };
  }

  // ---- Platform admin CRUD ----

  async create(dto: CreateMarketplaceItemDto) {
    const existing = await this.prisma.marketplaceItem.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Item with slug "${dto.slug}" already exists`);
    return this.prisma.marketplaceItem.create({
      data: {
        ...dto,
        screenshots: dto.screenshots ?? undefined,
        features: dto.features ?? undefined,
        config: dto.config ?? undefined,
      } as any,
    });
  }

  async update(id: string, dto: UpdateMarketplaceItemDto) {
    await this.getItemOrThrow(id);
    if (dto.slug) {
      const clash = await this.prisma.marketplaceItem.findUnique({ where: { slug: dto.slug } });
      if (clash && clash.id !== id) {
        throw new ConflictException(`Item with slug "${dto.slug}" already exists`);
      }
    }
    return this.prisma.marketplaceItem.update({ where: { id }, data: dto as any });
  }

  async remove(id: string) {
    await this.getItemOrThrow(id);
    await this.prisma.marketplaceItem.delete({ where: { id } });
    return { success: true };
  }

  async setStatus(id: string, status: 'draft' | 'published' | 'archived') {
    await this.getItemOrThrow(id);
    return this.prisma.marketplaceItem.update({ where: { id }, data: { status } });
  }
}
