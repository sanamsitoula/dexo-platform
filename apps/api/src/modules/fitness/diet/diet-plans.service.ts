import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class DietPlansService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { memberId?: string; status?: string }) {
    const where: any = { tenantId };
    if (params?.memberId) where.memberId = params.memberId;
    if (params?.status) where.status = params.status;
    return this.prisma.dietPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        member: { include: { user: { select: { firstName: true, lastName: true } } } },
        meals: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.dietPlan.findFirst({
      where: { id, tenantId },
      include: { meals: { orderBy: { sortOrder: 'asc' } }, member: true },
    });
    if (!p) throw new NotFoundException('Diet plan not found');
    return p;
  }

  async create(tenantId: string, dto: any) {
    if (!dto.memberId) throw new BadRequestException('memberId is required');
    return this.prisma.dietPlan.create({
      data: {
        tenantId,
        memberId: dto.memberId,
        name: dto.name,
        description: dto.description,
        dailyCalories: dto.dailyCalories ?? 2000,
        proteinGrams: dto.proteinGrams,
        carbsGrams: dto.carbsGrams,
        fatsGrams: dto.fatsGrams,
        fiberGrams: dto.fiberGrams,
        dietType: dto.dietType,
        allergies: dto.allergies,
        status: dto.status ?? 'DRAFT',
        isAiGenerated: dto.isAiGenerated ?? false,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        meals: dto.meals
          ? { create: dto.meals.map((m: any, i: number) => ({ tenantId, mealType: m.mealType, dayOfWeek: m.dayOfWeek, name: m.name, description: m.description, foodItems: m.foodItems, totalCalories: m.totalCalories, totalProtein: m.totalProtein, totalCarbs: m.totalCarbs, totalFats: m.totalFats, sortOrder: m.sortOrder ?? i })) }
          : undefined,
      },
      include: { meals: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.dietPlan.update({ where: { id }, data: dto });
  }

  async approve(tenantId: string, id: string, approverId: string) {
    await this.findOne(tenantId, id);
    return this.prisma.dietPlan.update({
      where: { id },
      data: { status: 'ACTIVE', approvedBy: approverId, approvedAt: new Date() },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.dietPlan.delete({ where: { id } });
  }

  async addMeal(tenantId: string, planId: string, dto: any) {
    return this.prisma.dietMeal.create({
      data: {
        tenantId,
        planId,
        mealType: dto.mealType,
        dayOfWeek: dto.dayOfWeek,
        name: dto.name,
        description: dto.description,
        foodItems: dto.foodItems,
        totalCalories: dto.totalCalories,
        totalProtein: dto.totalProtein,
        totalCarbs: dto.totalCarbs,
        totalFats: dto.totalFats,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async removeMeal(tenantId: string, mealId: string) {
    return this.prisma.dietMeal.delete({ where: { id: mealId } });
  }
}
