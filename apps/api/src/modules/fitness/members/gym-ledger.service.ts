import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

/**
 * GymLedgerService — bridges fitness-domain transactions into the double-entry
 * general ledger so a gym admin can produce a real Trial Balance, P&L and
 * Balance Sheet.
 *
 * The finance reports (packages/finance) read POSTED journal entries. Until now
 * nothing in the fitness module posted anything, so those reports were empty for
 * a gym. This service closes that gap.
 *
 * Design notes:
 *  - Best-effort: a missing chart-of-accounts / fiscal year must NEVER break a
 *    member's payment. We log and skip; the admin can post manually later.
 *  - Idempotent: keyed on (referenceType, referenceId) so retries don't double-post.
 *  - Entries are created already POSTED (isPosted = true) because trial balance
 *    only counts posted lines.
 */
@Injectable()
export class GymLedgerService {
  private readonly logger = new Logger(GymLedgerService.name);

  constructor(private prisma: PrismaService) {}

  /** DR Cash/Bank · CR Membership Revenue · CR VAT Payable (if any). */
  async postMembershipRevenue(
    tenantId: string,
    membership: { id: string; amountPaid?: any; paymentMethod?: string | null },
    plan: { name?: string; priceNpr?: any; totalWithVat?: any; vatPercent?: any },
    actorUserId?: string,
  ): Promise<void> {
    try {
      if (await this.alreadyPosted(tenantId, 'MEMBERSHIP_PAYMENT', membership.id)) return;

      const total = Number(membership.amountPaid ?? plan?.totalWithVat ?? 0);
      if (!(total > 0)) return;
      const base = Number(plan?.priceNpr ?? total);
      const vat = Math.max(0, +(total - base).toFixed(2));

      const cashCode = String(membership.paymentMethod || '').toUpperCase() === 'CASH' ? '1010' : '1020';
      const codes = [cashCode, '4030', ...(vat > 0 ? ['2301'] : [])];
      const acc = await this.resolveAccounts(tenantId, codes);
      if (!acc[cashCode] || !acc['4030']) {
        this.logger.warn(`[${tenantId}] membership ${membership.id}: chart of accounts not set up — skipping GL post`);
        return;
      }

      const lines = [
        { accountId: acc[cashCode], debitAmount: total, creditAmount: 0, description: `Membership: ${plan?.name || ''}`.trim() },
        { accountId: acc['4030'], debitAmount: 0, creditAmount: base, description: 'Membership revenue' },
        ...(vat > 0 ? [{ accountId: acc['2301'], debitAmount: 0, creditAmount: vat, description: 'Output VAT 13%' }] : []),
      ];

      await this.postEntry(tenantId, {
        entryDate: new Date(),
        referenceType: 'MEMBERSHIP_PAYMENT',
        referenceId: membership.id,
        description: `Membership payment — ${plan?.name || 'plan'}`,
        narration: `Auto-posted from fitness membership ${membership.id}`,
        lines,
        actorUserId,
      });
      this.logger.log(`[${tenantId}] posted membership revenue for ${membership.id} (NPR ${total})`);
    } catch (e: any) {
      // Never fail the payment because of accounting.
      this.logger.error(`[${tenantId}] failed to post membership revenue: ${e?.message}`);
    }
  }

  /** Record an operating expense: DR expense account · CR Cash/Bank. */
  async recordExpense(
    tenantId: string,
    dto: { accountCode: string; amount: number; paymentMethod?: string; description?: string; date?: string },
    actorUserId?: string,
  ) {
    const amount = Number(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Amount must be greater than zero');
    const cashCode = String(dto.paymentMethod || '').toUpperCase() === 'BANK' ? '1020' : '1010';
    const acc = await this.resolveAccounts(tenantId, [dto.accountCode, cashCode]);
    if (!acc[dto.accountCode]) throw new BadRequestException(`Expense account ${dto.accountCode} not found. Set up your chart of accounts first.`);
    if (!acc[cashCode]) throw new BadRequestException('Cash/Bank account not found. Set up your chart of accounts first.');

    return this.postEntry(tenantId, {
      entryDate: dto.date ? new Date(dto.date) : new Date(),
      referenceType: 'EXPENSE',
      referenceId: undefined,
      description: dto.description || 'Operating expense',
      narration: dto.description,
      lines: [
        { accountId: acc[dto.accountCode], debitAmount: amount, creditAmount: 0, description: dto.description || 'Expense' },
        { accountId: acc[cashCode], debitAmount: 0, creditAmount: amount, description: 'Cash/Bank out' },
      ],
      actorUserId,
    });
  }

  /* ---------------- internals ---------------- */

  private async alreadyPosted(tenantId: string, referenceType: string, referenceId: string) {
    const existing = await this.prisma.journalEntry.findFirst({ where: { tenantId, referenceType, referenceId } });
    return !!existing;
  }

  private async resolveAccounts(tenantId: string, codes: string[]): Promise<Record<string, string>> {
    const rows = await this.prisma.chartOfAccount.findMany({
      where: { tenantId, accountCode: { in: codes } },
      select: { id: true, accountCode: true },
    });
    return rows.reduce((m, r) => { m[r.accountCode] = r.id; return m; }, {} as Record<string, string>);
  }

  private async postEntry(
    tenantId: string,
    e: {
      entryDate: Date;
      referenceType: string;
      referenceId?: string;
      description: string;
      narration?: string;
      lines: { accountId: string; debitAmount: number; creditAmount: number; description?: string }[];
      actorUserId?: string;
    },
  ) {
    // Balance guard
    const debit = e.lines.reduce((s, l) => s + Number(l.debitAmount || 0), 0);
    const credit = e.lines.reduce((s, l) => s + Number(l.creditAmount || 0), 0);
    if (Math.abs(debit - credit) > 0.01) throw new BadRequestException(`Unbalanced entry: DR ${debit} ≠ CR ${credit}`);

    const fy = await this.prisma.fiscalYear.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { startDate: 'desc' },
    });
    if (!fy) throw new BadRequestException('No active fiscal year. Set up accounting first.');

    const period = await this.prisma.accountingPeriod.findFirst({
      where: { tenantId, fiscalYearId: fy.id, startDate: { lte: e.entryDate }, endDate: { gte: e.entryDate } },
    });
    if (!period) throw new BadRequestException('No open accounting period for this date.');

    const count = await this.prisma.journalEntry.count({ where: { tenantId, fiscalYearId: fy.id } });
    const entryNo = `JE-${fy.name}-${String(count + 1).padStart(6, '0')}`;
    const createdBy = e.actorUserId || tenantId;

    return this.prisma.$transaction(async (trx) => {
      const entry = await trx.journalEntry.create({
        data: {
          tenantId,
          fiscalYearId: fy.id,
          periodId: period.id,
          entryNo,
          entryDate: e.entryDate,
          referenceType: e.referenceType,
          referenceId: e.referenceId,
          description: e.description,
          narration: e.narration,
          isPosted: true,
          postedBy: createdBy,
          postedAt: new Date(),
          createdBy,
        },
      });
      let lineNo = 1;
      for (const l of e.lines) {
        await trx.journalEntryLine.create({
          data: {
            journalEntryId: entry.id,
            tenantId,
            accountId: l.accountId,
            lineNo: lineNo++,
            description: l.description,
            debitAmount: l.debitAmount || 0,
            creditAmount: l.creditAmount || 0,
            currency: 'NPR',
          },
        });
      }
      return entry;
    });
  }
}
