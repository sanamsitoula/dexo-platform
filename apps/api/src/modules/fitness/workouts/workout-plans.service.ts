import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class WorkoutPlansService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { memberId?: string; trainerId?: string; status?: string }) {
    const where: any = { tenantId };
    if (params?.memberId) where.memberId = params.memberId;
    if (params?.trainerId) where.trainerId = params.trainerId;
    if (params?.status) where.status = params.status;
    return this.prisma.workoutPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        member: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        trainer: { select: { id: true, name: true } },
        workoutDays: { include: { exercises: { orderBy: { sortOrder: 'asc' } } }, orderBy: { dayNumber: 'asc' } },
        _count: { select: { workoutLogs: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.workoutPlan.findFirst({
      where: { id, tenantId },
      include: {
        member: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        trainer: { select: { id: true, name: true } },
        workoutDays: { include: { exercises: { orderBy: { sortOrder: 'asc' } } }, orderBy: { dayNumber: 'asc' } },
      },
    });
    if (!p) throw new NotFoundException('Workout plan not found');
    return p;
  }

  async create(tenantId: string, dto: any) {
    if (!dto.memberId) throw new BadRequestException('memberId is required');
    return this.prisma.workoutPlan.create({
      data: {
        tenantId,
        memberId: dto.memberId,
        trainerId: dto.trainerId,
        name: dto.name,
        description: dto.description,
        goalType: dto.goalType,
        fitnessLevel: dto.fitnessLevel,
        durationWeeks: dto.durationWeeks ?? 4,
        daysPerWeek: dto.daysPerWeek ?? 4,
        status: dto.status ?? 'DRAFT',
        isAiGenerated: dto.isAiGenerated ?? false,
        aiPrompt: dto.aiPrompt,
        aiResponse: dto.aiResponse,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        workoutDays: dto.workoutDays
          ? { create: dto.workoutDays.map((d: any, i: number) => ({ tenantId, dayNumber: d.dayNumber ?? i + 1, dayName: d.dayName, muscleGroup: d.muscleGroup, isRestDay: d.isRestDay ?? false, notes: d.notes, exercises: { create: (d.exercises ?? []).map((e: any, j: number) => ({ tenantId, name: e.name, description: e.description, videoUrl: e.videoUrl, sets: e.sets, reps: e.reps, weight: e.weight, duration: e.duration, restSeconds: e.restSeconds ?? 60, sortOrder: e.sortOrder ?? j, equipment: e.equipment })) } })) }
          : undefined,
      },
      include: { workoutDays: { include: { exercises: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.workoutPlan.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        goalType: dto.goalType,
        fitnessLevel: dto.fitnessLevel,
        durationWeeks: dto.durationWeeks,
        daysPerWeek: dto.daysPerWeek,
        status: dto.status,
        trainerId: dto.trainerId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async approve(tenantId: string, id: string, approverId: string) {
    await this.findOne(tenantId, id);
    return this.prisma.workoutPlan.update({
      where: { id },
      data: { status: 'ACTIVE', approvedBy: approverId, approvedAt: new Date() },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.workoutPlan.delete({ where: { id } });
  }

  async addDay(tenantId: string, planId: string, dto: any) {
    const plan = await this.findOne(tenantId, planId);
    return this.prisma.workoutDay.create({
      data: {
        tenantId,
        planId,
        dayNumber: dto.dayNumber ?? plan.workoutDays.length + 1,
        dayName: dto.dayName,
        muscleGroup: dto.muscleGroup,
        isRestDay: dto.isRestDay ?? false,
        notes: dto.notes,
      },
    });
  }

  async addExercise(tenantId: string, dayId: string, dto: any) {
    return this.prisma.workoutExercise.create({
      data: {
        tenantId,
        dayId,
        name: dto.name,
        description: dto.description,
        videoUrl: dto.videoUrl,
        sets: dto.sets,
        reps: dto.reps,
        weight: dto.weight,
        duration: dto.duration,
        restSeconds: dto.restSeconds ?? 60,
        sortOrder: dto.sortOrder ?? 0,
        equipment: dto.equipment,
      },
    });
  }

  async removeDay(tenantId: string, dayId: string) {
    return this.prisma.workoutDay.delete({ where: { id: dayId } });
  }

  async removeExercise(tenantId: string, exerciseId: string) {
    return this.prisma.workoutExercise.delete({ where: { id: exerciseId } });
  }
}
