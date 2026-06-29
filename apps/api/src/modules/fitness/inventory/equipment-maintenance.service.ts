import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class EquipmentMaintenanceService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { equipmentId?: string; maintenanceType?: string }) {
    const where: any = { tenantId };
    if (params?.equipmentId) where.equipmentId = params.equipmentId;
    if (params?.maintenanceType) where.maintenanceType = params.maintenanceType;
    return this.prisma.equipmentMaintenance.findMany({
      where,
      orderBy: { performedAt: 'desc' },
      include: { equipment: { select: { id: true, name: true, category: true, branchId: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const m = await this.prisma.equipmentMaintenance.findFirst({
      where: { id, tenantId },
      include: { equipment: true },
    });
    if (!m) throw new NotFoundException('Maintenance log not found');
    return m;
  }

  async create(tenantId: string, dto: any) {
    if (!dto.equipmentId || !dto.description) throw new Error('equipmentId and description are required');
    const equipment = await this.prisma.equipment.findFirst({ where: { id: dto.equipmentId, tenantId } });
    if (!equipment) throw new NotFoundException('Equipment not found');
    const log = await this.prisma.equipmentMaintenance.create({
      data: {
        tenantId,
        equipmentId: dto.equipmentId,
        maintenanceType: dto.maintenanceType ?? 'ROUTINE',
        description: dto.description,
        cost: dto.cost,
        performedBy: dto.performedBy,
        nextService: dto.nextService ? new Date(dto.nextService) : null,
      },
    });
    await this.prisma.equipment.update({
      where: { id: dto.equipmentId },
      data: {
        lastMaintenance: new Date(),
        nextMaintenance: dto.nextService ? new Date(dto.nextService) : equipment.nextMaintenance,
        condition: dto.newCondition ?? equipment.condition,
      },
    });
    return log;
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.equipmentMaintenance.delete({ where: { id } });
  }
}
