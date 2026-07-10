import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';
import { DEFAULT_CHART, normalBalanceFor } from './default-chart';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  /**
   * One-click accounting setup: seed the platform default Chart of Accounts (if
   * the tenant has none) plus an active fiscal year + monthly periods so journal
   * posting and reports work immediately. Idempotent & safe to call repeatedly.
   */
  async setupDefaults(tenantId: string, userId: string) {
    const existingCount = await this.prisma.chartOfAccount.count({ where: { tenantId } });
    let accountsCreated = 0;

    if (existingCount === 0) {
      const codeToId = new Map<string, string>();
      // Pass 1: parents (no parent link)
      for (const acc of DEFAULT_CHART.filter((a) => !a.parent)) {
        const c = await this.prisma.chartOfAccount.create({
          data: { tenantId, accountCode: acc.code, accountName: acc.name, accountType: acc.type, parentId: null, isControl: acc.isControl ?? false, currency: 'NPR', normalBalance: normalBalanceFor(acc.type), createdBy: userId },
        });
        codeToId.set(acc.code, c.id);
        accountsCreated++;
      }
      // Pass 2: children
      for (const acc of DEFAULT_CHART.filter((a) => a.parent)) {
        const c = await this.prisma.chartOfAccount.create({
          data: { tenantId, accountCode: acc.code, accountName: acc.name, accountType: acc.type, parentId: codeToId.get(acc.parent!) ?? null, isControl: acc.isControl ?? false, currency: 'NPR', normalBalance: normalBalanceFor(acc.type), createdBy: userId },
        });
        codeToId.set(acc.code, c.id);
        accountsCreated++;
      }
    }

    const fy = await this.ensureFiscalYear(tenantId);
    return { accountsCreated, totalAccounts: existingCount + accountsCreated, fiscalYear: fy };
  }

  /** Ensure there is an active fiscal year with monthly periods (Gregorian). */
  private async ensureFiscalYear(tenantId: string) {
    let fy = await this.prisma.fiscalYear.findFirst({ where: { tenantId, isActive: true } });
    if (!fy) {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      fy = await this.prisma.fiscalYear.create({
        data: { tenantId, name: `FY ${now.getFullYear()}`, startDate: start, endDate: end, isActive: true },
      });
      await this.createMonthlyPeriods(tenantId, fy.id, start, end);
    }
    return fy;
  }

  private async createMonthlyPeriods(tenantId: string, fiscalYearId: string, start: Date, end: Date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= last) {
      const pStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const pEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
      const exists = await this.prisma.accountingPeriod.findFirst({ where: { tenantId, fiscalYearId, startDate: pStart } });
      if (!exists) {
        await this.prisma.accountingPeriod.create({
          data: { tenantId, fiscalYearId, periodName: `${months[cursor.getMonth()]} ${cursor.getFullYear()}`, startDate: pStart, endDate: pEnd },
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  async listFiscalYears(tenantId: string) {
    return this.prisma.fiscalYear.findMany({ where: { tenantId }, orderBy: { startDate: 'desc' } });
  }

  async createFiscalYear(tenantId: string, dto: { name: string; startDate: string; endDate: string; isActive?: boolean }) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (dto.isActive) {
      await this.prisma.fiscalYear.updateMany({ where: { tenantId, isActive: true }, data: { isActive: false } });
    }
    const fy = await this.prisma.fiscalYear.create({
      data: { tenantId, name: dto.name, startDate: start, endDate: end, isActive: dto.isActive ?? false },
    });
    await this.createMonthlyPeriods(tenantId, fy.id, start, end);
    return fy;
  }

  async activateFiscalYear(tenantId: string, id: string) {
    await this.prisma.fiscalYear.updateMany({ where: { tenantId, isActive: true }, data: { isActive: false } });
    return this.prisma.fiscalYear.update({ where: { id }, data: { isActive: true } });
  }

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
