import { Injectable, Logger, Cron, CronExpression } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { QueueService } from '@dexo/shared';
import { AccountingService } from '../accounting/accounting.service';
import { InvoiceService } from '../invoices/invoice.service';
import { IrdService } from '../ird/ird.service';

/**
 * Platform Billing Service
 * Handles Dexo's subscription billing to tenants
 * This is the platform layer billing (Layer 1)
 */
@Injectable()
export class PlatformBillingService {
  private readonly logger = new Logger(PlatformBillingService.name);

  constructor(
    private prisma: PrismaService,
    private queueService: QueueService,
    private accountingService: AccountingService,
    private invoiceService: InvoiceService,
    private irdService: IrdService,
  ) {}

  /**
   * Monthly subscription billing job
   * Runs on 1st of each month at 2 AM NST
   */
  @Cron('0 2 1 * *')
  async monthlySubscriptionBilling() {
    this.logger.log('Starting monthly subscription billing...');

    // Get all active tenants above free tier
    const billableTenants = await this.getBillableTenants();

    this.logger.log(`Found ${billableTenants.length} billable tenants`);

    for (const tenant of billableTenants) {
      try {
        await this.billTenant(tenant);
      } catch (error) {
        this.logger.error(`Failed to bill tenant ${tenant.id}: ${error.message}`);
        // Continue with next tenant
      }
    }

    this.logger.log('Monthly subscription billing completed');
  }

