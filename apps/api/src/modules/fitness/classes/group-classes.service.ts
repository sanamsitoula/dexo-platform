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
    if (!dto?.name) throw new BadRequestException('name is required');
    const start = new Date(dto.startTime);
    if (isNaN(start.getTime())) throw new BadRequestException('startTime must be a valid date/time');
    const duration = Number(dto.duration) || 60;
    // endTime is derivable — most callers only know start + duration.
    const end = dto.endTime ? new Date(dto.endTime) : new Date(start.getTime() + duration * 60000);
    if (isNaN(end.getTime())) throw new BadRequestException('endTime must be a valid date/time');
    const CLASS_TYPES = ['YOGA', 'ZUMBA', 'CROSSFIT', 'SPINNING', 'PILATES', 'AEROBICS', 'BOXING', 'HIIT', 'STRENGTH', 'CARDIO', 'FUNCTIONAL', 'OTHER'];
    const classType = CLASS_TYPES.includes(String(dto.classType).toUpperCase()) ? String(dto.classType).toUpperCase() : 'OTHER';
    return this.prisma.groupClass.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        classType: classType as any,
        trainerId: dto.trainerId,
        branchId: dto.branchId,
        dayOfWeek: Number(dto.dayOfWeek) || 0,
        startTime: start,
        endTime: end,
        duration,
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
