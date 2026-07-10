import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class TrainersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { branchId?: string; search?: string; active?: boolean }) {
    const where: any = { tenantId };
    if (params?.branchId) where.branchId = params.branchId;
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { specialization: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.trainer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, phone: true } },
        branch: { select: { id: true, code: true, name: true } },
        _count: { select: { members: true, groupClasses: true, workoutPlans: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const t = await this.prisma.trainer.findFirst({
      where: { id, tenantId },
      include: {
        user: true,
        branch: true,
        members: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        groupClasses: { where: { isActive: true } },
        _count: { select: { workoutPlans: true, members: true, trainerMessages: true } },
      },
    });
    if (!t) throw new NotFoundException('Trainer not found');
    return t;
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.trainer.create({
      data: {
        tenantId,
        userId: dto.userId,
        branchId: dto.branchId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        specialization: dto.specialization,
        certifications: dto.certifications,
        bio: dto.bio,
        hourlyRate: dto.hourlyRate,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.trainer.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.trainer.update({ where: { id }, data: { userId: null } });
  }

  async findByUserId(tenantId: string, userId: string) {
    return this.prisma.trainer.findFirst({ where: { tenantId, userId } });
  }

  /** Returns the members assigned to the currently logged-in trainer. */
  async findMyTrainees(tenantId: string, userId: string) {
    const trainer = await this.findByUserId(tenantId, userId);
    if (!trainer) throw new NotFoundException('No trainer profile for this user — sign up with signupAs=TRAINER');
    return this.prisma.member.findMany({
      where: { tenantId, trainerId: trainer.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
        memberships: {
          orderBy: { startDate: 'desc' },
          take: 1,
          select: { id: true, status: true, startDate: true, endDate: true, amountPaid: true, paymentMethod: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
