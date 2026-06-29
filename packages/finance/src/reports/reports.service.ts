import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private prisma: PrismaService,
    private accountingService: AccountingService,
  ) {}

  async getProfitLossStatement(tenantId: string, fiscalYearId: string, periodId?: string) {
    // Get trial balance data
    const trialBalance = await this.accountingService.getTrialBalance(tenantId, fiscalYearId, periodId);

    // Group accounts by type
    const revenue = trialBalance.accounts.filter(a => a.accountType === 'REVENUE' || a.accountType.startsWith('4'));
    const cogs = trialBalance.accounts.filter(a => a.accountType === 'COGS' || a.accountCode.startsWith('5'));
    const expenses = trialBalance.accounts.filter(a => a.accountType === 'EXPENSE' || a.accountCode.startsWith('6'));

    // Calculate totals
    const grossRevenue = revenue.reduce((sum, a) => sum + a.credit - a.debit, 0);
    const salesReturns = trialBalance.accounts.find(a => a.accountCode === '5310');
    const returnsAmount = salesReturns ? (salesReturns.debit - salesReturns.credit) : 0;
    const netRevenue = grossRevenue - returnsAmount;

    const totalCogs = cogs.reduce((sum, a) => sum + a.debit - a.credit, 0);
    const grossProfit = netRevenue - totalCogs;

    const totalExpenses = expenses.reduce((sum, a) => sum + a.debit - a.credit, 0);
    const operatingProfit = grossProfit - totalExpenses;

    const financeCosts = expenses
      .filter(a => a.accountCode?.startsWith('66'))
      .reduce((sum, a) => sum + a.debit - a.credit, 0);
    const profitBeforeTax = operatingProfit - financeCosts;

    return {
      tenantId,
      fiscalYearId,
      periodId,
      statement: {
        revenue: {
          gross: grossRevenue,
          returns: returnsAmount,
          net: netRevenue,
          breakdown: revenue.map(a => ({
            code: a.accountCode,
            name: a.accountName,
            amount: a.credit - a.debit,
          })),
        },
        costOfGoodsSold: {
          total: totalCogs,
          breakdown: cogs.map(a => ({
            code: a.accountCode,
            name: a.accountName,
            amount: a.debit - a.credit,
          })),
        },
        grossProfit,
        operatingExpenses: {
          total: totalExpenses,
          breakdown: expenses.map(a => ({
            code: a.accountCode,
            name: a.accountName,
            amount: a.debit - a.credit,
          })),
        },
        operatingProfit,
        financeCosts,
        profitBeforeTax,
        netProfit: profitBeforeTax, // Simplified (no tax calculation)
      },
      isBalanced: trialBalance.isBalanced,
    };
  }

  async getBalanceSheet(tenantId: string, asAtDate: Date) {
    // Get all accounts with their balances
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: { tenantId, isActive: true },
      include: {
        children: true,
      },
    });

    // Get all posted journal entries up to the date
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        tenantId,
        entryDate: { lte: asAtDate },
        isPosted: true,
        isReversed: false,
      },
      include: { lines: true },
    });

    // Calculate balances per account
    const balances = new Map<string, number>();

    for (const entry of entries) {
      for (const line of entry.lines) {
        const current = balances.get(line.accountId) || 0;
        const debit = Number(line.debitAmount);
        const credit = Number(line.creditAmount);
        balances.set(line.accountId, current + debit - credit);
      }
    }

    // Group by account type
    const currentAssets: any[] = [];
    const nonCurrentAssets: any[] = [];
    const currentLiabilities: any[] = [];
    const nonCurrentLiabilities: any[] = [];
    const equity: any[] = [];

    let totalCurrentAssets = 0;
    let totalNonCurrentAssets = 0;
    let totalCurrentLiabilities = 0;
    let totalNonCurrentLiabilities = 0;
    let totalEquity = 0;

    for (const account of accounts) {
      const balance = balances.get(account.id) || 0;
      const netBalance = account.normalBalance === 'DEBIT' ? balance : -balance;

      const item = {
        code: account.accountCode,
        name: account.accountName,
        amount: Math.abs(netBalance),
      };

      if (account.accountCode.startsWith('11')) {
        currentAssets.push({ ...item, amount: netBalance });
        totalCurrentAssets += netBalance;
      } else if (account.accountCode.startsWith('12')) {
        nonCurrentAssets.push({ ...item, amount: netBalance });
        totalNonCurrentAssets += netBalance;
      } else if (account.accountCode.startsWith('21')) {
        currentLiabilities.push({ ...item, amount: -netBalance });
        totalCurrentLiabilities += -netBalance;
      } else if (account.accountCode.startsWith('22')) {
        nonCurrentLiabilities.push({ ...item, amount: -netBalance });
        totalNonCurrentLiabilities += -netBalance;
      } else if (account.accountCode.startsWith('3')) {
        equity.push({ ...item, amount: -netBalance });
        totalEquity += -netBalance;
      }
    }

    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      tenantId,
      asAtDate,
      statement: {
        assets: {
          current: {
            items: currentAssets,
            total: totalCurrentAssets,
          },
          nonCurrent: {
            items: nonCurrentAssets,
            total: totalNonCurrentAssets,
          },
          total: totalAssets,
        },
        liabilities: {
          current: {
            items: currentLiabilities,
            total: totalCurrentLiabilities,
          },
          nonCurrent: {
            items: nonCurrentLiabilities,
            total: totalNonCurrentLiabilities,
          },
          total: totalLiabilities,
        },
        equity: {
          items: equity,
          total: totalEquity,
        },
        totalLiabilitiesAndEquity,
      },
      isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
    };
  }

  async getCashFlowStatement(tenantId: string, startDate: Date, endDate: Date) {
    // Simplified cash flow statement
    // In production, this would track actual cash movements

    const cashAccounts = await this.prisma.chartOfAccount.findMany({
      where: {
        tenantId,
        accountCode: { startsWith: '111' },
        isActive: true,
      },
    });

    let netCashPosition = 0;

    for (const account of cashAccounts) {
      // Get balance for this account in the period
      const entries = await this.prisma.journalEntryLine.findMany({
        where: {
          tenantId,
          accountId: account.id,
          journal: {
            entryDate: { gte: startDate, lte: endDate },
            isPosted: true,
            isReversed: false,
          },
        },
      });

      const balance = entries.reduce((sum, line) => {
        return sum + Number(line.debitAmount) - Number(line.creditAmount);
      }, 0);

      netCashPosition += balance;
    }

    // Get payments received and made in period
    const paymentsReceived = await this.prisma.paymentReceived.findMany({
      where: {
        tenantId,
        paymentDate: { gte: startDate, lte: endDate },
      },
    });

    const paymentsMade = await this.prisma.paymentMade.findMany({
      where: {
        tenantId,
        paymentDate: { gte: startDate, lte: endDate },
      },
    });

    const totalReceived = paymentsReceived.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPaid = paymentsMade.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      tenantId,
      period: { startDate, endDate },
      statement: {
        operatingActivities: {
          cashFromCustomers: totalReceived,
          cashPaidToSuppliers: totalPaid,
          netCashFromOperations: totalReceived - totalPaid,
        },
        investingActivities: {
          // Would include asset purchases, sales
          total: 0,
        },
        financingActivities: {
          // Would include loans, equity injections
          total: 0,
        },
        netChangeInCash: totalReceived - totalPaid,
        cashPositionAtEnd: netCashPosition,
      },
    };
  }

  async getArAgingReport(tenantId: string, asAtDate: Date) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        isActive: true,
        paymentStatus: { in: ['ISSUED', 'PARTIAL'] },
        invoiceDate: { lte: asAtDate },
      },
      include: { customer: true },
    });

    const agingBuckets = {
      current: 0, // 0-30 days
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
    };

    const customerAging = new Map<string, any>();

    for (const invoice of invoices) {
      const daysOverdue = Math.floor((asAtDate.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const balanceDue = Number(invoice.totalAmount) - Number(invoice.paidAmount);

      if (balanceDue <= 0) continue;

      if (!customerAging.has(invoice.customerId)) {
        customerAging.set(invoice.customerId, {
          customer: invoice.customer,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          over90: 0,
          total: 0,
        });
      }

      const aging = customerAging.get(invoice.customerId);

      if (daysOverdue <= 0) {
        aging.current += balanceDue;
        aging.total += balanceDue;
        agingBuckets.current += balanceDue;
      } else if (daysOverdue <= 30) {
        aging.days1to30 += balanceDue;
        aging.total += balanceDue;
        agingBuckets.days1to30 += balanceDue;
      } else if (daysOverdue <= 60) {
        aging.days31to60 += balanceDue;
        aging.total += balanceDue;
        agingBuckets.days31to60 += balanceDue;
      } else if (daysOverdue <= 90) {
        aging.days61to90 += balanceDue;
        aging.total += balanceDue;
        agingBuckets.days61to90 += balanceDue;
      } else {
        aging.over90 += balanceDue;
        aging.total += balanceDue;
        agingBuckets.over90 += balanceDue;
      }
    }

    return {
      tenantId,
      asAtDate,
      summary: agingBuckets,
      totalReceivables: Object.values(agingBuckets).reduce((sum, val) => sum + val, 0),
      details: Array.from(customerAging.values()),
    };
  }

  async getApAgingReport(tenantId: string, asAtDate: Date) {
    const bills = await this.prisma.bill.findMany({
      where: {
        tenantId,
        isActive: true,
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        billDate: { lte: asAtDate },
      },
      include: { supplier: true },
    });

    const agingBuckets = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      days61to90: 0,
      over90: 0,
    };

    const supplierAging = new Map<string, any>();

    for (const bill of bills) {
      const daysOverdue = Math.floor((asAtDate.getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const balanceDue = Number(bill.totalAmount) - Number(bill.paidAmount);

      if (balanceDue <= 0) continue;

      if (!supplierAging.has(bill.supplierId)) {
        supplierAging.set(bill.supplierId, {
          supplier: bill.supplier,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          over90: 0,
          total: 0,
        });
      }

      const aging = supplierAging.get(bill.supplierId);

      if (daysOverdue <= 0) {
        aging.current += balanceDue;
        aging.total += balanceDue;
        agingBuckets.current += balanceDue;
      } else if (daysOverdue <= 30) {
        aging.days1to30 += balanceDue;
        aging.total += balanceDue;
        agingBuckets.days1to30 += balanceDue;
      } else if (daysOverdue <= 60) {
        aging.days31to60 += balanceDue;
        aging.total += balanceDue;
        agingBuckets.days31to60 += balanceDue;
      } else if (daysOverdue <= 90) {
        aging.days61to90 += balanceDue;
        aging.total += balanceDue;
        agingBuckets.days61to90 += balanceDue;
      } else {
        aging.over90 += balanceDue;
        aging.total += balanceDue;
        agingBuckets.over90 += balanceDue;
      }
    }

    return {
      tenantId,
      asAtDate,
      summary: agingBuckets,
      totalPayables: Object.values(agingBuckets).reduce((sum, val) => sum + val, 0),
      details: Array.from(supplierAging.values()),
    };
  }

  async getVatReturn(tenantId: string, startDate: Date, endDate: Date) {
    // Get output VAT (sales)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        isActive: true,
        invoiceDate: { gte: startDate, lte: endDate },
        invoiceType: { in: ['TAX_INVOICE', 'ABBREVIATED'] },
      },
    });

    const outputVat = invoices.reduce((sum, inv) => sum + Number(inv.vatAmount), 0);

    // Get input VAT (purchases)
    const bills = await this.prisma.bill.findMany({
      where: {
        tenantId,
        isActive: true,
        billDate: { gte: startDate, lte: endDate },
      },
    });

    const inputVat = bills.reduce((sum, bill) => sum + Number(bill.vatAmount), 0);

    const netVatPayable = outputVat - inputVat;
    const vatRefund = inputVat > outputVat ? inputVat - outputVat : 0;

    return {
      tenantId,
      period: { startDate, endDate },
      vatComputation: {
        sales: {
          taxableAmount: invoices.reduce((sum, inv) => sum + Number(inv.taxableAmount), 0),
          vatAmount: outputVat,
        },
        purchases: {
          taxableAmount: bills.reduce((sum, bill) => sum + Number(bill.taxableAmount), 0),
          vatAmount: inputVat,
        },
        netVatPayable: Math.max(0, netVatPayable),
        vatRefund,
      },
      dueDate: new Date(endDate.getTime() + 25 * 24 * 60 * 60 * 1000), // 25th of following month
    };
  }

  async getSalesBook(tenantId: string, startDate: Date, endDate: Date) {
    // IRD Schedule 6D format
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        isActive: true,
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: { customer: true },
      orderBy: { invoiceDate: 'asc' },
    });

    const salesBook = invoices.map(inv => ({
      date: inv.invoiceDate,
      billNo: inv.invoiceNumber,
      buyerName: inv.customer?.name || '',
      buyerPan: inv.customerPan || '',
      invoiceTotal: Number(inv.subtotal) + Number(inv.discountAmount),
      nonTaxable: 0, // Would need exemption tracking
      export: 0, // Would need export tracking
      discount: Number(inv.discountAmount),
      taxableAmount: Number(inv.taxableAmount),
      vat: Number(inv.vatAmount),
      total: Number(inv.totalAmount),
    }));

    return {
      tenantId,
      period: { startDate, endDate },
      salesBook,
      totals: salesBook.reduce(
        (acc, row) => ({
          invoiceTotal: acc.invoiceTotal + row.invoiceTotal,
          taxableAmount: acc.taxableAmount + row.taxableAmount,
          vat: acc.vat + row.vat,
          total: acc.total + row.total,
        }),
        { invoiceTotal: 0, taxableAmount: 0, vat: 0, total: 0 },
      ),
    };
  }

  async getAuditTrail(tenantId: string, startDate: Date, endDate: Date, table?: string) {
    const where: any = {
      tenantId,
      actionAt: { gte: startDate, lte: endDate },
    };

    if (table) {
      where.tableName = table;
    }

    const logs = await this.prisma.financeAuditLog.findMany({
      where,
      orderBy: { actionAt: 'desc' },
      take: 1000, // Limit for performance
    });

    return {
      tenantId,
      period: { startDate, endDate },
      auditTrail: logs.map(log => ({
        timestamp: log.actionAt,
        table: log.tableName,
        recordId: log.recordId,
        action: log.action,
        user: log.actionBy,
        ipAddress: log.ipAddress,
        oldData: log.oldData,
        newData: log.newData,
      })),
    };
  }
}
