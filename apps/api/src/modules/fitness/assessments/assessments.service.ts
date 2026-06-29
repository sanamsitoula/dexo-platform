import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class AssessmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { memberId?: string; assessmentType?: string; from?: string; to?: string }) {
    const where: any = { tenantId };
    if (params?.memberId) where.memberId = params.memberId;
    if (params?.assessmentType) where.assessmentType = params.assessmentType;
    if (params?.from || params?.to) {
      where.assessedAt = {};
      if (params.from) where.assessedAt.gte = new Date(params.from);
      if (params.to) where.assessedAt.lte = new Date(params.to);
    }
    return this.prisma.bodyAssessment.findMany({
      where,
      orderBy: { assessedAt: 'desc' },
      include: { member: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const a = await this.prisma.bodyAssessment.findFirst({
      where: { id, tenantId },
      include: { member: { include: { user: true } } },
    });
    if (!a) throw new NotFoundException('Assessment not found');
    return a;
  }

  async create(tenantId: string, dto: any) {
    if (!dto.memberId) throw new Error('memberId is required');
    const bmi = dto.weight && dto.height ? this.computeBmi(dto.weight, dto.height) : dto.bmi;
    return this.prisma.bodyAssessment.create({
      data: {
        tenantId,
        memberId: dto.memberId,
        assessmentType: dto.assessmentType ?? 'PERIODIC',
        weight: dto.weight,
        height: dto.height,
        bmi,
        bodyFatPercent: dto.bodyFatPercent,
        muscleMass: dto.muscleMass,
        waist: dto.waist,
        chest: dto.chest,
        hips: dto.hips,
        arms: dto.arms,
        thighs: dto.thighs,
        calves: dto.calves,
        restingHeartRate: dto.restingHeartRate,
        bloodPressure: dto.bloodPressure,
        bloodSugar: dto.bloodSugar,
        cholesterol: dto.cholesterol,
        healthConditions: dto.healthConditions,
        injuries: dto.injuries,
        medications: dto.medications,
        fitnessLevel: dto.fitnessLevel,
        goalType: dto.goalType,
        targetWeight: dto.targetWeight,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        trainerNotes: dto.trainerNotes,
        assessedBy: dto.assessedBy ?? null,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    if (dto.weight && dto.height && !dto.bmi) dto.bmi = this.computeBmi(dto.weight, dto.height);
    return this.prisma.bodyAssessment.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.bodyAssessment.delete({ where: { id } });
  }

  async getProgress(tenantId: string, memberId: string) {
    return this.prisma.bodyAssessment.findMany({
      where: { tenantId, memberId },
      orderBy: { assessedAt: 'asc' },
      select: { id: true, assessedAt: true, weight: true, bmi: true, bodyFatPercent: true, waist: true, chest: true, hips: true, assessmentType: true },
    });
  }

  private computeBmi(weight: number, height: number): number {
    const h = height / 100;
    return Math.round((weight / (h * h)) * 100) / 100;
  }
}
