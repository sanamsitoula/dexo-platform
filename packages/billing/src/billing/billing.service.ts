import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';
import { CreatePaymentMethodDto, ProcessPaymentDto } from './dto';

// Stripe mock (replace with actual Stripe SDK in production)
export interface StripeCustomer {
  id: string;
  email: string;
  name?: string;
  paymentMethods?: StripePaymentMethod[];
}

export interface StripePaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface StripeInvoice {
  id: string;
  number: string;
  amountDue: number;
  currency: string;
  status: string;
  dueDate?: Date;
  pdfUrl?: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private mockCustomers = new Map<string, StripeCustomer>();
  private mockPaymentMethods = new Map<string, StripePaymentMethod>();
  private mockInvoices = new Map<string, StripeInvoice>();

  constructor(private prisma: PrismaTenantService) {}

  // ========== Payment Methods ==========

  async addPaymentMethod(dto: CreatePaymentMethodDto, tenantId: string) {
    // Get or create Stripe customer for tenant
    let customer = await this.getOrCreateCustomer(tenantId);

    // Mock payment method details (in production, use Stripe SDK)
    const paymentMethod: StripePaymentMethod = {
      id: dto.paymentMethodId,
      type: 'card',
      last4: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2025,
      isDefault: dto.isDefault || false,
    };

    if (dto.isDefault) {
      // Unset other defaults
      customer.paymentMethods?.forEach(pm => pm.isDefault = false);
    }

    if (!customer.paymentMethods) {
      customer.paymentMethods = [];
    }
    customer.paymentMethods.push(paymentMethod);

    this.mockCustomers.set(tenantId, customer);
    this.mockPaymentMethods.set(paymentMethod.id, paymentMethod);

    this.logger.log(`Added payment method ${paymentMethod.id} for tenant ${tenantId}`);

    return paymentMethod;
  }

  async getPaymentMethods(tenantId: string) {
    const customer = this.mockCustomers.get(tenantId);
    return customer?.paymentMethods || [];
  }

