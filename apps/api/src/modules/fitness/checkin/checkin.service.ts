import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class CheckinService {
  constructor(private prisma: PrismaService) {}

  async checkInByQr(tenantId: string, qrCode: string, branchId?: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { qrCode },
      include: { member: { include: { user: true } }, plan: true },
    });
    if (!membership) throw new NotFoundException('Invalid QR code');
    if (membership.tenantId !== tenantId) throw new BadRequestException('QR code does not belong to this tenant');
    if (membership.status !== 'ACTIVE') throw new BadRequestException(`Membership is ${membership.status}`);
    if (membership.isFrozen) throw new BadRequestException('Membership is frozen');
    if (new Date(membership.endDate) < new Date()) throw new BadRequestException('Membership expired');
    const existing = await this.prisma.attendance.findFirst({
      where: {
        memberId: membership.memberId,
        checkOutTime: null,
        checkInTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (existing) {
      return { attendance: existing, message: 'Already checked in', membership };
    }
    let resolvedBranchId = branchId;
    if (!resolvedBranchId) {
      const memberBranch = await this.prisma.member.findUnique({ where: { id: membership.memberId }, select: { branchId: true } });
      resolvedBranchId = memberBranch?.branchId ?? undefined;
    }
    if (!resolvedBranchId) {
      const hqBranch = await this.prisma.branch.findFirst({ where: { tenantId, isHeadquarters: true } });
      resolvedBranchId = hqBranch?.id;
    }
    if (!resolvedBranchId) {
      const anyBranch = await this.prisma.branch.findFirst({ where: { tenantId } });
      resolvedBranchId = anyBranch?.id;
    }
    if (!resolvedBranchId) throw new BadRequestException('No branch available for check-in');
    const attendance = await this.prisma.attendance.create({
      data: {
        tenantId,
        userId: membership.member?.userId ?? membership.memberId,
        customerId: membership.memberId,
        type: 'MEMBER_CHECKIN',
        membershipId: membership.id,
        memberId: membership.memberId,
        branchId: resolvedBranchId,
        checkInTime: new Date(),
        method: 'QR_CODE',
      },
    });
    return { attendance, message: 'Checked in successfully', membership };
  }

  async checkOut(tenantId: string, attendanceId: string) {
    const a = await this.prisma.attendance.findFirst({ where: { id: attendanceId, tenantId } });
    if (!a) throw new NotFoundException('Attendance not found');
    if (a.checkOutTime) throw new BadRequestException('Already checked out');
    const checkOutTime = new Date();
    const duration = Math.round((checkOutTime.getTime() - a.checkInTime.getTime()) / 60000);
    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: { checkOutTime, duration },
    });
  }

  async manualCheckIn(tenantId: string, memberId: string, branchId?: string) {
    const member = await this.prisma.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) throw new NotFoundException('Member not found');
    const activeMembership = await this.prisma.membership.findFirst({
      where: { memberId, status: 'ACTIVE', endDate: { gte: new Date() } },
      orderBy: { startDate: 'desc' },
    });
    let resolvedBranchId = branchId;
    if (!resolvedBranchId) {
      resolvedBranchId = member.branchId ?? undefined;
    }
    if (!resolvedBranchId) {
      const hqBranch = await this.prisma.branch.findFirst({ where: { tenantId, isHeadquarters: true } });
      resolvedBranchId = hqBranch?.id;
    }
    if (!resolvedBranchId) {
      const anyBranch = await this.prisma.branch.findFirst({ where: { tenantId } });
      resolvedBranchId = anyBranch?.id;
    }
    if (!resolvedBranchId) throw new BadRequestException('No branch available for check-in');
    return this.prisma.attendance.create({
      data: {
        tenantId,
        userId: member.userId ?? memberId,
        customerId: memberId,
        type: 'MEMBER_CHECKIN',
        memberId,
        membershipId: activeMembership?.id,
        branchId: resolvedBranchId,
        checkInTime: new Date(),
        method: 'MANUAL',
      },
    });
  }

  async getTodayAttendances(tenantId: string, branchId?: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const where: any = { tenantId, checkInTime: { gte: start, lt: end } };
    if (branchId) where.branchId = branchId;
    return this.prisma.attendance.findMany({
      where,
      orderBy: { checkInTime: 'desc' },
      include: { member: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } } },
    });
  }

  async getMemberHistory(tenantId: string, memberId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.attendance.findMany({
      where: { tenantId, memberId, checkInTime: { gte: since } },
      orderBy: { checkInTime: 'desc' },
    });
  }

  async getBranchStats(tenantId: string, branchId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const attendances = await this.prisma.attendance.findMany({
      where: { tenantId, branchId, checkInTime: { gte: since } },
    });
    const totalCheckins = attendances.length;
    const uniqueVisitors = new Set(attendances.map((a) => a.memberId)).size;
    const averageDuration =
      attendances.filter((a) => a.duration).reduce((s, a) => s + (a.duration ?? 0), 0) /
      Math.max(attendances.filter((a) => a.duration).length, 1);
    return { totalCheckins, uniqueVisitors, averageDuration: Math.round(averageDuration) };
  }
}
