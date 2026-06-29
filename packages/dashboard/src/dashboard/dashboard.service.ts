import { Injectable } from '@nestjs/common';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaTenantService) {}

  /**
   * Get platform overview statistics
   */
  async getPlatformOverview() {
    const [
      totalTenants,
      activeTenants,
      totalUsers,
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({ where: { status: 'active' } }),
      this.prisma.user.count(),
      this.prisma.subscription.count(),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.subscription.count({ where: { status: 'trial' } }),
    ]);

    // Get MRR (Monthly Recurring Revenue)
    const activeSubsWithPlans = await this.prisma.subscription.findMany({
      where: { status: { in: ['active', 'trial'] } },
      include: { plan: true },
    });

    const mrr = activeSubsWithPlans.reduce((total, sub) => {
      const amount = sub.plan.billingInterval === 'monthly'
        ? sub.plan.priceCents
        : Math.floor(sub.plan.priceCents / 12);
      return total + amount;
    }, 0);

    // Get arr (Annual Recurring Revenue)
    const arr = activeSubsWithPlans.reduce((total, sub) => {
      const amount = sub.plan.billingInterval === 'yearly'
        ? sub.plan.priceCents
        : sub.plan.priceCents * 12;
      return total + amount;
    }, 0);

    return {
      tenants: {
        total: totalTenants,
        active: activeTenants,
        trial: totalTenants - activeTenants,
      },
      users: {
        total: totalUsers,
        averagePerTenant: totalTenants > 0 ? Math.round(totalUsers / totalTenants) : 0,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        trial: trialSubscriptions,
      },
      revenue: {
        mrr: Math.round(mrr / 100), // Convert to dollars
        arr: Math.round(arr / 100),
        currency: 'USD',
      },
    };
  }

  /**
   * Get tenant-specific dashboard
   */
  async getTenantDashboard(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: { in: ['active', 'trial'] } },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return null;
    }

    const userCount = await this.prisma.user.count({
      where: { tenantId },
    });

    const recentAuditLogs = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const storageUsage = await this.prisma.file.aggregate({
      where: { tenantId },
      _sum: { sizeBytes: true },
      _count: true,
    });

    const subscription = tenant.subscriptions[0];
    const plan = subscription?.plan;

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        domain: tenant.domain,
        status: tenant.status,
        trialEndsAt: tenant.trialEndsAt,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        plan: plan ? {
          name: plan.name,
          price: plan.priceCents / 100,
          currency: plan.currency,
          billingInterval: plan.billingInterval,
          features: plan.features,
          limits: plan.limits,
        } : null,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
      } : null,
      usage: {
        users: {
          current: userCount,
          limit: plan?.limits ? (plan.limits as any).users || null : null,
        },
        storage: {
          current: Math.round((Number(storageUsage._sum.sizeBytes) || 0) / (1024 * 1024 * 1024) * 100) / 100, // GB
          limit: plan?.limits ? (plan.limits as any).storage || null : null,
          files: storageUsage._count,
        },
      },
      recentActivity: recentAuditLogs.map(log => ({
        id: log.id,
        action: log.action,
        resourceType: log.resourceType,
        createdAt: log.createdAt,
      })),
    };
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(startDate: Date, endDate: Date) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: { plan: true },
    });

    const revenueByPlan = new Map();
    let totalRevenue = 0;

    for (const sub of subscriptions) {
      const planName = sub.plan.name;
      const amount = sub.plan.billingInterval === 'monthly'
        ? sub.plan.priceCents
        : Math.floor(sub.plan.priceCents / 12);

      totalRevenue += amount;

      const current = revenueByPlan.get(planName) || { count: 0, revenue: 0 };
      revenueByPlan.set(planName, {
        count: current.count + 1,
        revenue: current.revenue + amount,
      });
    }

    return {
      period: { start: startDate, end: endDate },
      totalRevenue: Math.round(totalRevenue / 100),
      currency: 'USD',
      byPlan: Array.from(revenueByPlan.entries()).map(([plan, data]) => ({
        plan,
        subscriptions: data.count,
        revenue: Math.round(data.revenue / 100),
      })),
    };
  }

  /**
   * Get user growth analytics
   */
  async getUserGrowthAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        tenantId: true,
      },
    });

    // Group by day
    const dailyGrowth = new Map();
    for (const user of users) {
      const day = user.createdAt.toISOString().split('T')[0];
      dailyGrowth.set(day, (dailyGrowth.get(day) || 0) + 1);
    }

    return {
      period: { start: startDate, end: new Date() },
      totalNewUsers: users.length,
      dailyGrowth: Array.from(dailyGrowth.entries()).map(([day, count]) => ({
        date: day,
        count,
      })),
    };
  }

  /**
   * Get subscription metrics
   */
  async getSubscriptionMetrics() {
    const [
      totalByStatus,
      totalByPlan,
      recentCancellations,
      expiringTrials,
    ] = await Promise.all([
      this.prisma.subscription.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        _count: true,
        where: { status: { in: ['active', 'trial'] } },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'canceled',
          canceledAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'trial',
          trialEnd: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const planDetails = await Promise.all(
      totalByPlan.map(async (p) => {
        const plan = await this.prisma.plan.findUnique({
          where: { id: p.planId },
        });
        return {
          plan: plan?.name,
          count: p._count,
        };
      }),
    );

    return {
      byStatus: totalByStatus.map(s => ({
        status: s.status,
        count: s._count,
      })),
      byPlan: planDetails,
      cancellations: {
        last30Days: recentCancellations,
      },
      trials: {
        expiringIn7Days: expiringTrials,
      },
    };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Count recent activities
    const recentLogins = await this.prisma.user.count({
      where: { lastLoginAt: { gte: oneHourAgo } },
    });

    const recentActions = await this.prisma.auditLog.count({
      where: { createdAt: { gte: oneHourAgo } },
    });

    return {
      status: 'healthy',
      timestamp: now.toISOString(),
      metrics: {
        activeUsers: {
          lastHour: recentLogins,
        },
        systemActivity: {
          lastHour: recentActions,
        },
      },
    };
  }

  /**
   * Get feature usage analytics
   */
  async getFeatureUsage(tenantId?: string) {
    // This would typically track specific feature usage
    // For now, return a placeholder
    return {
      features: [
        { feature: 'files.upload', usage: 145 },
        { feature: 'notifications.send', usage: 89 },
        { feature: 'users.invite', usage: 34 },
        { feature: 'settings.update', usage: 21 },
      ],
    };
  }
}