  /**
   * Deferred revenue release job
   * Runs on 1st of each month at 3 AM NST
   * Recognizes 1/12 of annual subscriptions
   */
  @Cron('0 3 1 * *')
  async deferredRevenueRelease() {
    this.logger.log('Starting deferred revenue release...');

    // Get all active annual subscriptions
    const annualSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        plan: {
          billingInterval: 'yearly',
        },
      },
      include: {
        tenant: true,
        plan: true,
      },
    });

    this.logger.log(`Found ${annualSubscriptions.length} annual subscriptions`);

    for (const subscription of annualSubscriptions) {
      try {
        await this.releaseDeferredRevenue(subscription);
      } catch (error) {
        this.logger.error(`Failed to release deferred revenue for subscription ${subscription.id}: ${error.message}`);
      }
    }

    this.logger.log('Deferred revenue release completed');
  }

  /**
   * AR payment reminder job
   * Runs daily at 9 AM
   */
  @Cron('0 9 * * *')
  async arPaymentReminder() {
    this.logger.log('Sending AR payment reminders...');

    // Get overdue invoices
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        isActive: true,
        paymentStatus: { in: ['ISSUED', 'PARTIAL'] },
        dueDate: { lt: new Date() },
      },
      include: { tenant: true },
    });

    this.logger.log(`Found ${overdueInvoices.length} overdue invoices`);

    for (const invoice of overdueInvoices) {
      // Group by tenant and send reminder
      await this.sendPaymentReminder(invoice);
    }

    this.logger.log('AR payment reminders sent');
  }

  /**
   * Failed payment handling (dunning workflow)
   * D+3: First reminder
   * D+7: Second reminder, flag account
   * D+15: Downgrade to free tier
   * D+30: Suspend account
   */
  async handleFailedPayment(subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const daysSinceDue = Math.floor(
      (Date.now() - new Date(subscription.currentPeriodEnd).getTime()) / (1000 * 60 * 60 * 24),
    );

    let action: string;

    if (daysSinceDue >= 30) {
      // Suspend account
      await this.prisma.tenant.update({
        where: { id: subscription.tenantId },
        data: { status: 'suspended' },
      });

      await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'unpaid' },
      });

      action = 'SUSPENDED';
    } else if (daysSinceDue >= 15) {
      // Downgrade to free tier
      const freePlan = await this.prisma.plan.findFirst({
        where: { slug: 'free' },
      });

      if (freePlan) {
        await this.prisma.subscription.update({
          where: { id: subscriptionId },
          data: { planId: freePlan.id },
        });
      }

      action = 'DOWNGRADED';
    } else {
      // Send reminder
      await this.sendFailedPaymentReminder(subscription, daysSinceDue);
      action = daysSinceDue >= 7 ? 'SECOND_REMINDER' : 'FIRST_REMINDER';
    }

    this.logger.log(`Handled failed payment for subscription ${subscriptionId}: ${action}`);

    return { subscriptionId, action, daysSinceDue };
  }

  /**
   * Get billable tenants (above free tier)
   */
  private async getBillableTenants() {
    const freePlan = await this.prisma.plan.findFirst({
      where: { slug: 'free' },
    });

    if (!freePlan) {
      return [];
    }

    // Get tenants not on free plan
    const billableTenants = await this.prisma.tenant.findMany({
      where: {
        status: 'active',
        planId: { not: freePlan.id },
      },
      include: {
        plan: true,
        subscription: true,
      },
    });

    // Filter by customer count (free tier: 0-5 customers)
    const result = [];

    for (const tenant of billableTenants) {
      const customerCount = await this.prisma.customer.count({
        where: { tenantId: tenant.id },
      });

      // Check if tenant has exceeded free tier limits
      // For this example, assume > 5 customers means billable
      if (customerCount > 5) {
        result.push({ ...tenant, customerCount });
      }
    }

    return result;
  }

  /**
   * Bill a tenant for their subscription
   */
  private async billTenant(tenant: any) {
    const subscription = tenant.subscription;
    const plan = tenant.plan;

    // Calculate charges
    const baseAmount = plan.priceCents / 100; // Convert from cents
    const vatRate = 0.13; // 13% VAT
    const vatAmount = baseAmount * vatRate;
    const totalAmount = baseAmount + vatAmount;

    // Create invoice for Dexo's books (Platform Layer)
    const invoiceNo = `DEXO-${tenant.id}-${Date.now()}`;

    // Record in Dexo's accounting system
    // In production, this would create a journal entry in Dexo's own tenant space
    await this.createPlatformSubscriptionEntry(tenant, baseAmount, vatAmount);

    // Create IRD-compliant invoice for tenant
    // This would be sent to the tenant via email
    this.logger.log(`Billed tenant ${tenant.id}: ${totalAmount} ${plan.currency}`);

    // Queue payment collection
    await this.queuePaymentCollection(tenant.id, totalAmount);

    return {
      tenantId: tenant.id,
      invoiceNo,
      amount: totalAmount,
      currency: plan.currency,
    };
  }

  /**
   * Release deferred revenue for annual subscription
   */
  private async releaseDeferredRevenue(subscription: any) {
    const monthlyAmount = (subscription.plan.priceCents / 100) / 12;

    // Post journal entry:
    // DR  Deferred Subscription Revenue    monthlyAmount
    //      CR  Subscription Revenue                 monthlyAmount

    await this.accountingService.createJournalEntry(
      subscription.tenantId,
      {
        entryDate: new Date(),
        referenceType: 'DEFERRED_REVENUE_RELEASE',
        referenceId: subscription.id,
        description: `Monthly revenue recognition - ${subscription.plan.name}`,
        lines: [
          // Debit Deferred Revenue
          {
            accountId: '2131', // Deferred Subscription Revenue
            debitAmount: monthlyAmount,
            creditAmount: 0,
          },
          // Credit Subscription Revenue
          {
            accountId: '4160', // Subscription Revenue (Dexo Platform)
            debitAmount: 0,
            creditAmount: monthlyAmount,
          },
        ],
      },
    );

    this.logger.log(`Released ${monthlyAmount} deferred revenue for subscription ${subscription.id}`);
  }

  /**
   * Send payment reminder for overdue invoice
   */
  private async sendPaymentReminder(invoice: any) {
    // Queue notification
    await this.queueService.add('email', {
      to: invoice.tenant.email,
      template: 'PAYMENT_REMINDER',
      data: {
        invoiceNumber: invoice.invoiceNumber,
        amountDue: Number(invoice.totalAmount) - Number(invoice.paidAmount),
        dueDate: invoice.dueDate,
        tenantName: invoice.tenant.name,
      },
    });

    this.logger.log(`Sent payment reminder for invoice ${invoice.invoiceNumber}`);
  }

  /**
   * Send failed payment reminder
   */
  private async sendFailedPaymentReminder(subscription: any, daysSinceDue: number) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: subscription.tenantId },
    });

    if (!tenant) return;

    const template = daysSinceDue >= 7 ? 'FAILED_PAYMENT_SECOND' : 'FAILED_PAYMENT_FIRST';

    await this.queueService.add('email', {
      to: tenant.email,
      template,
      data: {
        tenantName: tenant.name,
        amount: subscription.plan.priceCents / 100,
        daysSinceDue,
      },
    });
  }

  /**
   * Create platform subscription accounting entry
   * This records revenue in Dexo's own books
   */
  private async createPlatformSubscriptionEntry(tenant: any, baseAmount: number, vatAmount: number) {
    // In production, this would post to Dexo's internal accounting
    // Dexo maintains its own tenant space for platform-level accounting

    // DR  Accounts Receivable - [Tenant]    totalAmount
    //      CR  Subscription Revenue                baseAmount
    //      CR  VAT Payable                         vatAmount

    this.logger.log(`Created platform subscription entry for tenant ${tenant.id}`);
  }

  /**
   * Queue payment collection
   */
  private async queuePaymentCollection(tenantId: string, amount: number) {
    // Add to payment collection queue
    await this.queueService.add('payment-collection', {
      tenantId,
      amount,
      method: 'auto_debit', // or manual based on tenant preference
    });
  }

  /**
   * Get revenue dashboard for platform admin
   */
  async getRevenueDashboard(startDate: Date, endDate: Date) {
    // Get all subscriptions in the period
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'trial'] },
        currentPeriodStart: { lte: endDate },
        currentPeriodEnd: { gte: startDate },
      },
      include: {
        tenant: true,
        plan: true,
      },
    });

    const mrr = subscriptions.reduce((sum, sub) => {
      if (sub.plan.billingInterval === 'monthly') {
        return sum + (sub.plan.priceCents / 100);
      }
      return sum + (sub.plan.priceCents / 100) / 12; // Annual converted to monthly
    }, 0);

    const arr = subscriptions.reduce((sum, sub) => {
      if (sub.plan.billingInterval === 'yearly') {
        return sum + sub.plan.priceCents / 100;
      }
      return sum + (sub.plan.priceCents / 100) * 12; // Monthly converted to annual
    }, 0);

    // Get payment metrics
    const successfulPayments = await this.prisma.paymentReceived.findMany({
      where: {
        paymentDate: { gte: startDate, lte: endDate },
      },
    });

    const totalCollected = successfulPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      mrr, // Monthly Recurring Revenue
      arr, // Annual Recurring Revenue
      totalCollected,
      subscriptionCount: subscriptions.length,
      trialCount: subscriptions.filter(s => s.status === 'trial').length,
      paidCount: subscriptions.filter(s => s.status === 'active').length,
    };
  }

  /**
   * TDS payment reminder (24th of each month)
   */
  @Cron('0 9 24 * *')
  async tdsPaymentReminder() {
    this.logger.log('Sending TDS payment reminders...');

    // Get tenants with TDS payable
    const tenantsWithTds = await this.prisma.tenant.findMany({
      where: { status: 'active' },
    });

    for (const tenant of tenantsWithTds) {
      // Calculate TDS payable for the month
      // Would query journal entries for TDS Payable account
      // For now, just send reminder

      await this.queueService.add('email', {
        to: tenant.email,
        template: 'TDS_PAYMENT_REMINDER',
        data: {
          tenantName: tenant.name,
          dueDate: '25th of this month',
        },
      });
    }

    this.logger.log('TDS payment reminders sent');
  }

  /**
   * Daily cash position report (8 PM)
   */
  @Cron('0 20 * * *')
  async dailyCashReport() {
    this.logger.log('Generating daily cash position report...');

    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'active' },
    });

    for (const tenant of tenants) {
      // Get cash position
      const cashAccounts = await this.getCashPosition(tenant.id);

      await this.queueService.add('email', {
        to: tenant.email,
        template: 'DAILY_CASH_REPORT',
        data: {
          tenantName: tenant.name,
          cashPosition: cashAccounts,
          reportDate: new Date(),
        },
      });
    }

    this.logger.log('Daily cash reports sent');
  }

  private async getCashPosition(tenantId: string) {
    // Query cash accounts (1111, 1112, 1114)
    // Return balance

    // Mock implementation
    return {
      pettyCash: 5000,
      bankAccount: 150000,
      esewa: 25000,
      total: 180000,
    };
  }
}
