import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class WorkoutLogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { memberId?: string; planId?: string; from?: string; to?: string; status?: string }) {
    const where: any = { tenantId };
    if (params?.memberId) where.memberId = params.memberId;
    if (params?.planId) where.planId = params.planId;
    if (params?.status) where.status = params.status;
    if (params?.from || params?.to) {
      where.workoutDate = {};
      if (params.from) where.workoutDate.gte = new Date(params.from);
      if (params.to) where.workoutDate.lte = new Date(params.to);
    }
    return this.prisma.workoutLog.findMany({
      where,
      orderBy: { workoutDate: 'desc' },
      include: {
        member: { include: { user: { select: { firstName: true, lastName: true } } } },
        exerciseLogs: { include: { exercise: { select: { name: true } } } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const l = await this.prisma.workoutLog.findFirst({
      where: { id, tenantId },
      include: { exerciseLogs: { include: { exercise: true } }, member: true, plan: true },
    });
    if (!l) throw new NotFoundException('Workout log not found');
    return l;
  }

  async create(tenantId: string, dto: any) {
    if (!dto.memberId) throw new BadRequestException('memberId is required');
    return this.prisma.workoutLog.create({
      data: {
        tenantId,
        memberId: dto.memberId,
        planId: dto.planId,
        workoutDate: dto.workoutDate ? new Date(dto.workoutDate) : new Date(),
        status: dto.status ?? 'COMPLETED',
        duration: dto.duration,
        caloriesBurned: dto.caloriesBurned,
        notes: dto.notes,
        rating: dto.rating,
        exerciseLogs: dto.exerciseLogs
          ? { create: dto.exerciseLogs.map((e: any) => ({ exerciseId: e.exerciseId, setsCompleted: e.setsCompleted, repsCompleted: e.repsCompleted, weightUsed: e.weightUsed, duration: e.duration, notes: e.notes })) }
          : undefined,
      },
      include: { exerciseLogs: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.workoutLog.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.workoutLog.delete({ where: { id } });
  }

  async getStats(tenantId: string, memberId: string) {
    const logs = await this.prisma.workoutLog.findMany({
      where: { tenantId, memberId, status: 'COMPLETED' },
      orderBy: { workoutDate: 'desc' },
      select: { workoutDate: true, duration: true, caloriesBurned: true },
    });
    const totalWorkouts = logs.length;
    const totalMinutes = logs.reduce((s, l) => s + (l.duration ?? 0), 0);
    const totalCalories = logs.reduce((s, l) => s + (l.caloriesBurned ?? 0), 0);
    const thisWeek = logs.filter((l) => l.workoutDate.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const has = logs.some((l) => l.workoutDate.toDateString() === d.toDateString());
      if (has) streak++;
      else if (i > 0) break;
    }
    return { totalWorkouts, totalMinutes, totalCalories, thisWeek, streak };
  }
}
