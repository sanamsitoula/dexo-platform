import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class GroupClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { branchId?: string; classType?: string; dayOfWeek?: number; active?: boolean }) {
    const where: any = { tenantId };
    if (params?.branchId) where.branchId = params.branchId;
    if (params?.classType) where.classType = params.classType;
    if (params?.dayOfWeek !== undefined) where.dayOfWeek = params.dayOfWeek;
    if (params?.active !== undefined) where.isActive = params.active;
    return this.prisma.groupClass.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      include: {
        trainer: { select: { id: true, name: true, specialization: true } },
        branch: { select: { id: true, code: true, name: true } },
        _count: { select: { bookings: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const c = await this.prisma.groupClass.findFirst({
      where: { id, tenantId },
      include: { trainer: true, branch: true, bookings: { take: 20, orderBy: { bookingDate: 'desc' } } },
    });
    if (!c) throw new NotFoundException('Class not found');
    return c;
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.groupClass.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        classType: dto.classType ?? 'OTHER',
        trainerId: dto.trainerId,
        branchId: dto.branchId,
        dayOfWeek: dto.dayOfWeek,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        duration: dto.duration ?? 60,
        maxCapacity: dto.maxCapacity ?? 20,
        isFree: dto.isFree ?? true,
        priceNpr: dto.priceNpr,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    const data: any = { ...dto };
    if (dto.startTime) data.startTime = new Date(dto.startTime);
    if (dto.endTime) data.endTime = new Date(dto.endTime);
    return this.prisma.groupClass.update({ where: { id }, data });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.groupClass.update({ where: { id }, data: { isActive: false } });
  }
}
