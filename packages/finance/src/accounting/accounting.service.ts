import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import {
  CreateChartOfAccountDto,
  UpdateChartOfAccountDto,
  CreateFiscalYearDto,
  CreateAccountingPeriodDto,
  CreateJournalEntryDto,
  PostJournalEntryDto,
  ReverseJournalEntryDto,
  JournalEntryStatus,
  AccountType,
  NormalBalance,
} from '../finance/dto';

@Injectable()
export class AccountingService {
  private readonly logger = new Logger(AccountingService.name);

  constructor(private prisma: PrismaService) {}

  // ========== Chart of Accounts ==========

  async createChartOfAccount(tenantId: string, dto: CreateChartOfAccountDto) {
    // Check if account code already exists for tenant
    const existing = await this.prisma.chartOfAccount.findFirst({
      where: {
        tenantId,
        accountCode: dto.accountCode,
      },
    });

    if (existing) {
      throw new BadRequestException('Account code already exists for this tenant');
    }

    // Validate parent exists if specified
    if (dto.parentId) {
      const parent = await this.prisma.chartOfAccount.findFirst({
        where: { id: dto.parentId, tenantId },
      });

      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
    }

    const account = await this.prisma.chartOfAccount.create({
      data: {
        tenantId,
        accountCode: dto.accountCode,
        accountName: dto.accountName,
        accountType: dto.accountType,
        parentId: dto.parentId,
        isControl: dto.isControl || false,
        currency: dto.currency || 'NPR',
        normalBalance: dto.normalBalance,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdBy: tenantId, // TODO: Get from JWT context
      },
    });

    this.logger.log(`Created chart of account ${account.accountCode} for tenant ${tenantId}`);

    return account;
  }

