import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class MembershipPlansService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { active?: boolean; type?: string }) {
    const where: any = { tenantId };
    if (params?.active !== undefined) where.isActive = params.active;
    if (params?.type) where.type = params.type;
    return this.prisma.membershipPlan.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { priceNpr: 'asc' }],
    });
  }

  async findOne(tenantId: string, id: string) {
    const plan = await this.prisma.membershipPlan.findFirst({ where: { id, tenantId } });
    if (!plan) throw new NotFoundException('Membership plan not found');
    return plan;
  }

  async create(tenantId: string, dto: any) {
    const totalWithVat = this.computeTotalWithVat(dto.priceNpr, dto.vatPercent ?? 13);
    return this.prisma.membershipPlan.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        type: dto.type ?? 'MONTHLY',
        durationDays: dto.durationDays ?? 30,
        priceNpr: dto.priceNpr,
        vatPercent: dto.vatPercent ?? 13,
        totalWithVat,
        includesTrainer: dto.includesTrainer ?? false,
        includesClasses: dto.includesClasses ?? false,
        includesDietPlan: dto.includesDietPlan ?? false,
        includesLocker: dto.includesLocker ?? false,
        freezeAllowed: dto.freezeAllowed ?? true,
        maxFreezeDays: dto.maxFreezeDays ?? 30,
        accessHours: dto.accessHours,
        branchAccess: dto.branchAccess ?? 'single',
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    const data: any = { ...dto };
    if (dto.priceNpr !== undefined || dto.vatPercent !== undefined) {
      const current = await this.prisma.membershipPlan.findUnique({ where: { id } });
      const price = dto.priceNpr ?? Number(current?.priceNpr);
      const vat = dto.vatPercent ?? Number(current?.vatPercent);
      data.totalWithVat = this.computeTotalWithVat(price, vat);
    }
    return this.prisma.membershipPlan.update({ where: { id }, data });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.membershipPlan.update({ where: { id }, data: { isActive: false } });
  }

  private computeTotalWithVat(price: number | string, vat: number | string): number {
    const p = typeof price === 'string' ? parseFloat(price) : price;
    const v = typeof vat === 'string' ? parseFloat(vat) : vat;
    return Math.round(p * (1 + v / 100) * 100) / 100;
  }
}