  async removePaymentMethod(paymentMethodId: string, tenantId: string) {
    const customer = this.mockCustomers.get(tenantId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const index = customer.paymentMethods?.findIndex(pm => pm.id === paymentMethodId);
    if (index === -1 || index === undefined) {
      throw new NotFoundException('Payment method not found');
    }

    customer.paymentMethods?.splice(index, 1);
    this.mockCustomers.set(tenantId, customer);

    return { message: 'Payment method removed' };
  }

  async setDefaultPaymentMethod(paymentMethodId: string, tenantId: string) {
    const customer = this.mockCustomers.get(tenantId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    customer.paymentMethods?.forEach(pm => pm.isDefault = false);
    const pm = customer.paymentMethods?.find(p => p.id === paymentMethodId);
    if (pm) {
      pm.isDefault = true;
    }

    this.mockCustomers.set(tenantId, customer);

    return { message: 'Default payment method updated' };
  }

  // ========== Payments ==========

  async processPayment(tenantId: string, dto: ProcessPaymentDto) {
    const customer = this.mockCustomers.get(tenantId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const paymentMethod = customer.paymentMethods?.find(pm => pm.id === dto.paymentMethodId);
    if (!paymentMethod) {
      throw new BadRequestException('Payment method not found');
    }

    // Mock payment processing
    const paymentIntent = {
      id: `pi_${Date.now()}`,
      amount: dto.amountInCents,
      currency: dto.currency,
      status: 'succeeded',
      paymentMethodId: dto.paymentMethodId,
      description: dto.description,
      metadata: dto.metadata,
      createdAt: new Date(),
    };

    this.logger.log(`Processed payment ${paymentIntent.id} for ${dto.amountInCents / 100} ${dto.currency}`);

    return paymentIntent;
  }

  async refundPayment(paymentIntentId: string, amountInCents?: number) {
    // Mock refund
    const refund = {
      id: `re_${Date.now()}`,
      paymentIntentId,
      amount: amountInCents,
      status: 'succeeded',
      createdAt: new Date(),
    };

    this.logger.log(`Refunded payment ${paymentIntentId}`);

    return refund;
  }

  // ========== Invoices ==========

  async createInvoice(subscriptionId: string, dueDate?: Date) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true, tenant: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const invoiceNumber = `INV-${Date.now()}`;
    const invoice: StripeInvoice = {
      id: `in_${Date.now()}`,
      number: invoiceNumber,
      amountDue: subscription.plan.priceCents,
      currency: subscription.plan.currency,
      status: 'pending',
      dueDate,
    };

    this.mockInvoices.set(invoice.id, invoice);

    this.logger.log(`Created invoice ${invoiceNumber} for subscription ${subscriptionId}`);

    return invoice;
  }

  async getInvoices(tenantId?: string) {
    const invoices = Array.from(this.mockInvoices.values());
    // Filter by tenant if needed (would require tenantId on invoice)
    return invoices;
  }

  async getInvoice(invoiceId: string) {
    const invoice = this.mockInvoices.get(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async generateInvoicePdf(invoiceId: string) {
    const invoice = await this.getInvoice(invoiceId);

    // Mock PDF generation
    const pdfUrl = `https://example.com/invoices/${invoiceId}.pdf`;

    return { invoiceId, pdfUrl };
  }

  // ========== Customer Management ==========

  private async getOrCreateCustomer(tenantId: string): Promise<StripeCustomer> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    let customer = this.mockCustomers.get(tenantId);

    if (!customer) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      customer = {
        id: `cus_${tenantId}`,
        email: `billing@${tenant.subdomain || tenant.name}.example.com`,
        name: tenant.name,
        paymentMethods: [],
      };

      this.mockCustomers.set(tenantId, customer);
    }

    return customer;
  }

  async getCustomer(tenantId: string) {
    return this.getOrCreateCustomer(tenantId);
  }

  // ========== Billing Analytics ==========

  async getRevenueStats(startDate: Date, endDate: Date) {
    // Mock revenue stats
    return {
      totalRevenue: 150000, // cents
      currency: 'USD',
      paymentCount: 45,
      refundCount: 2,
      refundAmount: 10000,
      averagePayment: 3333,
    };
  }

  async getBillingSummary(tenantId: string) {
    const customer = await this.getOrCreateCustomer(tenantId);
    const invoices = await this.getInvoices();

    return {
      customerId: customer.id,
      paymentMethodCount: customer.paymentMethods?.length || 0,
      pendingInvoices: invoices.filter(i => i.status === 'pending').length,
      totalDue: invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amountDue, 0),
    };
  }

  // ========== Webhooks ==========

  async handleWebhook(event: string, data: any) {
    switch (event) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(data);
        break;
      case 'payment_intent.failed':
        await this.handlePaymentFailed(data);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(data);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(data);
        break;
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(data);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(data);
        break;
      default:
        this.logger.log(`Unhandled webhook event: ${event}`);
    }

    return { received: true };
  }

  private async handlePaymentSucceeded(data: any) {
    this.logger.log(`Payment succeeded: ${data.id}`);
    // Update subscription status, send notification, etc.
  }

  private async handlePaymentFailed(data: any) {
    this.logger.log(`Payment failed: ${data.id}`);
    // Handle failed payment, retry logic, notify customer
  }

  private async handleInvoicePaymentSucceeded(data: any) {
    this.logger.log(`Invoice payment succeeded: ${data.id}`);
  }

  private async handleInvoicePaymentFailed(data: any) {
    this.logger.log(`Invoice payment failed: ${data.id}`);
  }

  private async handleSubscriptionCreated(data: any) {
    this.logger.log(`Subscription created: ${data.id}`);
  }

  private async handleSubscriptionDeleted(data: any) {
    this.logger.log(`Subscription deleted: ${data.id}`);
  }
}
