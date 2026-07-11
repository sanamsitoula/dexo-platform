import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogData {
  tenantId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export type AuditAction =
  // User actions
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.invited'
  | 'user.verified'
  | 'user.password_changed'
  | 'user.password_reset'
  | 'user.login'
  | 'user.logout'
  | 'user.failed_login'
  | 'user.locked'
  | 'user.unlocked'
  // Tenant actions
  | 'tenant.created'
  | 'tenant.updated'
  | 'tenant.suspended'
  | 'tenant.activated'
  | 'tenant.deleted'
  // Role actions
  | 'role.created'
  | 'role.updated'
  | 'role.deleted'
  | 'role.assigned'
  | 'role.revoked'
  // Permission actions
  | 'permission.created'
  | 'permission.updated'
  | 'permission.deleted'
  // Subscription actions
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.renewed'
  | 'subscription.plan_changed'
  // Billing actions
  | 'payment.processed'
  | 'payment.failed'
  | 'payment.refunded'
  | 'invoice.created'
  | 'invoice.paid'
  // File actions
  | 'file.uploaded'
  | 'file.downloaded'
  | 'file.deleted'
  | 'file.shared'
  // Settings actions
  | 'settings.updated'
  | 'settings.feature_flag_toggled'
  // Notification actions
  | 'notification.sent'
  | 'notification.failed'
  // Branch actions
  | 'branch.created'
  | 'branch.updated'
  | 'branch.deleted'
  // Customer / CRM actions
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'contact_message.replied'
  | 'contact_message.archived'
  | 'contact_message.deleted'
  // Workout / appointment / package actions
  | 'workout.created'
  | 'workout.deleted'
  | 'appointment.created'
  | 'appointment.cancelled'
  | 'package.subscribed'
  | 'package.cancelled'
  // OAuth / social
  | 'oauth.configured'
  | 'oauth.login'
  | 'oauth.failed'
  // System actions
  | 'system.backup_created'
  | 'system.backup_restored'
  | 'system.maintenance_started'
  | 'system.maintenance_ended';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event. Never throws - audit logging should not break the main flow.
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      // If userId is given, verify it exists (audit log has FK to User).
      // For system-driven events we pass 'system' or no userId at all.
      let userId: string | null = null;
      if (data.userId && data.userId !== 'system') {
        const exists = await this.prisma.user.findUnique({
          where: { id: data.userId },
          select: { id: true },
        }).catch(() => null);
        if (exists) userId = data.userId;
      }

      await this.prisma.auditLog.create({
        data: {
          tenantId: data.tenantId,
          userId,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          changes: data.changes,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      this.logger.debug(`Audit log: ${data.action} by user ${userId} for tenant ${data.tenantId}`);
    } catch (error: any) {
      this.logger.error('Failed to create audit log:', error);
    }
  }

  /** Auto-extract tenant + user from a NestJS request object */
  logFromRequest(req: any, data: Omit<AuditLogData, 'tenantId' | 'userId' | 'ipAddress' | 'userAgent'>) {
    if (!req) return this.log(data);
    return this.log({
      ...data,
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
      ipAddress: req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    });
  }

  async logUserAction(
    action: AuditAction,
    userId: string,
    tenantId?: string,
    resourceId?: string,
    changes?: Record<string, any>,
  ): Promise<void> {
    return this.log({ tenantId, userId, action, resourceType: 'user', resourceId, changes });
  }

  async logTenantAction(
    action: AuditAction,
    userId: string,
    tenantId: string,
    changes?: Record<string, any>,
  ): Promise<void> {
    return this.log({ tenantId, userId, action, resourceType: 'tenant', resourceId: tenantId, changes });
  }

  async logAuthEvent(
    action:
      | 'user.login'
      | 'user.logout'
      | 'user.failed_login'
      | 'user.account_locked'
      | 'user.refresh_token_reuse'
      | 'user.mfa_enabled'
      | 'user.mfa_disabled'
      | 'user.mfa_failed',
    userId?: string,
    tenantId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    return this.log({ tenantId, userId, action, resourceType: 'auth', ipAddress, userAgent });
  }

  async logDataAccess(
    resourceType: string,
    action: AuditAction,
    userId: string,
    tenantId?: string,
    resourceId?: string,
    ipAddress?: string,
  ): Promise<void> {
    return this.log({ tenantId, userId, action, resourceType, resourceId, ipAddress });
  }

  /**
   * Generic paginated query - used by GET /api/audit
   * Pass tenantId = undefined to see all tenants (platform admin only)
   */
  async getAuditLogs(options: {
    tenantId?: string;
    limit?: number;
    offset?: number;
    action?: string;
    resourceType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
  } = {}) {
    const { limit = 50, offset = 0, action, resourceType, userId, startDate, endDate, search } = options;
    const where: any = {};

    if (options.tenantId) where.tenantId = options.tenantId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { resourceType: { contains: search, mode: 'insensitive' } },
        { resourceId: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
        skip: offset,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          tenant: { select: { id: true, name: true, subdomain: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  }

  async getTenantAuditLogs(
    tenantId: string,
    options: { limit?: number; offset?: number; action?: string; resourceType?: string; userId?: string; startDate?: Date; endDate?: Date } = {},
  ) {
    return this.getAuditLogs({ ...options, tenantId });
  }

  async getUserAuditLogs(
    userId: string,
    options: { tenantId?: string; limit?: number; offset?: number; action?: string; startDate?: Date; endDate?: Date } = {},
  ) {
    const { limit = 50, offset = 0, action, startDate, endDate } = options;
    const where: any = { userId };
    if (options.tenantId) where.tenantId = options.tenantId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { logs, total, limit, offset };
  }

  async getResourceAuditLogs(
    resourceType: string,
    resourceId: string,
    tenantId?: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const { limit = 50, offset = 0 } = options;
    const where: any = { resourceType, resourceId };
    if (tenantId) where.tenantId = tenantId;
    const logs = await this.prisma.auditLog.findMany({
      where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    return logs;
  }

  /**
   * Returns all known audit action prefixes
   */
  async listActions() {
    return [
      'user.created', 'user.updated', 'user.deleted', 'user.invited', 'user.login', 'user.logout', 'user.password_changed',
      'tenant.created', 'tenant.updated', 'tenant.suspended', 'tenant.activated', 'tenant.deleted',
      'role.created', 'role.updated', 'role.deleted', 'role.assigned', 'role.revoked',
      'permission.created', 'permission.updated', 'permission.deleted',
      'subscription.created', 'subscription.canceled', 'subscription.plan_changed',
      'payment.processed', 'payment.failed', 'payment.refunded', 'invoice.created', 'invoice.paid',
      'branch.created', 'branch.updated', 'branch.deleted',
      'customer.created', 'customer.updated', 'customer.deleted',
      'contact_message.replied', 'contact_message.archived', 'contact_message.deleted',
      'workout.created', 'workout.deleted',
      'appointment.created', 'appointment.cancelled',
      'package.subscribed', 'package.cancelled',
      'oauth.configured', 'oauth.login', 'oauth.failed',
      'file.uploaded', 'file.downloaded', 'file.deleted',
      'settings.updated',
      'notification.sent', 'notification.failed',
      'system.backup_created', 'system.backup_restored',
    ].sort();
  }

  async getStats(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, last30Days, byAction, byResourceType, topUsers] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({ where: { ...where, createdAt: { gte: since } } }),
      this.prisma.auditLog.groupBy({ by: ['action'], where, _count: true, orderBy: { _count: { action: 'desc' } }, take: 10 }),
      this.prisma.auditLog.groupBy({ by: ['resourceType'], where, _count: true, orderBy: { _count: { resourceType: 'desc' } }, take: 10 }),
      this.prisma.auditLog.groupBy({ by: ['userId'], where: { ...where, userId: { not: null } }, _count: true, orderBy: { _count: { userId: 'desc' } }, take: 5 }),
    ]);

    return { total, last30Days, byAction, byResourceType, topUsers };
  }
}
