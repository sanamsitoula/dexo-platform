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

    // Current-year earnings: during the year, P&L accounts (revenue/expense/COGS)
    // are not yet closed to retained earnings, so their net must be shown within
    // equity for the balance sheet to balance (Assets = Liabilities + Equity).
    const revenue = accounts.filter(a => a.accountType === 'REVENUE');
    const expenses = accounts.filter(a => a.accountType === 'EXPENSE');
    const cogs = accounts.filter(a => a.accountType === 'COGS');
    const netIncome = this.sumBalances(revenue).sub(this.sumBalances(cogs)).sub(this.sumBalances(expenses));

    const totalAssets = this.sumBalances(assets);
    const totalLiabilities = this.sumBalances(liabilities);
    const totalEquity = this.sumBalances(equity).add(netIncome);

    const currentEarningsLine = {
      accountId: 'current-year-earnings',
      accountCode: '3900',
      accountName: 'Current Year Earnings',
      accountType: 'EQUITY',
      normalBalance: 'CREDIT',
      balance: netIncome,
      debitTotal: new Decimal(0),
      creditTotal: netIncome,
    };

    return {
      asOfDate: date,
      assets: {
        current: assets.filter(a => a.accountCode.startsWith('11') || a.accountCode.startsWith('10')),
        nonCurrent: assets.filter(a => a.accountCode.startsWith('12') || a.accountCode.startsWith('15')),
        total: totalAssets,
      },
      liabilities: {
        current: liabilities.filter(a => a.accountCode.startsWith('21') || a.accountCode.startsWith('20') || a.accountCode.startsWith('23')),
        nonCurrent: liabilities.filter(a => a.accountCode.startsWith('22')),
        total: totalLiabilities,
      },
      equity: {
        items: [...equity, currentEarningsLine],
        currentYearEarnings: netIncome,
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

  // ============================================================
  // IRD ELECTRONIC BILLING REPORTS (Schedule 6D, audit, CBMS)
  // ============================================================

  /** 1. Sales Book — IRD Schedule 6D */
  async getSalesBook(tenantId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const masterBills = await this.prisma.masterBill.findMany({
      where: { tenantId, billDate: { gte: start, lte: end } },
      include: { invoice: { include: { customer: true } } },
      orderBy: { billDate: 'asc' },
    });

    let totalAmount = new Decimal(0);
    let totalTaxable = new Decimal(0);
    let totalVat = new Decimal(0);
    let totalDiscount = new Decimal(0);

    const rows = masterBills.map((mb) => {
      totalAmount = totalAmount.add(mb.totalAmount);
      totalTaxable = totalTaxable.add(mb.taxableAmount);
      totalVat = totalVat.add(mb.taxAmount);
      totalDiscount = totalDiscount.add(mb.discount);
      return {
        billDate: mb.billDate,
        billNo: mb.billNo,
        customerName: mb.customerName ?? mb.invoice?.customer?.name ?? '',
        customerPan: mb.customerPan ?? mb.invoice?.customer?.pan ?? '',
        amount: mb.amount,
        discount: mb.discount,
        taxableAmount: mb.taxableAmount,
        taxAmount: mb.taxAmount,
        totalAmount: mb.totalAmount,
        paymentMethod: mb.paymentMethod,
        isRealtime: mb.isRealtime,
        syncWithIrd: mb.syncWithIrd,
      };
    });

    return {
      period: { startDate: start, endDate: end },
      rows,
      totals: { totalAmount, totalTaxable, totalVat, totalDiscount, count: rows.length },
    };
  }

  /** 2. Purchase Book */
  async getPurchaseBook(tenantId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const bills = await this.prisma.bill.findMany({
      where: { tenantId, billDate: { gte: start, lte: end }, isActive: true },
      include: { supplier: true },
      orderBy: { billDate: 'asc' },
    });

    let totalSubtotal = new Decimal(0);
    let totalVat = new Decimal(0);
    let totalAmount = new Decimal(0);

    const rows = bills.map((b) => {
      totalSubtotal = totalSubtotal.add(b.subtotal);
      totalVat = totalVat.add(b.vatAmount);
      totalAmount = totalAmount.add(b.totalAmount);
      return {
        billDate: b.billDate,
        billNumber: b.billNumber,
        billType: b.billType,
        supplierName: b.supplier?.name ?? '',
        supplierPan: b.supplierPan ?? b.supplier?.pan ?? '',
        subtotal: b.subtotal,
        discountAmount: b.discountAmount,
        taxableAmount: b.taxableAmount,
        vatAmount: b.vatAmount,
        totalAmount: b.totalAmount,
        paymentStatus: b.paymentStatus,
      };
    });

    return {
      period: { startDate: start, endDate: end },
      rows,
      totals: { totalSubtotal, totalVat, totalAmount, count: rows.length },
    };
  }

  /** 3. VAT Return computation (Output vs Input) */
  async getVatReturn(tenantId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const [invoices, bills] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId, isActive: true, invoiceDate: { gte: start, lte: end }, invoiceType: { in: ['TAX_INVOICE', 'ABBREVIATED'] } },
        select: { vatAmount: true, taxableAmount: true, totalAmount: true },
      }),
      this.prisma.bill.findMany({
        where: { tenantId, isActive: true, billDate: { gte: start, lte: end } },
        select: { vatAmount: true, taxableAmount: true, totalAmount: true },
      }),
    ]);

    let outputVat = new Decimal(0);
    let outputTaxable = new Decimal(0);
    let inputVat = new Decimal(0);
    let inputTaxable = new Decimal(0);
    for (const i of invoices) { outputVat = outputVat.add(i.vatAmount); outputTaxable = outputTaxable.add(i.taxableAmount); }
    for (const b of bills) { inputVat = inputVat.add(b.vatAmount); inputTaxable = inputTaxable.add(b.taxableAmount); }

    const netVatPayable = outputVat.sub(inputVat);
    return {
      period: { startDate: start, endDate: end },
      outputVat: { amount: outputVat, taxableBase: outputTaxable, invoiceCount: invoices.length },
      inputVat: { amount: inputVat, taxableBase: inputTaxable, billCount: bills.length },
      netVatPayable,
      isRefundable: netVatPayable.isNegative(),
    };
  }

  /** 4. TDS Deducted Summary */
  async getTdsSummary(tenantId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const payments = await this.prisma.paymentMade.findMany({
      where: { tenantId, paymentDate: { gte: start, lte: end }, tdsAmount: { gt: 0 } },
      orderBy: { paymentDate: 'asc' },
    });

    const grouped = new Map<string, { payeeType: string; payeeId: string; gross: Decimal; tds: Decimal; count: number; lastPaymentDate: Date }>();
    let totalGross = new Decimal(0);
    let totalTds = new Decimal(0);

    for (const p of payments) {
      const key = `${p.payeeType}:${p.payeeId}`;
      const entry = grouped.get(key) ?? { payeeType: p.payeeType, payeeId: p.payeeId, gross: new Decimal(0), tds: new Decimal(0), count: 0, lastPaymentDate: p.paymentDate };
      entry.gross = entry.gross.add(p.amount);
      entry.tds = entry.tds.add(p.tdsAmount);
      entry.count += 1;
      if (p.paymentDate > entry.lastPaymentDate) entry.lastPaymentDate = p.paymentDate;
      grouped.set(key, entry);
      totalGross = totalGross.add(p.amount);
      totalTds = totalTds.add(p.tdsAmount);
    }

    const rows = Array.from(grouped.values()).map((e) => ({
      ...e,
      netPaid: e.gross.sub(e.tds),
    }));

    return { period: { startDate: start, endDate: end }, rows, totals: { totalGross, totalTds, count: rows.length } };
  }

  /** 5. Deferred Revenue Schedule (active annual memberships) */
  async getDeferredRevenueSchedule(tenantId: string, asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : new Date();

    // Account code 2132 per FINANCE_MODULE.md §5.1 (Deferred Membership Revenue)
    const deferredAccounts = await this.prisma.chartOfAccount.findMany({
      where: { tenantId, isActive: true, accountCode: { startsWith: '213' } },
    });

    const rows = [];
    for (const acc of deferredAccounts) {
      const balances = await this.getAccountBalances(tenantId, undefined, date);
      const acctBal = balances.find((b) => b.accountId === acc.id);
      if (!acctBal || acctBal.balance.isZero()) continue;
      rows.push({
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        balance: acctBal.balance,
      });
    }

    const totalDeferred = rows.reduce((s, r) => s.add(r.balance), new Decimal(0));
    return { asOfDate: date, rows, totalDeferred };
  }

  /** 6. AR Aging buckets + invoice detail */
  async getArAging(tenantId: string, asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, isActive: true, paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, invoiceDate: { lte: date } },
      include: { customer: true },
      orderBy: { invoiceDate: 'asc' },
    });

    const buckets = { current: new Decimal(0), days30: new Decimal(0), days60: new Decimal(0), days90: new Decimal(0), over90: new Decimal(0) };
    let totalOutstanding = new Decimal(0);

    const rows = invoices.map((inv) => {
      const outstanding = inv.totalAmount.sub(inv.paidAmount);
      totalOutstanding = totalOutstanding.add(outstanding);
      const daysSinceIssue = Math.floor((date.getTime() - inv.invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceIssue <= 30) buckets.current = buckets.current.add(outstanding);
      else if (daysSinceIssue <= 60) buckets.days30 = buckets.days30.add(outstanding);
      else if (daysSinceIssue <= 90) buckets.days60 = buckets.days60.add(outstanding);
      else if (daysSinceIssue <= 120) buckets.days90 = buckets.days90.add(outstanding);
      else buckets.over90 = buckets.over90.add(outstanding);
      return {
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.name ?? '',
        invoiceDate: inv.invoiceDate,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        outstanding,
        daysOutstanding: daysSinceIssue,
      };
    });

    return { asOfDate: date, buckets, totalOutstanding, rows, count: rows.length };
  }

  /** 7. AP Aging buckets + bill detail */
  async getApAging(tenantId: string, asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const bills = await this.prisma.bill.findMany({
      where: { tenantId, isActive: true, paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, billDate: { lte: date } },
      include: { supplier: true },
      orderBy: { billDate: 'asc' },
    });

    const buckets = { current: new Decimal(0), days30: new Decimal(0), days60: new Decimal(0), days90: new Decimal(0), over90: new Decimal(0) };
    let totalOutstanding = new Decimal(0);

    const rows = bills.map((b) => {
      const outstanding = b.totalAmount.sub(b.paidAmount);
      totalOutstanding = totalOutstanding.add(outstanding);
      const daysSinceIssue = Math.floor((date.getTime() - b.billDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceIssue <= 30) buckets.current = buckets.current.add(outstanding);
      else if (daysSinceIssue <= 60) buckets.days30 = buckets.days30.add(outstanding);
      else if (daysSinceIssue <= 90) buckets.days60 = buckets.days60.add(outstanding);
      else if (daysSinceIssue <= 120) buckets.days90 = buckets.days90.add(outstanding);
      else buckets.over90 = buckets.over90.add(outstanding);
      return {
        billNumber: b.billNumber,
        supplierName: b.supplier?.name ?? '',
        billDate: b.billDate,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        outstanding,
        daysOutstanding: daysSinceIssue,
      };
    });

    return { asOfDate: date, buckets, totalOutstanding, rows, count: rows.length };
  }

  /** 8. Cancelled Bills Register (IRD audit) */
  async getCancelledBills(tenantId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, isActive: false, cancelledAt: { gte: start, lte: end } },
      include: { customer: true },
      orderBy: { cancelledAt: 'desc' },
    });

    return {
      period: { startDate: start, endDate: end },
      rows: invoices.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        customerName: i.customer?.name ?? '',
        invoiceDate: i.invoiceDate,
        cancelledAt: i.cancelledAt,
        cancelledBy: i.cancelledBy,
        cancelReason: i.cancelReason,
        totalAmount: i.totalAmount,
      })),
      count: invoices.length,
    };
  }

  /** 9. Reprint Log (IRD audit) */
  async getReprintLog(tenantId: string, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const logs = await this.prisma.reprintLog.findMany({
      where: { tenantId, printedAt: { gte: start, lte: end } },
      include: { invoice: true },
      orderBy: { printedAt: 'desc' },
    });

    return {
      period: { startDate: start, endDate: end },
      rows: logs.map((l) => ({
        billNo: l.billNo,
        invoiceNumber: l.invoice?.invoiceNumber ?? '',
        printType: l.printType,
        copyNumber: l.copyNumber,
        printedBy: l.printedBy,
        printedAt: l.printedAt,
        reason: l.reason,
        ipAddress: l.ipAddress,
      })),
      count: logs.length,
    };
  }

  /** 10. Audit Trail (Finance Audit Log) */
  async getAuditTrail(
    tenantId: string,
    startDate?: string,
    endDate?: string,
    filters?: { tableName?: string; action?: string; actionBy?: string },
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const where: any = { tenantId, actionAt: { gte: start, lte: end } };
    if (filters?.tableName) where.tableName = filters.tableName;
    if (filters?.action) where.action = filters.action;
    if (filters?.actionBy) where.actionBy = filters.actionBy;

    const logs = await this.prisma.financeAuditLog.findMany({
      where,
      orderBy: { actionAt: 'desc' },
      take: 1000,
    });

    return {
      period: { startDate: start, endDate: end },
      rows: logs.map((l) => ({
        id: l.id,
        tableName: l.tableName,
        recordId: l.recordId,
        action: l.action,
        actionBy: l.actionBy,
        actionAt: l.actionAt,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        newData: l.newData,
      })),
      count: logs.length,
    };
  }

  /** 11. CBMS Sync Status dashboard */
  async getCbmsSyncStatus(tenantId: string) {
    const [synced, pending, failedQueue] = await Promise.all([
      this.prisma.masterBill.count({ where: { tenantId, syncWithIrd: true } }),
      this.prisma.masterBill.count({ where: { tenantId, syncWithIrd: false, isBillActive: true } }),
      this.prisma.cbmsSyncQueue.findMany({
        where: { tenantId, status: { in: ['PENDING', 'FAILED'] } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    let oldestPendingAge = null;
    if (failedQueue.length > 0) {
      const oldest = failedQueue[failedQueue.length - 1];
      oldestPendingAge = Math.floor((Date.now() - oldest.createdAt.getTime()) / (1000 * 60 * 60));
    }

    return {
      syncedCount: synced,
      pendingCount: pending,
      failedQueue: failedQueue.map((q) => ({
        id: q.id,
        invoiceId: q.invoiceId,
        operation: q.operation,
        status: q.status,
        attemptCount: q.attemptCount,
        errorMessage: q.errorMessage,
        createdAt: q.createdAt,
        lastAttemptedAt: q.lastAttemptedAt,
      })),
      oldestPendingAgeHours: oldestPendingAge,
      needsAttention: oldestPendingAge !== null && oldestPendingAge > 24,
    };
  }

  /** 12. Reports landing page summary */
  async getAllReportsSummary(tenantId: string) {
    const asOf = new Date();
    const monthStart = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
    const [invoices, bills, cancelled, pendingSync, masterBills] = await Promise.all([
      this.prisma.invoice.count({ where: { tenantId, isActive: true, invoiceDate: { gte: monthStart } } }),
      this.prisma.bill.count({ where: { tenantId, isActive: true, billDate: { gte: monthStart } } }),
      this.prisma.invoice.count({ where: { tenantId, isActive: false, cancelledAt: { gte: monthStart } } }),
      this.prisma.masterBill.count({ where: { tenantId, syncWithIrd: false, isBillActive: true } }),
      this.prisma.masterBill.count({ where: { tenantId } }),
    ]);
    return { asOf, monthStart, invoices, bills, cancelled, pendingSync, masterBills };
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
