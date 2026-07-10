import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { status?: string; branchId?: string; search?: string }) {
    const where: any = { tenantId };
    if (params?.status) where.status = params.status;
    if (params?.branchId) where.branchId = params.branchId;
    if (params?.search) {
      where.OR = [
        { membershipType: { contains: params.search, mode: 'insensitive' } },
        { user: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: params.search, mode: 'insensitive' } } },
        { user: { email: { contains: params.search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.member.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, phone: true } },
        branch: { select: { id: true, code: true, name: true } },
        trainer: { select: { id: true, name: true, specialization: true } },
        memberships: { where: { status: 'ACTIVE' }, take: 1, orderBy: { startDate: 'desc' } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, phone: true } },
        branch: true,
        trainer: true,
        memberships: { orderBy: { startDate: 'desc' }, include: { plan: true } },
        bodyAssessments: { orderBy: { assessedAt: 'desc' }, take: 10 },
        workoutPlans: { where: { status: 'ACTIVE' }, take: 5 },
        dietPlans: { where: { status: 'ACTIVE' }, take: 5 },
        customerBadges: { include: { badge: true } },
        _count: { select: { attendances: true, workoutLogs: true, foodLogs: true } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async findByUserId(tenantId: string, userId: string) {
    return this.prisma.member.findFirst({
      where: { tenantId, userId },
      include: {
        branch: true,
        trainer: true,
        memberships: { where: { status: 'ACTIVE' }, take: 1, orderBy: { startDate: 'desc' }, include: { plan: true } },
      },
    });
  }

  async create(tenantId: string, dto: any) {
    if (!dto.userId) throw new BadRequestException('userId is required');
    const existing = await this.prisma.member.findFirst({ where: { tenantId, userId: dto.userId } });
    if (existing) throw new BadRequestException('User is already a member');
    return this.prisma.member.create({
      data: {
        tenantId,
        userId: dto.userId,
        branchId: dto.branchId,
        membershipType: dto.membershipType ?? 'TRIAL',
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status ?? 'PENDING_VERIFICATION',
        height: dto.height,
        weight: dto.weight,
        goals: dto.goals,
        medicalConditions: dto.medicalConditions,
        trainerId: dto.trainerId,
        isVerified: false,
      },
    });
  }

  async autoCreateOnRegister(tenantId: string, userId: string) {
    const existing = await this.prisma.member.findFirst({ where: { tenantId, userId } });
    if (existing) return existing;
    return this.prisma.member.create({
      data: {
        tenantId,
        userId,
        membershipType: 'TRIAL',
        startDate: new Date(),
        status: 'PENDING_VERIFICATION' as any,
        isVerified: false,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.member.update({
      where: { id },
      data: {
        branchId: dto.branchId,
        membershipType: dto.membershipType,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: dto.status,
        height: dto.height,
        weight: dto.weight,
        goals: dto.goals,
        medicalConditions: dto.medicalConditions,
        trainerId: dto.trainerId,
      },
    });
  }

  /** Self-service profile update for the logged-in member (onboarding). */
  async updateByUserId(tenantId: string, userId: string, dto: any) {
    const member = await this.prisma.member.findFirst({ where: { tenantId, userId } });
    if (!member) throw new NotFoundException('Member profile not found');
    return this.prisma.member.update({
      where: { id: member.id },
      data: {
        height: dto.height !== undefined ? dto.height : undefined,
        weight: dto.weight !== undefined ? dto.weight : undefined,
        goals: dto.goals !== undefined ? dto.goals : undefined,
        medicalConditions: dto.medicalConditions !== undefined ? dto.medicalConditions : undefined,
      },
    });
  }

  async verify(tenantId: string, id: string, verifierId: string) {
    await this.findOne(tenantId, id);
    return this.prisma.member.update({
      where: { id },
      data: { isVerified: true, verifiedBy: verifierId, verifiedAt: new Date(), status: 'ACTIVE' },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.member.delete({ where: { id } });
  }

  async getStats(tenantId: string, branchId?: string) {
    const where: any = { tenantId };
    if (branchId) where.branchId = branchId;
    const [total, active, pending, frozen, expired] = await Promise.all([
      this.prisma.member.count({ where }),
      this.prisma.member.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.member.count({ where: { ...where, status: 'PENDING_VERIFICATION' as any } }),
      this.prisma.member.count({ where: { ...where, status: 'FROZEN' } }),
      this.prisma.member.count({ where: { ...where, status: 'EXPIRED' } }),
    ]);
    return { total, active, pending, frozen, expired };
  }
}
