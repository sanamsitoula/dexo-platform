import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class CustomerBadgesService {
  constructor(private prisma: PrismaService) {}

  async findMemberBadges(tenantId: string, memberId: string) {
    return this.prisma.customerBadge.findMany({
      where: { tenantId, memberId },
      orderBy: { earnedAt: 'desc' },
      include: { badge: true },
    });
  }

  async award(tenantId: string, dto: any) {
    if (!dto.memberId || !dto.badgeId) throw new BadRequestException('memberId and badgeId required');
    const existing = await this.prisma.customerBadge.findFirst({
      where: { tenantId, memberId: dto.memberId, badgeId: dto.badgeId },
    });
    if (existing) throw new ConflictException('Badge already awarded');
    return this.prisma.customerBadge.create({
      data: { tenantId, memberId: dto.memberId, badgeId: dto.badgeId },
    });
  }

  async checkAndAwardStreak(tenantId: string, memberId: string) {
    const logs = await this.prisma.workoutLog.findMany({
      where: { tenantId, memberId, status: 'COMPLETED' },
      orderBy: { workoutDate: 'desc' },
      select: { workoutDate: true },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      if (logs.some((l) => l.workoutDate.toDateString() === d.toDateString())) streak++;
      else if (i > 0) break;
    }
    const awardedBadges: string[] = [];
    const streakThresholds: Array<[number, string]> = [
      [7, '7-Day Streak'],
      [30, '30-Day Streak'],
      [100, '100-Day Streak'],
    ];
    for (const [threshold, name] of streakThresholds) {
      if (streak >= threshold) {
        const badge = await this.prisma.badge.findFirst({ where: { tenantId, name, isActive: true } });
        if (badge) {
          const exists = await this.prisma.customerBadge.findFirst({ where: { tenantId, memberId, badgeId: badge.id } });
          if (!exists) {
            await this.prisma.customerBadge.create({ data: { tenantId, memberId, badgeId: badge.id } });
            awardedBadges.push(name);
          }
        }
      }
    }
    return { streak, awardedBadges };
  }

  async checkAndAwardMilestones(tenantId: string, memberId: string) {
    const count = await this.prisma.workoutLog.count({
      where: { tenantId, memberId, status: 'COMPLETED' },
    });
    const awardedBadges: string[] = [];
    const milestones: Array<[number, string]> = [
      [10, '10 Workouts'],
      [50, '50 Workouts'],
      [100, '100 Workouts'],
      [500, '500 Workouts'],
    ];
    for (const [threshold, name] of milestones) {
      if (count >= threshold) {
        const badge = await this.prisma.badge.findFirst({ where: { tenantId, name, isActive: true } });
        if (badge) {
          const exists = await this.prisma.customerBadge.findFirst({ where: { tenantId, memberId, badgeId: badge.id } });
          if (!exists) {
            await this.prisma.customerBadge.create({ data: { tenantId, memberId, badgeId: badge.id } });
            awardedBadges.push(name);
          }
        }
      }
    }
    return { count, awardedBadges };
  }

  async revoke(tenantId: string, id: string) {
    const b = await this.prisma.customerBadge.findFirst({ where: { id, tenantId } });
    if (!b) throw new NotFoundException('Customer badge not found');
    return this.prisma.customerBadge.delete({ where: { id } });
  }
}
