import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class ReferralsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { referrerId?: string; status?: string }) {
    const where: any = { tenantId };
    if (params?.referrerId) where.referrerId = params.referrerId;
    if (params?.status) where.status = params.status;
    return this.prisma.referral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        referrer: { include: { user: { select: { firstName: true, lastName: true } } } },
        referee: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const r = await this.prisma.referral.findFirst({
      where: { id, tenantId },
      include: { referrer: { include: { user: true } }, referee: { include: { user: true } } },
    });
    if (!r) throw new NotFoundException('Referral not found');
    return r;
  }

  async findByCode(referralCode: string) {
    const r = await this.prisma.referral.findUnique({
      where: { referralCode },
      include: { referrer: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });
    if (!r) throw new NotFoundException('Invalid referral code');
    return r;
  }

  async create(tenantId: string, dto: any) {
    if (!dto.referrerId) throw new BadRequestException('referrerId required');
    return this.prisma.referral.create({
      data: {
        tenantId,
        referrerId: dto.referrerId,
        referralCode: this.generateCode(),
        refereeEmail: dto.refereeEmail,
        refereePhone: dto.refereePhone,
        rewardType: dto.rewardType ?? 'DISCOUNT',
        rewardValue: dto.rewardValue ?? 500,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async redeemCode(tenantId: string, referralCode: string, refereeId: string) {
    const r = await this.findByCode(referralCode);
    if (r.status !== 'PENDING') throw new BadRequestException('Code already used or expired');
    if (r.expiresAt && r.expiresAt < new Date()) throw new BadRequestException('Code expired');
    return this.prisma.referral.update({
      where: { id: r.id },
      data: { refereeId, status: 'ACCEPTED' },
    });
  }

  async completeReferral(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.referral.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  async getMemberStats(tenantId: string, memberId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { tenantId, referrerId: memberId },
    });
    const totalInvites = referrals.length;
    const completed = referrals.filter((r) => r.status === 'COMPLETED').length;
    const pending = referrals.filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED').length;
    const totalReward = referrals
      .filter((r) => r.status === 'COMPLETED')
      .reduce((s, r) => s + Number(r.rewardValue ?? 0), 0);
    return { totalInvites, completed, pending, totalReward };
  }

  private generateCode(): string {
    return 'FITNEPAL-' + randomBytes(4).toString('hex').toUpperCase();
  }
}