  async getChartOfAccounts(tenantId: string, includeInactive = false) {
    const where: any = { tenantId };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.chartOfAccount.findMany({
      where,
      orderBy: [{ accountCode: 'asc' }],
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async getChartOfAccount(tenantId: string, id: string) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, tenantId },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async updateChartOfAccount(tenantId: string, id: string, dto: UpdateChartOfAccountDto) {
    const account = await this.prisma.chartOfAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.chartOfAccount.update({
      where: { id },
      data: dto,
    });
  }

  async getDefaultChartOfAccounts(tenantId: string, industry?: string) {
    // Return standard CoA template based on industry
    const standardAccounts = this.getStandardChartOfAccounts();

    // Create accounts for tenant
    const accounts = await Promise.all(
      standardAccounts.map(account =>
        this.prisma.chartOfAccount.create({
          data: {
            tenantId,
            accountCode: account.code,
            accountName: account.name,
            accountType: account.type as AccountType,
            normalBalance: account.normalBalance as NormalBalance,
            isControl: account.isControl || false,
            currency: 'NPR',
            isActive: true,
            createdBy: tenantId,
          },
        }),
      ),
    );

    this.logger.log(`Created ${accounts.length} default chart of accounts for tenant ${tenantId}`);

    return accounts;
  }

  // ========== Fiscal Year ==========

  async createFiscalYear(tenantId: string, dto: CreateFiscalYearDto) {
    // Check if fiscal year already exists
    const existing = await this.prisma.fiscalYear.findFirst({
      where: {
        tenantId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new BadRequestException('Fiscal year already exists');
    }

    // Close any existing open fiscal years
    await this.prisma.fiscalYear.updateMany({
      where: {
        tenantId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const fiscalYear = await this.prisma.fiscalYear.create({
      data: {
        tenantId,
        name: dto.name,
        startDate: dto.startDate,
        endDate: dto.endDate,
        isActive: true,
      },
    });

    // Create standard accounting periods (12 months)
    await this.createStandardPeriods(tenantId, fiscalYear.id, dto.startDate, dto.endDate);

    this.logger.log(`Created fiscal year ${dto.name} for tenant ${tenantId}`);

    return fiscalYear;
  }

  async getFiscalYears(tenantId: string) {
    return this.prisma.fiscalYear.findMany({
      where: { tenantId },
      orderBy: [{ startDate: 'desc' }],
    });
  }

  async getActiveFiscalYear(tenantId: string) {
    return this.prisma.fiscalYear.findFirst({
      where: {
        tenantId,
        isActive: true,
      },
    });
  }

  async closeFiscalYear(tenantId: string, id: string, closedBy: string) {
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id, tenantId },
    });

    if (!fiscalYear) {
      throw new NotFoundException('Fiscal year not found');
    }

    // Check if all periods are closed
    const openPeriods = await this.prisma.accountingPeriod.count({
      where: {
        fiscalYearId: id,
        isClosed: false,
      },
    });

    if (openPeriods > 0) {
      throw new BadRequestException('Cannot close fiscal year with open periods');
    }

    return this.prisma.fiscalYear.update({
      where: { id },
      data: {
        isClosed: true,
        isActive: false,
        closedBy,
        closedAt: new Date(),
      },
    });
  }

  // ========== Accounting Periods ==========

  async createAccountingPeriod(tenantId: string, dto: CreateAccountingPeriodDto) {
    // Verify fiscal year belongs to tenant
    const fiscalYear = await this.prisma.fiscalYear.findFirst({
      where: { id: dto.fiscalYearId, tenantId },
    });

    if (!fiscalYear) {
      throw new NotFoundException('Fiscal year not found');
    }

    return this.prisma.accountingPeriod.create({
      data: {
        tenantId,
        fiscalYearId: dto.fiscalYearId,
        periodName: dto.periodName,
        startDate: dto.startDate,
        endDate: dto.endDate,
      },
    });
  }

  async getAccountingPeriods(tenantId: string, fiscalYearId?: string) {
    const where: any = { tenantId };

    if (fiscalYearId) {
      where.fiscalYearId = fiscalYearId;
    }

    return this.prisma.accountingPeriod.findMany({
      where,
      orderBy: [{ startDate: 'asc' }],
    });
  }

  async closeAccountingPeriod(tenantId: string, id: string, closedBy: string) {
    const period = await this.prisma.accountingPeriod.findFirst({
      where: { id, tenantId },
    });

    if (!period) {
      throw new NotFoundException('Accounting period not found');
    }

    return this.prisma.accountingPeriod.update({
      where: { id },
      data: {
        isClosed: true,
        closedBy,
        closedAt: new Date(),
      },
    });
  }

  // ========== Journal Entries ==========

  async createJournalEntry(tenantId: string, dto: CreateJournalEntryDto) {
    // Get active fiscal year
    const fiscalYear = await this.getActiveFiscalYear(tenantId);
    if (!fiscalYear) {
      throw new BadRequestException('No active fiscal year found');
    }

    // Get current accounting period
    const period = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId,
        fiscalYearId: fiscalYear.id,
        startDate: { lte: dto.entryDate },
        endDate: { gte: dto.entryDate },
      },
    });

    if (!period) {
      throw new BadRequestException('No accounting period found for this date');
    }

    // Validate journal entry lines
    this.validateJournalEntryLines(dto.lines);

    // Generate journal entry number
    const entryNo = await this.generateJournalEntryNumber(tenantId, fiscalYear.name);

    // Create journal entry with lines in a transaction
    const journalEntry = await this.prisma.$transaction(async (trx) => {
      const entry = await trx.journalEntry.create({
        data: {
          tenantId,
          fiscalYearId: fiscalYear.id,
          periodId: period.id,
          entryNo,
          entryDate: dto.entryDate,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          description: dto.description,
          narration: dto.narration,
          isPosted: false,
          createdBy: tenantId, // TODO: Get from JWT
        },
      });

      // Create journal entry lines
      let lineNo = 1;
      for (const line of dto.lines) {
        await trx.journalEntryLine.create({
          data: {
            journalEntryId: entry.id,
            tenantId,
            accountId: line.accountId,
            lineNo,
            description: line.description,
            debitAmount: line.debitAmount || 0,
            creditAmount: line.creditAmount || 0,
            currency: line.currency || 'NPR',
          },
        });
        lineNo++;
      }

      return entry;
    });

    this.logger.log(`Created journal entry ${entryNo} for tenant ${tenantId}`);

    return journalEntry;
  }

  async getJournalEntries(tenantId: string, fiscalYearId?: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };

    if (fiscalYearId) {
      where.fiscalYearId = fiscalYearId;
    }

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = startDate;
      if (endDate) where.entryDate.lte = endDate;
    }

