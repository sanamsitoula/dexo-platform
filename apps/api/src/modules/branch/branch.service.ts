import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { status?: string; type?: string }) {
    const where: any = { tenantId };
    if (params?.status) where.status = params.status;
    if (params?.type) where.type = params.type;
    return this.prisma.branch.findMany({
      where,
      orderBy: [{ isHeadquarters: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { branchUsers: true, invoices: true, customers: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId },
      include: {
        branchUsers: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { invoices: true, paymentsReceived: true, customers: true, attendances: true } },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async findByCode(tenantId: string, code: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(tenantId: string, dto: any) {
    const existing = await this.prisma.branch.findFirst({
      where: { tenantId, code: dto.code },
    });
    if (existing) throw new BadRequestException('Branch code already exists');

    // If this is the first branch, mark it as headquarters
    const count = await this.prisma.branch.count({ where: { tenantId } });
    const isHeadquarters = count === 0 || dto.isHeadquarters === true;

    if (isHeadquarters) {
      // Unset other headquarters
      await this.prisma.branch.updateMany({
        where: { tenantId, isHeadquarters: true },
        data: { isHeadquarters: false },
      });
    }

    return this.prisma.branch.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        slug: dto.slug,
        type: dto.type || 'BRANCH',
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country || 'Nepal',
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        timezone: dto.timezone || 'Asia/Kathmandu',
        currency: dto.currency || 'NPR',
        managerId: dto.managerId,
        isHeadquarters,
        settings: dto.settings || {},
        operatingHours: dto.operatingHours,
        openedAt: dto.openedAt ? new Date(dto.openedAt) : new Date(),
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);

    if (dto.isHeadquarters === true) {
      await this.prisma.branch.updateMany({
        where: { tenantId, isHeadquarters: true, id: { not: id } },
        data: { isHeadquarters: false },
      });
    }

    return this.prisma.branch.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        type: dto.type,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        latitude: dto.latitude,
        longitude: dto.longitude,
        timezone: dto.timezone,
        currency: dto.currency,
        managerId: dto.managerId,
        isHeadquarters: dto.isHeadquarters,
        status: dto.status,
        settings: dto.settings,
        operatingHours: dto.operatingHours,
        closedAt: dto.closedAt ? new Date(dto.closedAt) : undefined,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const branch = await this.findOne(tenantId, id);
    if (branch.isHeadquarters) {
      throw new BadRequestException('Cannot delete headquarters branch');
    }
    await this.prisma.branch.delete({ where: { id } });
    return { message: 'Branch deleted successfully' };
  }

  // ===================== BRANCH-USER MANAGEMENT =====================

  async getBranchUsers(tenantId: string, branchId: string) {
    await this.findOne(tenantId, branchId);
    return this.prisma.branchUser.findMany({
      where: { branchId, isActive: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, phone: true } },
      },
    });
  }

  async assignUserToBranch(tenantId: string, branchId: string, dto: any) {
    await this.findOne(tenantId, branchId);
    return this.prisma.branchUser.upsert({
      where: {
        branchId_userId_role: {
          branchId,
          userId: dto.userId,
          role: dto.role,
        },
      },
      create: {
        branchId,
        userId: dto.userId,
        role: dto.role,
        isPrimary: dto.isPrimary || false,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        permissions: dto.permissions,
      },
      update: {
        role: dto.role,
        isPrimary: dto.isPrimary,
        isActive: true,
        endDate: null,
        permissions: dto.permissions,
      },
    });
  }

  async removeUserFromBranch(tenantId: string, branchId: string, userId: string) {
    await this.findOne(tenantId, branchId);
    await this.prisma.branchUser.updateMany({
      where: { branchId, userId },
      data: { isActive: false, endDate: new Date() },
    });
    return { message: 'User removed from branch' };
  }

  async getUserBranches(userId: string) {
    return this.prisma.branchUser.findMany({
      where: { userId, isActive: true },
      include: {
        branch: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            isHeadquarters: true,
            city: true,
            country: true,
          },
        },
      },
    });
  }

  // ===================== BRANCH SCHEDULES =====================

  async createSchedule(tenantId: string, branchId: string, dto: any) {
    await this.findOne(tenantId, branchId);
    return this.prisma.branchSchedule.create({
      data: {
        branchId,
        userId: dto.userId,
        className: dto.className,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        type: dto.type || 'CLASS',
        status: dto.status || 'scheduled',
        metadata: dto.metadata,
      },
    });
  }

  async getBranchSchedules(tenantId: string, branchId: string, params?: { startDate?: string; endDate?: string }) {
    await this.findOne(tenantId, branchId);
    const where: any = { branchId };
    if (params?.startDate && params?.endDate) {
      where.startTime = { gte: new Date(params.startDate), lte: new Date(params.endDate) };
    }
    return this.prisma.branchSchedule.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { branch: { select: { id: true, name: true, code: true } } },
    });
  }

  // ===================== BRANCH EXPENSES =====================

  async createExpense(tenantId: string, branchId: string, dto: any) {
    await this.findOne(tenantId, branchId);
    return this.prisma.branchExpense.create({
      data: {
        branchId,
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency || 'NPR',
        expenseDate: new Date(dto.expenseDate || new Date()),
        approvedBy: dto.approvedBy,
        receiptUrl: dto.receiptUrl,
        status: dto.status || 'pending',
      },
    });
  }

  async getBranchExpenses(tenantId: string, branchId: string, params?: { startDate?: string; endDate?: string }) {
    await this.findOne(tenantId, branchId);
    const where: any = { branchId };
    if (params?.startDate && params?.endDate) {
      where.expenseDate = { gte: new Date(params.startDate), lte: new Date(params.endDate) };
    }
    return this.prisma.branchExpense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
    });
  }
}
