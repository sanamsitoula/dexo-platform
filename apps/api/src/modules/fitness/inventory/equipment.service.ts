import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { branchId?: string; category?: string; condition?: string }) {
    const where: any = { tenantId };
    if (params?.branchId) where.branchId = params.branchId;
    if (params?.category) where.category = params.category;
    if (params?.condition) where.condition = params.condition;
    return this.prisma.equipment.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        branch: { select: { id: true, code: true, name: true } },
        _count: { select: { maintenanceLogs: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const e = await this.prisma.equipment.findFirst({
      where: { id, tenantId },
      include: { branch: true, maintenanceLogs: { orderBy: { performedAt: 'desc' }, take: 20 } },
    });
    if (!e) throw new NotFoundException('Equipment not found');
    return e;
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.equipment.create({
      data: {
        tenantId,
        branchId: dto.branchId,
        name: dto.name,
        category: dto.category ?? 'MACHINES',
        brand: dto.brand,
        model: dto.model,
        serialNumber: dto.serialNumber,
        quantity: dto.quantity ?? 1,
        condition: dto.condition ?? 'GOOD',
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        purchaseCost: dto.purchaseCost,
        warrantyUntil: dto.warrantyUntil ? new Date(dto.warrantyUntil) : null,
        nextMaintenance: dto.nextMaintenance ? new Date(dto.nextMaintenance) : null,
        notes: dto.notes,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.equipment.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.equipment.delete({ where: { id } });
  }

  async getStats(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    const [total, needsRepair, outOfService, dueSoon] = await Promise.all([
      this.prisma.equipment.count({ where }),
      this.prisma.equipment.count({ where: { ...where, condition: 'NEEDS_REPAIR' } }),
      this.prisma.equipment.count({ where: { ...where, condition: 'OUT_OF_SERVICE' } }),
      this.prisma.equipment.count({
        where: { ...where, nextMaintenance: { lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) } },
      }),
    ]);
    return { total, needsRepair, outOfService, dueSoon };
  }
}
