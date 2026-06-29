import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, type?: string) {
    const where: any = { tenantId, isActive: true };
    if (type) where.accountType = type;
    return this.prisma.chartOfAccount.findMany({
      where,
      orderBy: { accountCode: 'asc' },
      include: { _count: { select: { journalEntryLines: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, tenantId },
      include: {
        children: true,
        parent: true,
        _count: { select: { journalEntryLines: true } },
      },
    });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async create(tenantId: string, dto: any, userId: string) {
    const existing = await this.prisma.chartOfAccount.findFirst({
      where: { tenantId, accountCode: dto.accountCode },
    });
    if (existing) throw new BadRequestException('Account code already exists');

    return this.prisma.chartOfAccount.create({
      data: {
        tenantId,
        accountCode: dto.accountCode,
        accountName: dto.accountName,
        accountType: dto.accountType,
        parentId: dto.parentId || null,
        isControl: dto.isControl || false,
        currency: dto.currency || 'NPR',
        normalBalance: dto.normalBalance || (['ASSET', 'EXPENSE', 'COGS'].includes(dto.accountType) ? 'DEBIT' : 'CREDIT'),
        createdBy: userId,
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.chartOfAccount.update({
      where: { id },
      data: {
        accountName: dto.accountName,
        isControl: dto.isControl,
        isActive: dto.isActive,
        currency: dto.currency,
      },
    });
  }

  async getBalance(tenantId: string, accountId: string, startDate?: string, endDate?: string) {
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        tenantId,
        accountId,
        journalEntry: {
          isPosted: true,
          isReversed: false,
          ...(startDate && endDate
            ? { entryDate: { gte: new Date(startDate), lte: new Date(endDate) } }
            : {}),
        },
      },
    });

    let debitTotal = new Decimal(0);
    let creditTotal = new Decimal(0);
    for (const line of lines) {
      debitTotal = debitTotal.add(line.debitAmount);
      creditTotal = creditTotal.add(line.creditAmount);
    }

    const account = await this.findOne(tenantId, accountId);
    const balance = account.normalBalance === 'DEBIT'
      ? debitTotal.sub(creditTotal)
      : creditTotal.sub(debitTotal);

    return {
      accountId,
      accountCode: account.accountCode,
      accountName: account.accountName,
      normalBalance: account.normalBalance,
      debitTotal,
      creditTotal,
      balance,
    };
  }

  async getTrialBalance(tenantId: string, startDate?: string, endDate?: string) {
    const accounts = await this.findAll(tenantId);
    const balances = [];
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const account of accounts) {
      if (account.isControl) continue;
      const bal = await this.getBalance(tenantId, account.id, startDate, endDate);
      if (bal.debitTotal.isZero() && bal.creditTotal.isZero()) continue;
      balances.push(bal);
      totalDebit = totalDebit.add(bal.debitTotal);
      totalCredit = totalCredit.add(bal.creditTotal);
    }

    return { accounts: balances, totalDebit, totalCredit, isBalanced: totalDebit.equals(totalCredit) };
  }
}
