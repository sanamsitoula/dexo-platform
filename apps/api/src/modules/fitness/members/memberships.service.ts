import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { randomBytes } from 'crypto';
import { GymLedgerService } from './gym-ledger.service';
import { AppNotificationsService } from './app-notifications.service';

@Injectable()
export class MembershipsService {
  constructor(
    private prisma: PrismaService,
    private ledger: GymLedgerService,
    private appNotifications: AppNotificationsService,
  ) {}

  async findAll(tenantId: string, params?: { memberId?: string; status?: string; branchId?: string; page?: number; limit?: number }) {
    const where: any = { tenantId };
    if (params?.memberId) where.memberId = params.memberId;
    if (params?.status) where.status = params.status;
    if (params?.branchId) where.member = { branchId: params.branchId };
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          member: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
          plan: true,
        },
      }),
      this.prisma.membership.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const m = await this.prisma.membership.findFirst({
      where: { id, tenantId },
      include: { member: { include: { user: true } }, plan: true },
    });
    if (!m) throw new NotFoundException('Membership not found');
    return m;
  }

  async findByQrCode(qrCode: string) {
    const m = await this.prisma.membership.findUnique({
      where: { qrCode },
      include: { member: { include: { user: true } }, plan: true },
    });
    if (!m) throw new NotFoundException('Invalid QR code');
    return m;
  }

  /** Payment history for a member — returns their membership payment records. */
  async getPaymentHistory(tenantId: string, memberId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { tenantId, memberId },
      orderBy: { startDate: 'desc' },
      include: {
        plan: { select: { name: true, priceNpr: true, durationDays: true } },
      },
    });
    const totalPaid = memberships.reduce((s, m: any) => s + Number(m.amountPaid || 0), 0);
    return { memberId, totalPaid, payments: memberships.map((m: any) => ({
      membershipId: m.id,
      date: m.startDate,
      plan: m.plan?.name,
      amount: m.plan?.price,
      amountPaid: m.amountPaid,
      paymentMethod: m.paymentMethod,
      paymentRef: m.paymentRef,
      status: m.status,
      period: { start: m.startDate, end: m.endDate },
    })) };
  }

  async create(tenantId: string, dto: any) {
    if (!dto.memberId || !dto.planId) throw new BadRequestException('memberId and planId are required');
    const plan = await this.prisma.membershipPlan.findFirst({ where: { id: dto.planId, tenantId } });
    if (!plan) throw new NotFoundException('Plan not found');
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    return this.prisma.membership.create({
      data: {
        tenantId,
        memberId: dto.memberId,
        planId: dto.planId,
        startDate,
        endDate,
        amountPaid: dto.amountPaid ?? plan.totalWithVat,
        paymentMethod: dto.paymentMethod,
        paymentRef: dto.paymentRef,
        autoRenew: dto.autoRenew ?? false,
        renewBeforeDays: dto.renewBeforeDays ?? 7,
        status: dto.status ?? 'PENDING',
        qrCode: this.generateQrCode(),
      },
    });
  }

  async activateOnPayment(tenantId: string, id: string, paymentRef: string, paymentMethod: string) {
    const existing = await this.findOne(tenantId, id);
    const updated = await this.prisma.membership.update({
      where: { id },
      data: { status: 'ACTIVE', paymentRef, paymentMethod, member: { update: { isVerified: true, status: 'ACTIVE' } } },
      include: { plan: true },
    });
    // Post membership revenue to the general ledger (best-effort; never blocks payment).
    await this.ledger.postMembershipRevenue(tenantId, updated as any, (updated as any).plan || existing.plan, undefined);
    return updated;
  }

  async renew(tenantId: string, id: string) {
    const current = await this.findOne(tenantId, id);
    const plan = current.plan;
    const newStart = new Date(Math.max(Date.now(), new Date(current.endDate).getTime()));
    const newEnd = new Date(newStart.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    return this.prisma.membership.create({
      data: {
        tenantId,
        memberId: current.memberId,
        planId: plan.id,
        startDate: newStart,
        endDate: newEnd,
        amountPaid: plan.totalWithVat,
        status: 'PENDING',
        qrCode: this.generateQrCode(),
      },
    });
  }

  /**
   * Admin edit of a membership's period. Lets the tenant admin set the
   * from/to dates directly (e.g. correcting a wrongly entered start date).
   * If the new endDate is in the future and the membership had EXPIRED,
   * it comes back to ACTIVE; if the new endDate is already past on an
   * ACTIVE membership, it flips to EXPIRED immediately rather than waiting
   * for the nightly sweep.
   */
  async update(tenantId: string, id: string, dto: { startDate?: string; endDate?: string; autoRenew?: boolean; renewBeforeDays?: number }) {
    const current = await this.findOne(tenantId, id);
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date(current.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : new Date(current.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new BadRequestException('Invalid date');
    if (endDate <= startDate) throw new BadRequestException('endDate must be after startDate');

    const data: any = { startDate, endDate };
    if (dto.autoRenew !== undefined) data.autoRenew = dto.autoRenew;
    if (dto.renewBeforeDays !== undefined) data.renewBeforeDays = dto.renewBeforeDays;
    const now = new Date();
    if (current.status === 'EXPIRED' && endDate > now) data.status = 'ACTIVE';
    if (current.status === 'ACTIVE' && endDate <= now) data.status = 'EXPIRED';

    const updated = await this.prisma.membership.update({
      where: { id },
      data,
      include: { plan: true, member: { select: { userId: true } } },
    });
    await this.notifyPeriodChange(updated, 'updated').catch(() => undefined);
    return updated;
  }

  /**
   * Extend a membership by N days at no extra charge (e.g. goodwill +15
   * days on the same plan/price). Reactivates an EXPIRED membership when
   * the new endDate lands in the future.
   */
  async extend(tenantId: string, id: string, days: number, reason?: string) {
    if (!Number.isFinite(days) || days <= 0 || days > 366) throw new BadRequestException('days must be between 1 and 366');
    const current = await this.findOne(tenantId, id);
    if (current.status === 'CANCELLED') throw new BadRequestException('Cannot extend a cancelled membership');

    const newEnd = new Date(new Date(current.endDate).getTime() + days * 24 * 60 * 60 * 1000);
    const data: any = { endDate: newEnd };
    if (current.status === 'EXPIRED' && newEnd > new Date()) data.status = 'ACTIVE';

    const updated = await this.prisma.membership.update({
      where: { id },
      data,
      include: { plan: true, member: { select: { userId: true } } },
    });
    await this.notifyPeriodChange(updated, `extended by ${days} day${days === 1 ? '' : 's'}`, reason).catch(() => undefined);
    return updated;
  }

  /** In-app notifications after an admin changed a membership period (best-effort). */
  private async notifyPeriodChange(
    m: { id: string; tenantId: string; memberId: string; endDate: Date; plan?: { name: string } | null; member?: { userId: string | null } | null },
    action: string,
    reason?: string,
  ) {
    const planName = m.plan?.name || 'membership';
    const until = new Date(m.endDate).toDateString();
    const suffix = reason ? ` (${reason})` : '';
    if (m.member?.userId) {
      await this.appNotifications.create({
        tenantId: m.tenantId,
        audience: 'MEMBER',
        userId: m.member.userId,
        type: 'MEMBERSHIP_EXTENDED',
        title: 'Membership updated',
        message: `Your "${planName}" plan was ${action}. It is now valid until ${until}.${suffix}`,
        data: { membershipId: m.id, memberId: m.memberId, endDate: m.endDate },
      });
    }
    await this.appNotifications.create({
      tenantId: m.tenantId,
      audience: 'TENANT_ADMIN',
      type: 'MEMBERSHIP_EXTENDED',
      title: 'Membership updated',
      message: `"${planName}" for member ${m.memberId.slice(0, 8)} ${action}; valid until ${until}.${suffix}`,
      data: { membershipId: m.id, memberId: m.memberId, endDate: m.endDate },
    });
  }

  async freeze(tenantId: string, id: string, days: number, reason: string) {
    const m = await this.findOne(tenantId, id);
    if (!m) throw new NotFoundException('Membership not found');
    if (m.isFrozen) throw new BadRequestException('Membership is already frozen');
    if (m.status !== 'ACTIVE') throw new BadRequestException('Only active memberships can be frozen');
    const plan = m.plan;
    if (!plan.freezeAllowed) throw new BadRequestException('This plan does not allow freezing');
    if (days > plan.maxFreezeDays) throw new BadRequestException(`Freeze limit is ${plan.maxFreezeDays} days`);
    return this.prisma.membership.update({
      where: { id },
      data: {
        isFrozen: true,
        frozenAt: new Date(),
        frozenDays: days,
        freezeReason: reason,
        status: 'FROZEN',
        endDate: new Date(new Date(m.endDate).getTime() + days * 24 * 60 * 60 * 1000),
      },
    });
  }

  async unfreeze(tenantId: string, id: string) {
    const m = await this.findOne(tenantId, id);
    if (!m.isFrozen) throw new BadRequestException('Membership is not frozen');
    return this.prisma.membership.update({
      where: { id },
      data: { isFrozen: false, status: 'ACTIVE' },
    });
  }

  async cancel(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.membership.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async getExpiring(tenantId: string, days = 7) {
    const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.prisma.membership.findMany({
      where: { tenantId, status: 'ACTIVE', endDate: { lte: future, gte: new Date() } },
      include: { member: { include: { user: true } }, plan: true },
    });
  }

  private generateQrCode(): string {
    return 'FITNEPAL-' + randomBytes(12).toString('hex').toUpperCase();
  }
}