    return this.prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: true,
          },
        },
        fiscalYear: true,
        period: true,
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getJournalEntry(tenantId: string, id: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: {
        lines: {
          include: {
            account: true,
          },
          orderBy: [{ lineNo: 'asc' }],
        },
        fiscalYear: true,
        period: true,
      },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    return entry;
  }

  async postJournalEntry(tenantId: string, id: string, dto: PostJournalEntryDto) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.isPosted) {
      throw new BadRequestException('Journal entry is already posted');
    }

    // Validate balances
    await this.validateJournalBalance(id);

    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        isPosted: true,
        postedBy: dto.postedBy,
        postedAt: new Date(),
      },
    });
  }

  async reverseJournalEntry(tenantId: string, id: string, dto: ReverseJournalEntryDto) {
    const originalEntry = await this.prisma.journalEntry.findFirst({
      where: { id, tenantId },
      include: {
        lines: true,
        fiscalYear: true,
      },
    });

    if (!originalEntry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (!originalEntry.isPosted) {
      throw new BadRequestException('Cannot reverse an unposted journal entry');
    }

    if (originalEntry.isReversed) {
      throw new BadRequestException('Journal entry is already reversed');
    }

    // Get current period for reversal
    const period = await this.prisma.accountingPeriod.findFirst({
      where: {
        tenantId,
        fiscalYearId: originalEntry.fiscalYearId,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    if (!period) {
      throw new BadRequestException('No active accounting period for reversal');
    }

    // Create reversal entry
    const reversalEntry = await this.prisma.$transaction(async (trx) => {
      const reversal = await trx.journalEntry.create({
        data: {
          tenantId,
          fiscalYearId: originalEntry.fiscalYearId,
          periodId: period.id,
          entryNo: await this.generateJournalEntryNumber(tenantId, originalEntry.fiscalYear.name),
          entryDate: new Date(),
          referenceType: 'REVERSAL',
          referenceId: originalEntry.id,
          description: `REVERSAL: ${originalEntry.description}`,
          narration: dto.reason,
          isPosted: true,
          isReversed: false,
          reversalOfId: originalEntry.id,
          createdBy: dto.reversedBy,
          postedBy: dto.reversedBy,
          postedAt: new Date(),
        },
      });

      // Create reversal lines (swap debits and credits)
      let lineNo = 1;
      for (const line of originalEntry.lines) {
        await trx.journalEntryLine.create({
          data: {
            journalEntryId: reversal.id,
            tenantId,
            accountId: line.accountId,
            lineNo,
            description: `REVERSAL: ${line.description || ''}`,
            debitAmount: line.creditAmount,
            creditAmount: line.debitAmount,
            currency: line.currency,
          },
        });
        lineNo++;
      }

      // Mark original as reversed
      await trx.journalEntry.update({
        where: { id: originalEntry.id },
        data: { isReversed: true },
      });

      return reversal;
    });

    this.logger.log(`Reversed journal entry ${originalEntry.entryNo} with ${reversal.entryNo}`);

    return reversal;
  }

  async getTrialBalance(tenantId: string, fiscalYearId: string, periodId?: string) {
    // Get all posted journal entries
    const where: any = {
      tenantId,
      fiscalYearId,
      isPosted: true,
      isReversed: false,
    };

    if (periodId) {
      where.periodId = periodId;
    }

    const entries = await this.prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: true,
          },
        },
      },
    });

    // Calculate balances per account
    const accountBalances = new Map<string, { account: any; debit: number; credit: number }>();

    for (const entry of entries) {
      for (const line of entry.lines) {
        const accountId = line.accountId;
        if (!accountBalances.has(accountId)) {
          accountBalances.set(accountId, {
            account: line.account,
            debit: 0,
            credit: 0,
          });
        }

        const balance = accountBalances.get(accountId)!;
        balance.debit += Number(line.debitAmount);
        balance.credit += Number(line.creditAmount);
      }
    }

    // Calculate net balance per account
    const trialBalance = Array.from(accountBalances.values()).map(item => {
      const account = item.account;
      let netDebit = 0;
      let netCredit = 0;

      if (account.normalBalance === 'DEBIT') {
        netDebit = Math.max(0, item.debit - item.credit);
        netCredit = Math.max(0, item.credit - item.debit);
      } else {
        netCredit = Math.max(0, item.credit - item.debit);
        netDebit = Math.max(0, item.debit - item.credit);
      }

      return {
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        debit: netDebit,
        credit: netCredit,
      };
    });

    const totalDebits = trialBalance.reduce((sum, item) => sum + item.debit, 0);
    const totalCredits = trialBalance.reduce((sum, item) => sum + item.credit, 0);

    return {
      accounts: trialBalance,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  // ========== Helper Methods ==========

  private validateJournalEntryLines(lines: any[]) {
    if (!lines || lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least 2 lines');
    }

    // Check that each line has either debit OR credit, not both
    for (const line of lines) {
      if ((line.debitAmount > 0 && line.creditAmount > 0) || (line.debitAmount < 0 && line.creditAmount < 0)) {
        throw new BadRequestException('Each line must have either debit or credit, not both');
      }

      if (line.debitAmount <= 0 && line.creditAmount <= 0) {
        throw new BadRequestException('Each line must have a non-zero debit or credit amount');
      }
    }

    // Check total debits equal total credits
    const totalDebits = lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }
  }

  private async validateJournalBalance(entryId: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    const totalDebits = entry.lines.reduce((sum, line) => sum + Number(line.debitAmount), 0);
    const totalCredits = entry.lines.reduce((sum, line) => sum + Number(line.creditAmount), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }
  }

  private async generateJournalEntryNumber(tenantId: string, fiscalYear: string): Promise<string> {
    // Format: JE-2081/82-000001
    const prefix = `JE-${fiscalYear}`;

    // Get the last sequence number
    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: {
        tenantId,
        entryNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        entryNo: 'desc',
      },
    });

    let sequence = 1;
    if (lastEntry) {
      const lastSequence = parseInt(lastEntry.entryNo.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(6, '0')}`;
  }

  private async createStandardPeriods(tenantId: string, fiscalYearId: string, startDate: Date, endDate: Date) {
    const periods = [];
    const current = new Date(startDate);

    while (current < endDate) {
      const periodStart = new Date(current);
      const periodEnd = new Date(current);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      if (periodEnd > endDate) {
        periodEnd.setTime(endDate.getTime());
      }

      const periodName = this.getNepaliMonthName(periods.length + 1);

      const period = await this.prisma.accountingPeriod.create({
        data: {
          tenantId,
          fiscalYearId,
          periodName,
          startDate: periodStart,
          endDate: periodEnd,
        },
      });

      periods.push(period);
      current.setMonth(current.getMonth() + 1);
    }

    return periods;
  }

  private getNepaliMonthName(monthIndex: number): string {
    const nepaliMonths = [
      'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
      'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
    ];
    return nepaliMonths[monthIndex - 1] || `Month ${monthIndex}`;
  }

  private getStandardChartOfAccounts() {
    return [
      // ASSETS (1000-1999)
      { code: '1111', name: 'Petty Cash', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1112', name: 'Bank Account - Primary', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1114', name: 'eSewa/Khalti Settlement Account', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1121', name: 'Trade Receivables', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT, isControl: true },
      { code: '1123', name: 'VAT Receivable (Input Tax Credit)', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1124', name: 'TDS Receivable', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1131', name: 'Raw Materials', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1132', name: 'Work-In-Progress', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1133', name: 'Finished Goods', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1211', name: 'Equipment', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1212', name: 'Furniture & Fixtures', type: AccountType.ASSET, normalBalance: NormalBalance.DEBIT },
      { code: '1220', name: 'Accumulated Depreciation', type: AccountType.ASSET, normalBalance: NormalBalance.CREDIT },

      // LIABILITIES (2000-2999)
      { code: '2110', name: 'Accounts Payable - Trade', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT, isControl: true },
      { code: '2120', name: 'Advance from Customers', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
      { code: '2131', name: 'Deferred Subscription Revenue', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
      { code: '2132', name: 'Deferred Membership Revenue', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
      { code: '2141', name: 'VAT Payable (Output Tax)', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
      { code: '2142', name: 'TDS Payable', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },
      { code: '2150', name: 'Salary & Wages Payable', type: AccountType.LIABILITY, normalBalance: NormalBalance.CREDIT },

      // EQUITY (3000-3999)
      { code: '3100', name: "Owner's Capital / Share Capital", type: AccountType.EQUITY, normalBalance: NormalBalance.CREDIT },
      { code: '3200', name: 'Retained Earnings', type: AccountType.EQUITY, normalBalance: NormalBalance.CREDIT },
      { code: '3300', name: 'Current Year Profit/Loss', type: AccountType.EQUITY, normalBalance: NormalBalance.CREDIT },

      // REVENUE (4000-4999)
      { code: '4110', name: 'Membership Revenue (Monthly)', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT },
      { code: '4111', name: 'Membership Revenue (Annual - Recognized)', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT },
      { code: '4120', name: 'Personal Training Revenue', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT },
      { code: '4140', name: 'Tailoring Revenue', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT },
      { code: '4150', name: 'Product Sales Revenue', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT },
      { code: '4160', name: 'Subscription Revenue (Dexo Platform)', type: AccountType.REVENUE, normalBalance: NormalBalance.CREDIT },
      { code: '5310', name: 'Sales Returns & Allowances', type: AccountType.REVENUE, normalBalance: NormalBalance.DEBIT },

      // COGS (5000-5999)
      { code: '5110', name: 'Trainer Wages / Commission', type: AccountType.COGS, normalBalance: NormalBalance.DEBIT },
      { code: '5120', name: 'Stitcher / Tailor Labour Cost', type: AccountType.COGS, normalBalance: NormalBalance.DEBIT },
      { code: '5210', name: 'Cost of Goods Sold - Products', type: AccountType.COGS, normalBalance: NormalBalance.DEBIT },
      { code: '5220', name: 'Raw Material Consumed', type: AccountType.COGS, normalBalance: NormalBalance.DEBIT },

      // EXPENSES (6000-6999)
      { code: '6110', name: 'Salaries & Wages', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '6120', name: 'Staff Benefits', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '6210', name: 'Rent Expense', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '6220', name: 'Utilities', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '6310', name: 'Software Subscription - Dexo', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '6320', name: 'Internet & Communications', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '6410', name: 'Advertising', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '6510', name: 'Depreciation - Equipment', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '6610', name: 'Bank Charges', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '6620', name: 'Interest Expense', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
      { code: '6630', name: 'Payment Gateway Fees', type: AccountType.EXPENSE, normalBalance: NormalBalance.DEBIT },
    ];
  }
}
