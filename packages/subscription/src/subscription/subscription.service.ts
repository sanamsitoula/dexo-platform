import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreatePlanDto,
  SubscriptionStatus,
  BillingInterval,
} from './dto';

/** Canonical plan module keys (mirrors seed 07 PLAN_DEFS features.modules). */
export const MODULE_KEYS = [
  'crm',
  'blog',
  'billing_invoice',
  'invoice_print',
  'attendance',
  'website_builder',
  'payments_online',
  'reports_nfrs',
  'announcements',
] as const;

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaTenantService) {}

  // ========== Plan Methods ==========

  async createPlan(createPlanDto: CreatePlanDto) {
    const { slug, ...rest } = createPlanDto;

    // Check if plan slug already exists
    const existing = await this.prisma.plan.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new ConflictException('Plan with this slug already exists');
    }

    const plan = await this.prisma.plan.create({
      data: { ...rest, slug },
    });

    return plan;
  }

  async findAllPlans() {
    const plans = await this.prisma.plan.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            tenants: true,
            subscriptions: true,
          },
        },
      },
      orderBy: { priceCents: 'asc' },
    });

    return plans;
  }

  async findPlan(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tenants: true,
            subscriptions: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async findPlanBySlug(slug: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { slug },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return plan;
  }

  async updatePlan(id: string, updatePlanDto: Partial<CreatePlanDto>) {
    // Check if plan exists
    const existing = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    // Check slug uniqueness if changing
    if (updatePlanDto.slug && updatePlanDto.slug !== existing.slug) {
      const duplicate = await this.prisma.plan.findUnique({
        where: { slug: updatePlanDto.slug },
      });
      if (duplicate) {
        throw new ConflictException('Plan with this slug already exists');
      }
    }

    const plan = await this.prisma.plan.update({
      where: { id },
      data: updatePlanDto,
    });

    return plan;
  }

  async deletePlan(id: string) {
    // Check if plan exists
    const existing = await this.prisma.plan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    // Check if plan has active subscriptions
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        planId: id,
        status: { in: ['active', 'trial'] },
      },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        `Cannot delete plan with ${activeSubscriptions} active subscription(s)`,
      );
    }

    await this.prisma.plan.delete({
      where: { id },
    });

    return { message: 'Plan deleted successfully' };
  }

  // ========== Subscription Methods ==========

  async createSubscription(createSubscriptionDto: CreateSubscriptionDto) {
    const { tenantId, planId, status, trialStart, trialEnd } = createSubscriptionDto;

    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Check if tenant already has active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'trial'] },
      },
    });

    if (existingSubscription) {
      throw new ConflictException('Tenant already has an active subscription');
    }

    // Calculate period dates
    const now = new Date();
    let currentPeriodStart = now;
    let currentPeriodEnd = new Date(now);

    if (plan.billingInterval === BillingInterval.MONTHLY) {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
    } else {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
    }

    // Handle trial dates
    const finalTrialStart = trialStart ? new Date(trialStart) : now;
    const finalTrialEnd = trialEnd ? new Date(trialEnd) :
      (status === SubscriptionStatus.TRIAL ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null);

    const subscription = await this.prisma.subscription.create({
      data: {
        tenantId,
        planId,
        status: status || SubscriptionStatus.TRIAL,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart: finalTrialStart,
        trialEnd: finalTrialEnd,
      },
      include: {
        plan: true,
        tenant: true,
      },
    });

    // Update tenant plan
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { planId },
    });

    return subscription;
  }

  async findAllSubscriptions(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        plan: true,
        tenant: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions;
  }

  async findSubscription(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        tenant: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async updateSubscription(id: string, updateSubscriptionDto: UpdateSubscriptionDto) {
    // Check if subscription exists
    const existing = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Subscription not found');
    }

    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: updateSubscriptionDto,
      include: {
        plan: true,
        tenant: true,
      },
    });

    return subscription;
  }

  async cancelSubscription(id: string) {
    // Check if subscription exists
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Update subscription
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: new Date(),
        endedAt: subscription.currentPeriodEnd,
      },
    });

    // Update tenant status
    await this.prisma.tenant.update({
      where: { id: subscription.tenantId },
      data: { status: 'cancelled' },
    });

    return {
      message: 'Subscription canceled successfully',
      subscription: updated,
    };
  }

  async renewSubscription(id: string) {
    // Check if subscription exists
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Calculate new period dates
    const now = new Date();
    const newPeriodStart = subscription.currentPeriodEnd > now ? subscription.currentPeriodEnd : now;
    const newPeriodEnd = new Date(newPeriodStart);

    if (subscription.plan.billingInterval === BillingInterval.MONTHLY) {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
    } else {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
    }

    const renewed = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        canceledAt: null,
        endedAt: null,
      },
    });

    // Update tenant status
    await this.prisma.tenant.update({
      where: { id: subscription.tenantId },
      data: { status: 'active' },
    });

    return {
      message: 'Subscription renewed successfully',
      subscription: renewed,
    };
  }

  async changePlan(id: string, newPlanId: string) {
    // Check if subscription exists
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Check if new plan exists
    const newPlan = await this.prisma.plan.findUnique({
      where: { id: newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException('New plan not found');
    }

    // Calculate prorated dates (simplified)
    const now = new Date();
    const daysRemaining = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        planId: newPlanId,
        currentPeriodStart: now,
        currentPeriodEnd: daysRemaining > 0
          ? new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Update tenant plan
    await this.prisma.tenant.update({
      where: { id: subscription.tenantId },
      data: { planId: newPlanId },
    });

    return {
      message: 'Plan changed successfully',
      subscription: updated,
    };
  }

  async getTenantSubscription(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'trial', 'past_due'] },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found for tenant');
    }

    return subscription;
  }

  /**
   * Resolve a tenant's enabled modules from its active subscription's plan
   * (`plan.features.modules`). Tenants without a subscription/plan, or on a
   * plan without a modules config, get all modules enabled (backward compatible).
   */
  async getTenantModules(tenantId: string) {
    const allEnabled = Object.fromEntries(
      MODULE_KEYS.map((k) => [k, true]),
    ) as Record<string, boolean>;

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ['active', 'trial', 'past_due'] },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    const features = subscription?.plan?.features as Record<string, any> | null | undefined;
    const planModules = features?.modules;

    if (!planModules || typeof planModules !== 'object') {
      return { tenantId, planId: subscription?.planId ?? null, modules: allEnabled };
    }

    return {
      tenantId,
      planId: subscription!.planId,
      modules: { ...allEnabled, ...planModules },
    };
  }

  async checkTrialExpiry() {
    // Find all trial subscriptions that have expired
    const expiredTrials = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEnd: { lte: new Date() },
      },
      include: { tenant: true },
    });

    // Update expired trials
    const updates = expiredTrials.map(sub =>
      this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.CANCELED, endedAt: new Date() },
      }),
    );

    await Promise.all(updates);

    return {
      message: `Processed ${expiredTrials.length} expired trials`,
      count: expiredTrials.length,
    };
  }
}
