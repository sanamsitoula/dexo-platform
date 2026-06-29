import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class FoodLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { memberId?: string; from?: string; to?: string; mealType?: string }) {
    const where: any = { tenantId };
    if (params?.memberId) where.memberId = params.memberId;
    if (params?.mealType) where.mealType = params.mealType;
    if (params?.from || params?.to) {
      where.logDate = {};
      if (params.from) where.logDate.gte = new Date(params.from);
      if (params.to) where.logDate.lte = new Date(params.to);
    }
    return this.prisma.foodLog.findMany({
      where,
      orderBy: { logDate: 'desc' },
      take: 200,
    });
  }

  async findOne(tenantId: string, id: string) {
    const f = await this.prisma.foodLog.findFirst({ where: { id, tenantId } });
    if (!f) throw new NotFoundException('Food log not found');
    return f;
  }

  async create(tenantId: string, dto: any) {
    if (!dto.memberId) throw new BadRequestException('memberId is required');
    return this.prisma.foodLog.create({
      data: {
        tenantId,
        memberId: dto.memberId,
        planId: dto.planId,
        logDate: dto.logDate ? new Date(dto.logDate) : new Date(),
        mealType: dto.mealType ?? 'BREAKFAST',
        foodItems: dto.foodItems,
        totalCalories: dto.totalCalories,
        totalProtein: dto.totalProtein,
        totalCarbs: dto.totalCarbs,
        totalFats: dto.totalFats,
        waterIntake: dto.waterIntake,
        notes: dto.notes,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.foodLog.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.foodLog.delete({ where: { id } });
  }

  async getDailySummary(tenantId: string, memberId: string, date?: string) {
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
    const logs = await this.prisma.foodLog.findMany({
      where: { tenantId, memberId, logDate: { gte: d, lt: next } },
    });
    const totals = logs.reduce(
      (acc, l) => ({
        calories: acc.calories + (l.totalCalories ?? 0),
        protein: acc.protein + Number(l.totalProtein ?? 0),
        carbs: acc.carbs + Number(l.totalCarbs ?? 0),
        fats: acc.fats + Number(l.totalFats ?? 0),
        water: acc.water + (l.waterIntake ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0 },
    );
    return { date: d, ...totals, meals: logs };
  }
}
