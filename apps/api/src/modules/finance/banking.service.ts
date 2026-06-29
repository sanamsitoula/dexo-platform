import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class BankingService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.bankAccount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { isDefault: 'desc' },
      include: {
        _count: { select: { paymentsReceivedAsSource: true, paymentsMadeAsSource: true } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, tenantId },
      include: {
        paymentsReceivedAsSource: { orderBy: { paymentDate: 'desc' }, take: 20 },
        paymentsMadeAsSource: { orderBy: { paymentDate: 'desc' }, take: 20 },
      },
    });
    if (!account) throw new NotFoundException('Bank account not found');
    return account;
  }

  async create(tenantId: string, dto: any) {
    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.bankAccount.create({
      data: {
        tenantId,
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
        branchName: dto.branchName,
        accountType: dto.accountType || 'SAVINGS',
        currency: dto.currency || 'NPR',
        isDefault: dto.isDefault || false,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    if (dto.isDefault) {
      await this.prisma.bankAccount.updateMany({
        where: { tenantId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        bankName: dto.bankName,
        branchName: dto.branchName,
        accountType: dto.accountType,
        currency: dto.currency,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
    });
  }

  async getStatement(tenantId: string, id: string, startDate?: string, endDate?: string) {
    const account = await this.findOne(tenantId, id);

    const paymentsIn = await this.prisma.paymentReceived.findMany({
      where: {
        tenantId,
        bankAccountId: id,
        ...(startDate && endDate
          ? { paymentDate: { gte: new Date(startDate), lte: new Date(endDate) } }
          : {}),
      },
      orderBy: { paymentDate: 'asc' },
      select: { id: true, paymentNo: true, paymentDate: true, amount: true, paymentMethod: true, referenceNo: true, notes: true },
    });

    const paymentsOut = await this.prisma.paymentMade.findMany({
      where: {
        tenantId,
        bankAccountId: id,
        ...(startDate && endDate
          ? { paymentDate: { gte: new Date(startDate), lte: new Date(endDate) } }
          : {}),
      },
      orderBy: { paymentDate: 'asc' },
      select: { id: true, paymentNo: true, paymentDate: true, amount: true, paymentMethod: true, referenceNo: true, notes: true },
    });

    return { account, paymentsIn, paymentsOut };
  }
}
