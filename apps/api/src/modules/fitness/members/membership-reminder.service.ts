import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService, TenantMailService } from '@dexo/shared';

/**
 * MembershipReminderService — daily cron that reminds members about
 * upcoming or already-expired memberships.
 *
 * Milestones: 7 days out, 3 days out, 1 day out, and EXPIRED (already past
 * endDate, still ACTIVE in our system, not auto-renewed).
 *
 * Sending: reuses TenantMailService (the same per-tenant SMTP sender that
 * packages/notification's NotificationService.sendAnnouncement() calls) so
 * each member gets an individually addressed email rather than a broadcast
 * to the whole tenant.
 *
 * Idempotency: each (membershipId, milestone) pair is recorded in
 * ReminderLog once sent, so re-running the job (or a retry) never sends the
 * same reminder twice — mirrors the alreadyPosted() pattern used by
 * GymLedgerService for journal entries.
 */
@Injectable()
export class MembershipReminderService {
  private readonly logger = new Logger(MembershipReminderService.name);

  constructor(
    private prisma: PrismaService,
    private tenantMail: TenantMailService,
  ) {}

  // Runs once a day at 08:00 server time.
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendMembershipReminders() {
    this.logger.log('Running daily membership reminder job');

    const milestones: { key: string; label: string; daysFromNow: number }[] = [
      { key: '7_DAYS', label: 'expires in 7 days', daysFromNow: 7 },
      { key: '3_DAYS', label: 'expires in 3 days', daysFromNow: 3 },
      { key: '1_DAY', label: 'expires tomorrow', daysFromNow: 1 },
    ];

    let totalSent = 0;
    for (const milestone of milestones) {
      totalSent += await this.processMilestone(milestone.key, milestone.label, milestone.daysFromNow);
    }
    totalSent += await this.processExpired();

    this.logger.log(`Membership reminder job complete: ${totalSent} reminder(s) sent`);
    return { sent: totalSent };
  }

  private dayRange(daysFromNow: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + daysFromNow);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private async processMilestone(milestoneKey: string, label: string, daysFromNow: number): Promise<number> {
    const { start, end } = this.dayRange(daysFromNow);

    const memberships = await this.prisma.membership.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: start, lt: end },
      },
      include: {
        member: { include: { user: { select: { firstName: true, email: true } } } },
        plan: { select: { name: true } },
      },
    });

    let sent = 0;
    for (const membership of memberships) {
      if (await this.alreadySent(membership.id, milestoneKey)) continue;

      const email = membership.member?.user?.email;
      const firstName = membership.member?.user?.firstName || 'there';
      if (!email) {
        await this.markSent(membership.tenantId, membership.id, milestoneKey);
        continue;
      }

      const renewalNote = membership.autoRenew ? ' Your plan is set to auto-renew.' : '';
      const message = `Hi ${firstName}, your "${membership.plan?.name || 'membership'}" plan ${label} on ${membership.endDate.toDateString()}.${renewalNote}`;
      const result = await this.tenantMail
        .send(membership.tenantId, {
          to: email,
          subject: `Membership ${label}`,
          text: message,
          html: `<p>${message}</p>`,
        })
        .catch((err) => ({ success: false, error: err?.message } as const));
      if (!result.success) {
        this.logger.error(`Failed to send ${milestoneKey} reminder for membership ${membership.id}: ${(result as any).error}`);
      }

      await this.markSent(membership.tenantId, membership.id, milestoneKey);
      sent++;
    }
    return sent;
  }

  private async processExpired(): Promise<number> {
    const now = new Date();
    const memberships = await this.prisma.membership.findMany({
      where: {
        status: 'ACTIVE',
        autoRenew: false,
        endDate: { lt: now },
      },
      include: {
        member: { include: { user: { select: { firstName: true, email: true } } } },
        plan: { select: { name: true } },
      },
    });

    let sent = 0;
    for (const membership of memberships) {
      if (await this.alreadySent(membership.id, 'EXPIRED')) continue;

      const email = membership.member?.user?.email;
      const firstName = membership.member?.user?.firstName || 'there';
      if (!email) {
        await this.markSent(membership.tenantId, membership.id, 'EXPIRED');
        continue;
      }

      const message = `Hi ${firstName}, your "${membership.plan?.name || 'membership'}" plan expired on ${membership.endDate.toDateString()}. Renew now to keep access.`;
      const result = await this.tenantMail
        .send(membership.tenantId, {
          to: email,
          subject: 'Membership expired',
          text: message,
          html: `<p>${message}</p>`,
        })
        .catch((err) => ({ success: false, error: err?.message } as const));
      if (!result.success) {
        this.logger.error(`Failed to send EXPIRED reminder for membership ${membership.id}: ${(result as any).error}`);
      }

      await this.markSent(membership.tenantId, membership.id, 'EXPIRED');
      sent++;
    }
    return sent;
  }

  private async alreadySent(membershipId: string, milestone: string): Promise<boolean> {
    const existing = await this.prisma.reminderLog.findUnique({
      where: { membershipId_milestone: { membershipId, milestone } },
    });
    return !!existing;
  }

  private async markSent(tenantId: string, membershipId: string, milestone: string): Promise<void> {
    await this.prisma.reminderLog
      .create({ data: { tenantId, membershipId, milestone } })
      // Unique constraint guards against a race between two concurrent runs.
      .catch(() => undefined);
  }
}
