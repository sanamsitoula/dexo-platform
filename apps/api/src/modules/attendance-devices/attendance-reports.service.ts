import { Injectable } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Attendance reports — Node counterparts of the reference project's
 * reports_daily / reports_monthly / department summary screens:
 *  - daily:   who was present on a date, first-in / last-out, punch count
 *  - monthly: per-person day grid (present days, total minutes, per-day punches)
 *  - summary: presence counts per day over a range (dashboard chart)
 */
@Injectable()
export class AttendanceReportsService {
  constructor(private prisma: PrismaService) {}

  private personName(a: any): string {
    const u = a.member?.user;
    if (u) return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email;
    return a.deviceUid ? `Device UID ${a.deviceUid}` : a.userId;
  }

  private personKey(a: any): string {
    return a.memberId ?? (a.deviceUid ? `uid:${a.deviceUid}` : a.userId);
  }

  async daily(tenantId: string, date?: string) {
    const day = date ? new Date(date) : new Date();
    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end = new Date(day); end.setHours(23, 59, 59, 999);

    const rows = await this.prisma.attendance.findMany({
      where: { tenantId, checkInTime: { gte: start, lte: end } },
      orderBy: { checkInTime: 'asc' },
      include: { member: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }, device: { select: { name: true } } },
    });

    const byPerson = new Map<string, any>();
    for (const a of rows) {
      const key = this.personKey(a);
      const entry = byPerson.get(key) ?? {
        key,
        name: this.personName(a),
        memberId: a.memberId,
        deviceUid: a.deviceUid,
        punches: [] as any[],
      };
      entry.punches.push({ time: a.checkInTime, checkOut: a.checkOutTime, device: a.device?.name, method: a.method });
      byPerson.set(key, entry);
    }

    const present = [...byPerson.values()].map((p) => {
      const first = p.punches[0]?.time;
      const lastPunch = p.punches[p.punches.length - 1];
      const last = lastPunch?.checkOut ?? (p.punches.length > 1 ? lastPunch.time : null);
      return {
        ...p,
        firstIn: first,
        lastOut: last,
        punchCount: p.punches.length,
        minutes: first && last ? Math.round((new Date(last).getTime() - new Date(first).getTime()) / 60000) : null,
      };
    });

    const totalMembers = await this.prisma.member.count({ where: { tenantId, status: 'ACTIVE' } });
    return {
      date: dayKey(start),
      presentCount: present.length,
      totalActiveMembers: totalMembers,
      absentCount: Math.max(0, totalMembers - present.filter((p) => p.memberId).length),
      present,
    };
  }

  async monthly(tenantId: string, month?: string) {
    const [y, m] = (month ?? new Date().toISOString().slice(0, 7)).split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    const daysInMonth = new Date(y, m, 0).getDate();

    const rows = await this.prisma.attendance.findMany({
      where: { tenantId, checkInTime: { gte: start, lte: end } },
      orderBy: { checkInTime: 'asc' },
      include: { member: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
    });

    const people = new Map<string, any>();
    for (const a of rows) {
      const key = this.personKey(a);
      const p = people.get(key) ?? { key, name: this.personName(a), memberId: a.memberId, days: {} as Record<string, any> };
      const dk = dayKey(a.checkInTime);
      const day = p.days[dk] ?? { firstIn: a.checkInTime, lastOut: a.checkOutTime ?? a.checkInTime, punches: 0 };
      day.punches += 1;
      if (a.checkInTime < day.firstIn) day.firstIn = a.checkInTime;
      const out = a.checkOutTime ?? a.checkInTime;
      if (out > day.lastOut) day.lastOut = out;
      p.days[dk] = day;
      people.set(key, p);
    }

    const report = [...people.values()].map((p) => {
      const days = Object.entries(p.days).map(([date, d]: [string, any]) => ({
        date,
        firstIn: d.firstIn,
        lastOut: d.lastOut,
        punches: d.punches,
        minutes: Math.round((new Date(d.lastOut).getTime() - new Date(d.firstIn).getTime()) / 60000),
      }));
      return {
        key: p.key,
        name: p.name,
        memberId: p.memberId,
        presentDays: days.length,
        totalMinutes: days.reduce((s, d) => s + d.minutes, 0),
        days,
      };
    }).sort((a, b) => b.presentDays - a.presentDays);

    return { month: `${y}-${String(m).padStart(2, '0')}`, daysInMonth, people: report };
  }

  async summary(tenantId: string, days = 14) {
    const since = new Date(Date.now() - days * 86400000);
    since.setHours(0, 0, 0, 0);
    const rows = await this.prisma.attendance.findMany({
      where: { tenantId, checkInTime: { gte: since } },
      select: { checkInTime: true, memberId: true, deviceUid: true, userId: true },
    });
    const perDay = new Map<string, Set<string>>();
    for (const a of rows) {
      const dk = dayKey(a.checkInTime);
      if (!perDay.has(dk)) perDay.set(dk, new Set());
      perDay.get(dk)!.add(a.memberId ?? a.deviceUid ?? a.userId);
    }
    const out: Array<{ date: string; present: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dk = dayKey(d);
      out.push({ date: dk, present: perDay.get(dk)?.size ?? 0 });
    }
    return out;
  }
}
