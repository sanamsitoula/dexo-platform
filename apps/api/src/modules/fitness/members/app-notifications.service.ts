import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

/**
 * AppNotificationsService — in-app notification feed backing the mobile
 * app's Notifications tab (MEMBER audience, targeted at one user) and the
 * tenant-admin dashboard alerts (TENANT_ADMIN audience, one shared feed per
 * tenant so we don't fan out a row per admin user).
 *
 * Writers: MembershipReminderService (same milestones as its emails) and
 * MembershipsService (extend/edit actions). Creation is always best-effort
 * for callers — a notification failure must never break the action itself.
 */
@Injectable()
export class AppNotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(input: {
    tenantId: string;
    audience: 'MEMBER' | 'TENANT_ADMIN';
    userId?: string | null;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }) {
    return this.prisma.appNotification.create({
      data: {
        tenantId: input.tenantId,
        audience: input.audience,
        userId: input.audience === 'MEMBER' ? input.userId : null,
        type: input.type,
        title: input.title,
        message: input.message,
        data: (input.data as any) ?? undefined,
      },
    });
  }

  /** Member feed: notifications targeted at this user. */
  async listForUser(tenantId: string, userId: string, params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const page = params?.page ?? 1;
    const limit = Math.min(params?.limit ?? 30, 100);
    const where: any = { tenantId, audience: 'MEMBER', userId };
    if (params?.unreadOnly) where.isRead = false;
    const [items, total, unread] = await Promise.all([
      this.prisma.appNotification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.appNotification.count({ where }),
      this.prisma.appNotification.count({ where: { tenantId, audience: 'MEMBER', userId, isRead: false } }),
    ]);
    return { items, total, unread, page, limit };
  }

  /** Tenant-admin feed: one shared stream per tenant. */
  async listForAdmin(tenantId: string, params?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const page = params?.page ?? 1;
    const limit = Math.min(params?.limit ?? 30, 100);
    const where: any = { tenantId, audience: 'TENANT_ADMIN' };
    if (params?.unreadOnly) where.isRead = false;
    const [items, total, unread] = await Promise.all([
      this.prisma.appNotification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.appNotification.count({ where }),
      this.prisma.appNotification.count({ where: { tenantId, audience: 'TENANT_ADMIN', isRead: false } }),
    ]);
    return { items, total, unread, page, limit };
  }

  async markRead(tenantId: string, id: string, userId: string) {
    const n = await this.prisma.appNotification.findFirst({ where: { id, tenantId } });
    if (!n) throw new NotFoundException('Notification not found');
    // MEMBER rows may only be marked read by their recipient; the shared
    // TENANT_ADMIN feed can be marked read by any tenant admin viewing it.
    if (n.audience === 'MEMBER' && n.userId !== userId) throw new NotFoundException('Notification not found');
    return this.prisma.appNotification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllRead(tenantId: string, userId: string, audience: 'MEMBER' | 'TENANT_ADMIN') {
    const where: any = audience === 'MEMBER'
      ? { tenantId, audience: 'MEMBER', userId, isRead: false }
      : { tenantId, audience: 'TENANT_ADMIN', isRead: false };
    const result = await this.prisma.appNotification.updateMany({ where, data: { isRead: true, readAt: new Date() } });
    return { updated: result.count };
  }
}
