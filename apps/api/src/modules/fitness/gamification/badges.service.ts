import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class BadgesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { category?: string; active?: boolean }) {
    const where: any = { tenantId };
    if (params?.category) where.category = params.category;
    if (params?.active !== undefined) where.isActive = params.active;
    return this.prisma.badge.findMany({
      where,
      orderBy: [{ category: 'asc' }, { points: 'desc' }],
      include: { _count: { select: { earnedBy: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const b = await this.prisma.badge.findFirst({
      where: { id, tenantId },
      include: { earnedBy: { take: 20, orderBy: { earnedAt: 'desc' }, include: { member: { include: { user: { select: { firstName: true, lastName: true } } } } } } },
    });
    if (!b) throw new NotFoundException('Badge not found');
    return b;
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.badge.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        category: dto.category ?? 'MILESTONE',
        criteria: dto.criteria ?? {},
        points: dto.points ?? 0,
        rewardNpr: dto.rewardNpr,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.badge.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.badge.update({ where: { id }, data: { isActive: false } });
  }
}
