import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getBalanceSheet(tenantId: string, asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const accounts = await this.getAccountBalances(tenantId, undefined, date);

    const assets = accounts.filter(a => a.accountType === 'ASSET');
    const liabilities = accounts.filter(a => a.accountType === 'LIABILITY');
    const equity = accounts.filter(a => a.accountType === 'EQUITY');

    const totalAssets = this.sumBalances(assets);
    const totalLiabilities = this.sumBalances(liabilities);
    const totalEquity = this.sumBalances(equity);

    return {
      asOfDate: date,
      assets: {
        current: assets.filter(a => a.accountCode.startsWith('11')),
        nonCurrent: assets.filter(a => a.accountCode.startsWith('12')),
        total: totalAssets,
      },
      liabilities: {
        current: liabilities.filter(a => a.accountCode.startsWith('21')),
        nonCurrent: liabilities.filter(a => a.accountCode.startsWith('22')),
        total: totalLiabilities,
      },
      equity: {
        items: equity,
        total: totalEquity,
      },
      totalLiabilitiesAndEquity: totalLiabilities.add(totalEquity),
      isBalanced: totalAssets.equals(totalLiabilities.add(totalEquity)),
    };
  }

  async getIncomeStatement(tenantId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const accounts = await this.getAccountBalances(tenantId, start, end);
    const revenue = accounts.filter(a => a.accountType === 'REVENUE');
    const expenses = accounts.filter(a => a.accountType === 'EXPENSE');
    const cogs = accounts.filter(a => a.accountType === 'COGS');

    const totalRevenue = this.sumBalances(revenue);
    const totalCogs = this.sumBalances(cogs);
    const totalExpenses = this.sumBalances(expenses);
    const grossProfit = totalRevenue.sub(totalCogs);
    const netIncome = grossProfit.sub(totalExpenses);

    return {
      period: { startDate: start, endDate: end },
      revenue: { items: revenue, total: totalRevenue },
      costOfGoodsSold: { items: cogs, total: totalCogs },
      grossProfit,
      operatingExpenses: { items: expenses, total: totalExpenses },
      netIncome,
    };
  }

  async getTrialBalance(tenantId: string, asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const accounts = await this.getAccountBalances(tenantId, undefined, date);
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    const rows = accounts.map(acc => {
      totalDebit = totalDebit.add(acc.normalBalance === 'DEBIT' ? acc.balance.abs() : new Decimal(0));
      totalCredit = totalCredit.add(acc.normalBalance === 'CREDIT' ? acc.balance.abs() : new Decimal(0));
      return {
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountType: acc.accountType,
        debit: acc.normalBalance === 'DEBIT' ? acc.balance.abs() : new Decimal(0),
        credit: acc.normalBalance === 'CREDIT' ? acc.balance.abs() : new Decimal(0),
      };
    });

    return { asOfDate: date, accounts: rows, totalDebit, totalCredit, isBalanced: totalDebit.equals(totalCredit) };
  }

  async getCashFlowStatement(tenantId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const paymentsIn = await this.prisma.paymentReceived.findMany({
      where: { tenantId, paymentDate: { gte: start, lte: end } },
    });
    const paymentsOut = await this.prisma.paymentMade.findMany({
      where: { tenantId, paymentDate: { gte: start, lte: end } },
    });

    let totalIn = new Decimal(0);
    let totalOut = new Decimal(0);
    for (const p of paymentsIn) totalIn = totalIn.add(p.amount);
    for (const p of paymentsOut) totalOut = totalOut.add(p.amount);

    return {
      period: { startDate: start, endDate: end },
      operatingActivities: {
        cashReceivedFromCustomers: totalIn,
        cashPaidToSuppliers: totalOut,
        netCashFromOperating: totalIn.sub(totalOut),
      },
      investingActivities: { netCash: new Decimal(0) },
      financingActivities: { netCash: new Decimal(0) },
      netChangeInCash: totalIn.sub(totalOut),
    };
  }

  async getAccountsReceivable(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, isActive: true, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
      include: { customer: true },
      orderBy: { invoiceDate: 'asc' },
    });

    let totalOutstanding = new Decimal(0);
    const aging = { current: new Decimal(0), days30: new Decimal(0), days60: new Decimal(0), days90: new Decimal(0), over90: new Decimal(0) };

    const rows = invoices.map(inv => {
      const outstanding = inv.totalAmount.sub(inv.paidAmount);
      totalOutstanding = totalOutstanding.add(outstanding);

      const daysSinceIssue = Math.floor((Date.now() - inv.invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceIssue <= 30) aging.current = aging.current.add(outstanding);
      else if (daysSinceIssue <= 60) aging.days30 = aging.days30.add(outstanding);
      else if (daysSinceIssue <= 90) aging.days60 = aging.days60.add(outstanding);
      else if (daysSinceIssue <= 120) aging.days90 = aging.days90.add(outstanding);
      else aging.over90 = aging.over90.add(outstanding);

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name,
        invoiceDate: inv.invoiceDate,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        outstanding,
        daysOverdue: Math.max(0, daysSinceIssue - 30),
      };
    });

    return { totalOutstanding, aging, invoices: rows };
  }

  private async getAccountBalances(tenantId: string, startDate?: Date, endDate?: Date) {
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { accountCode: 'asc' },
    });

    const results = [];
    for (const account of accounts) {
      const lines = await this.prisma.journalEntryLine.findMany({
        where: {
          tenantId,
          accountId: account.id,
          journalEntry: {
            isPosted: true,
            isReversed: false,
            ...(startDate && endDate ? { entryDate: { gte: startDate, lte: endDate } } : {}),
          },
        },
      });

      let debitTotal = new Decimal(0);
      let creditTotal = new Decimal(0);
      for (const line of lines) {
        debitTotal = debitTotal.add(line.debitAmount);
        creditTotal = creditTotal.add(line.creditAmount);
      }

      const balance = account.normalBalance === 'DEBIT'
        ? debitTotal.sub(creditTotal)
        : creditTotal.sub(debitTotal);

      results.push({
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        balance,
        debitTotal,
        creditTotal,
      });
    }

    return results;
  }

  private sumBalances(accounts: { balance: Decimal }[]): Decimal {
    return accounts.reduce((sum, a) => sum.add(a.balance), new Decimal(0));
  }
}
