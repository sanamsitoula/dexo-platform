import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@dexo/shared';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Fitness finance automation (REMAINING_WORK item 16).
 *
 * Deferred membership revenue recognition: memberships are paid up-front but
 * earned over their duration. Once a month this cron posts, per membership
 * that overlapped the previous calendar month:
 *
 *   DR Deferred Revenue (2400) / CR Membership Revenue (4030)
 *   amount = amountPaid × overlap-days ÷ total-membership-days
 *
 * Idempotent: one JE per (membership, month) keyed on referenceType
 * MEMBERSHIP_REV + referenceId + the month tag in the description. Skips
 * safely when the chart of accounts or an open period is missing, mirroring
 * GlPostingService.
 *
 * NOT automated here (blocked on schema, see REMAINING_WORK):
 *  - PT per-session revenue — TrainingSession has no price/rate field.
 *  - Depreciation postings — no FixedAsset register model exists.
 */
@Injectable()
export class FitnessFinanceService {
  private readonly logger = new Logger(FitnessFinanceService.name);

  constructor(private prisma: PrismaService) {}

  /** 1st of each month, 04:00 — recognize the previous month's revenue. */
  @Cron('0 4 1 * *')
  async monthlyRevenueRecognition() {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); // last day of prev month
    const monthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth(), 1);
    const result = await this.recognizeMembershipRevenue(monthStart, monthEnd);
    this.logger.log(
      `Membership revenue recognition for ${monthStart.toISOString().slice(0, 7)}: posted=${result.posted} skipped=${result.skipped}`,
    );
  }

  /** Recognize revenue for all tenants' memberships overlapping [monthStart, monthEnd]. */
  async recognizeMembershipRevenue(monthStart: Date, monthEnd: Date) {
    const monthKey = monthStart.toISOString().slice(0, 7); // e.g. 2026-06
    const memberships = await this.prisma.membership.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRED'] },
        amountPaid: { gt: 0 },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: { id: true, tenantId: true, amountPaid: true, startDate: true, endDate: true },
    });

    let posted = 0;
    let skipped = 0;
    for (const m of memberships) {
      try {
        const ok = await this.postMembershipSlice(m, monthStart, monthEnd, monthKey);
        ok ? posted++ : skipped++;
      } catch (err: any) {
        skipped++;
        this.logger.warn(`Revenue recognition failed for membership ${m.id}: ${err?.message}`);
      }
    }
    return { posted, skipped };
  }

  private async postMembershipSlice(
    m: { id: string; tenantId: string; amountPaid: Decimal; startDate: Date; endDate: Date },
    monthStart: Date,
    monthEnd: Date,
    monthKey: string,
  ): Promise<boolean> {
    // Idempotency: one entry per membership per month.
    const existing = await this.prisma.journalEntry.findFirst({
      where: {
        tenantId: m.tenantId,
        referenceType: 'MEMBERSHIP_REV',
        referenceId: m.id,
        description: { contains: monthKey },
      },
      select: { id: true },
    });
    if (existing) return false;

    const dayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.max(1, Math.round((m.endDate.getTime() - m.startDate.getTime()) / dayMs));
    const overlapStart = m.startDate > monthStart ? m.startDate : monthStart;
    const overlapEnd = m.endDate < monthEnd ? m.endDate : monthEnd;
    const overlapDays = Math.max(0, Math.round((overlapEnd.getTime() - overlapStart.getTime()) / dayMs) + 1);
    if (overlapDays === 0) return false;

    const amount = new Decimal(m.amountPaid).mul(overlapDays).div(totalDays).toDecimalPlaces(2);
    if (amount.lte(0)) return false;

    const [deferred, revenue] = await Promise.all([
      this.prisma.chartOfAccount.findFirst({
        where: { tenantId: m.tenantId, accountCode: '2400', isActive: true },
        select: { id: true },
      }),
      this.prisma.chartOfAccount.findFirst({
        where: { tenantId: m.tenantId, accountCode: '4030', isActive: true },
        select: { id: true },
      }),
    ]);
    if (!deferred || !revenue) return false; // chart not seeded for this tenant

    const period = await this.prisma.accountingPeriod.findFirst({
      where: { tenantId: m.tenantId, isClosed: false, startDate: { lte: monthEnd }, endDate: { gte: monthEnd } },
      select: { id: true, fiscalYearId: true },
    });
    if (!period) return false;

    const prefix = `MRR${monthKey.replace('-', '')}`;
    const count = await this.prisma.journalEntry.count({
      where: { tenantId: m.tenantId, entryNo: { startsWith: prefix } },
    });

    await this.prisma.journalEntry.create({
      data: {
        tenantId: m.tenantId,
        fiscalYearId: period.fiscalYearId,
        periodId: period.id,
        entryNo: `${prefix}-${String(count + 1).padStart(4, '0')}`,
        entryDate: monthEnd,
        referenceType: 'MEMBERSHIP_REV',
        referenceId: m.id,
        description: `Membership revenue recognized for ${monthKey} (membership ${m.id})`,
        isPosted: true,
        postedBy: 'system',
        postedAt: new Date(),
        createdBy: 'system',
        lines: {
          create: [
            {
              tenantId: m.tenantId,
              accountId: deferred.id,
              lineNo: 1,
              description: `Deferred revenue released — ${monthKey}`,
              debitAmount: amount.toString(),
              creditAmount: '0',
              currency: 'NPR',
            },
            {
              tenantId: m.tenantId,
              accountId: revenue.id,
              lineNo: 2,
              description: `Membership revenue — ${monthKey}`,
              debitAmount: '0',
              creditAmount: amount.toString(),
              currency: 'NPR',
            },
          ],
        },
      },
    });
    return true;
  }
}
