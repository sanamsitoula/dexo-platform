import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@dexo/shared';
import { ZkPullerService } from './zk-puller.service';

/**
 * Device registry + data puller (mirrors devices / pull_sessions /
 * attendance_logs from the reference ZKTecoAttendancePuller project).
 * Punches are stored in the shared Attendance table with a
 * UNIQUE(deviceId, deviceUid, checkInTime) constraint, so pulls are
 * idempotent — re-pulling never duplicates records.
 */
@Injectable()
export class AttendanceDevicesService {
  private readonly logger = new Logger(AttendanceDevicesService.name);

  constructor(private prisma: PrismaService, private zk: ZkPullerService) {}

  // ------------------------------ device CRUD ------------------------------

  findAll(tenantId: string) {
    return this.prisma.attendanceDevice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { attendances: true } },
        pullSessions: { orderBy: { startedAt: 'desc' }, take: 1 },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const d = await this.prisma.attendanceDevice.findFirst({ where: { id, tenantId } });
    if (!d) throw new NotFoundException('Device not found');
    return d;
  }

  async create(tenantId: string, dto: any) {
    if (!dto?.name || !dto?.ip) throw new BadRequestException('name and ip are required');
    return this.prisma.attendanceDevice.create({
      data: {
        tenantId,
        branchId: dto.branchId || null,
        name: dto.name,
        ip: dto.ip,
        port: Number(dto.port) || 4370,
        commKey: dto.commKey ?? null,
        model: dto.model ?? null,
        forceUdp: !!dto.forceUdp,
        timeoutSec: Number(dto.timeoutSec) || 10,
        lastStatus: 'NEVER',
      },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findOne(tenantId, id);
    return this.prisma.attendanceDevice.update({
      where: { id },
      data: {
        name: dto.name,
        ip: dto.ip,
        port: dto.port != null ? Number(dto.port) : undefined,
        commKey: dto.commKey,
        model: dto.model,
        forceUdp: dto.forceUdp,
        timeoutSec: dto.timeoutSec != null ? Number(dto.timeoutSec) : undefined,
        isActive: dto.isActive,
        branchId: dto.branchId,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    // Detach punches (keep the attendance history), drop sessions via cascade.
    await this.prisma.attendance.updateMany({ where: { deviceId: id }, data: { deviceId: null } });
    return this.prisma.attendanceDevice.delete({ where: { id } });
  }

  async testConnection(tenantId: string, id: string) {
    const d = await this.findOne(tenantId, id);
    return this.zk.testConnection({ ip: d.ip, port: d.port, timeoutSec: d.timeoutSec, forceUdp: d.forceUdp, commKey: d.commKey });
  }

  // ------------------------------ data puller ------------------------------

  /** Pull one device now. Creates a pull session (audit trail) either way. */
  async pull(tenantId: string, deviceId: string) {
    const device = await this.findOne(tenantId, deviceId);
    const session = await this.prisma.attendancePullSession.create({
      data: { tenantId, deviceId: device.id },
    });

    try {
      // Known device-uid → member mapping for this tenant.
      const members = await this.prisma.member.findMany({
        where: { tenantId, deviceUserId: { not: null } },
        select: { id: true, userId: true, deviceUserId: true },
      });
      const byUid = new Map(members.map((m) => [String(m.deviceUserId), m]));

      const punches = await this.zk.pullAttendance(
        { ip: device.ip, port: device.port, timeoutSec: device.timeoutSec, forceUdp: device.forceUdp, commKey: device.commKey },
        [...byUid.keys()],
      );

      // Attendance.branchId is required — fall back to the tenant's HQ branch.
      const branchId =
        device.branchId ??
        (await this.prisma.branch.findFirst({ where: { tenantId }, orderBy: { isHeadquarters: 'desc' } }))?.id;
      if (!branchId) throw new BadRequestException('Tenant has no branch to attach punches to');

      const before = await this.prisma.attendance.count({ where: { deviceId: device.id } });
      if (punches.length) {
        await this.prisma.attendance.createMany({
          data: punches.map((p) => {
            const member = byUid.get(p.deviceUid);
            return {
              tenantId,
              branchId,
              deviceId: device.id,
              deviceUid: p.deviceUid,
              userId: member?.userId ?? `device:${p.deviceUid}`,
              memberId: member?.id ?? null,
              type: 'MEMBER_CHECKIN',
              method: 'BIOMETRIC' as any,
              checkInTime: p.timestamp,
              notes: member ? null : 'Unmapped device uid — set Member.deviceUserId to link',
            } as any;
          }),
          skipDuplicates: true,
        });
      }
      const after = await this.prisma.attendance.count({ where: { deviceId: device.id } });
      const newInserts = after - before;

      await this.prisma.attendancePullSession.update({
        where: { id: session.id },
        data: { completedAt: new Date(), status: 'SUCCESS', recordsPulled: punches.length, newInserts },
      });
      await this.prisma.attendanceDevice.update({
        where: { id: device.id },
        data: { lastPullAt: new Date(), lastStatus: 'OK' },
      });
      return { deviceId: device.id, recordsPulled: punches.length, newInserts, status: 'SUCCESS' };
    } catch (err: any) {
      this.logger.warn(`Pull failed for device ${device.name} (${device.ip}): ${err?.message}`);
      await this.prisma.attendancePullSession.update({
        where: { id: session.id },
        data: { completedAt: new Date(), status: 'FAILED', errorDetail: err?.stack || err?.message || String(err) },
      });
      await this.prisma.attendanceDevice.update({
        where: { id: device.id },
        data: { lastPullAt: new Date(), lastStatus: 'FAILED' },
      });
      throw new BadRequestException(`Pull failed: ${err?.message || err}`);
    }
  }

  /** Pull every active device of a tenant. */
  async pullAll(tenantId: string) {
    const devices = await this.prisma.attendanceDevice.findMany({ where: { tenantId, isActive: true } });
    const results = [];
    for (const d of devices) {
      results.push(await this.pull(tenantId, d.id).catch((e) => ({ deviceId: d.id, status: 'FAILED', error: e?.message })));
    }
    return results;
  }

  /** Scheduled puller — the APScheduler equivalent. Enable with ATTENDANCE_AUTO_PULL=true. */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduledPull() {
    if (process.env.ATTENDANCE_AUTO_PULL !== 'true') return;
    const devices = await this.prisma.attendanceDevice.findMany({ where: { isActive: true } });
    this.logger.log(`Scheduled pull: ${devices.length} active device(s)`);
    for (const d of devices) {
      await this.pull(d.tenantId, d.id).catch(() => undefined); // session records the failure
    }
  }

  // ------------------------------ sessions & logs ------------------------------

  sessions(tenantId: string, deviceId?: string) {
    return this.prisma.attendancePullSession.findMany({
      where: { tenantId, ...(deviceId ? { deviceId } : {}) },
      orderBy: { startedAt: 'desc' },
      take: 50,
      include: { device: { select: { id: true, name: true, ip: true } } },
    });
  }

  async logs(tenantId: string, q: { from?: string; to?: string; deviceId?: string; memberId?: string; search?: string; take?: number; page?: number; pageSize?: number }) {
    const where: any = { tenantId };
    if (q.deviceId) where.deviceId = q.deviceId;
    if (q.memberId) where.memberId = q.memberId;
    if (q.from || q.to) {
      where.checkInTime = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(`${q.to}T23:59:59.999`) } : {}),
      };
    }
    if (q.search) {
      where.OR = [
        { deviceUid: { contains: q.search } },
        { member: { user: { OR: [
          { firstName: { contains: q.search, mode: 'insensitive' } },
          { lastName: { contains: q.search, mode: 'insensitive' } },
          { email: { contains: q.search, mode: 'insensitive' } },
        ] } } },
      ];
    }
    // Server-side pagination — page/pageSize with total count.
    const pageSize = Math.min(Math.max(1, Number((q as any).pageSize) || Number(q.take) || 25), 100);
    const page = Math.max(1, Number((q as any).page) || 1);
    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        orderBy: { checkInTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          member: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
          device: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** A member's own attendance (customer app). */
  async myLogs(tenantId: string, userId: string, days = 60) {
    const member = await this.prisma.member.findFirst({ where: { tenantId, userId } });
    const since = new Date(Date.now() - days * 86400000);
    return this.prisma.attendance.findMany({
      where: {
        tenantId,
        checkInTime: { gte: since },
        OR: [{ userId }, ...(member ? [{ memberId: member.id }] : [])],
      },
      orderBy: { checkInTime: 'desc' },
      include: { device: { select: { name: true } }, branch: { select: { name: true } } },
    });
  }

  // ------------------------------ platform admin ------------------------------

  /** Server-side pagination: returns { items, total, page, pageSize }. */
  async adminOverview(page = 1, pageSize = 25) {
    const take = Math.min(Math.max(1, pageSize), 100);
    const skip = Math.max(0, (page - 1) * take);
    const [items, total] = await Promise.all([
      this.prisma.attendanceDevice.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          tenant: { select: { id: true, name: true, subdomain: true } },
          _count: { select: { attendances: true, pullSessions: true } },
          pullSessions: { orderBy: { startedAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.attendanceDevice.count(),
    ]);
    return { items, total, page, pageSize: take };
  }

  async adminSessions(page = 1, pageSize = 25) {
    const take = Math.min(Math.max(1, pageSize), 100);
    const skip = Math.max(0, (page - 1) * take);
    const [items, total] = await Promise.all([
      this.prisma.attendancePullSession.findMany({
        orderBy: { startedAt: 'desc' },
        skip,
        take,
        include: {
          tenant: { select: { name: true, subdomain: true } },
          device: { select: { name: true, ip: true } },
        },
      }),
      this.prisma.attendancePullSession.count(),
    ]);
    return { items, total, page, pageSize: take };
  }
}
