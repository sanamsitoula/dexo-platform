import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { IPaymentProvider, PaymentInitRequest, PaymentInitResponse, PaymentVerifyRequest, PaymentVerifyResponse, PaymentRefundRequest, PaymentRefundResponse, PaymentProviderConfig } from './payment-provider.interface';
import { EsewaProvider, FonepayProvider, ConnectIpsProvider, StripeProvider, PaypalProvider } from './providers';

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  private providers: Map<string, IPaymentProvider> = new Map();

  constructor(private prisma: PrismaService) {
    // Register all built-in providers
    this.registerProvider(new EsewaProvider());
    this.registerProvider(new FonepayProvider());
    this.registerProvider(new ConnectIpsProvider());
    this.registerProvider(new StripeProvider());
    this.registerProvider(new PaypalProvider());
  }

  registerProvider(provider: IPaymentProvider): void {
    this.providers.set(provider.type, provider);
    this.logger.log(`Registered payment provider: ${provider.name} (${provider.type})`);
  }

  getProvider(type: string): IPaymentProvider | undefined {
    return this.providers.get(type);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider config for a tenant (or platform-level)
   */
  async getProviderConfig(tenantId: string | null, providerType: string) {
    return this.prisma.paymentProvider.findFirst({
      where: {
        tenantId,
        type: providerType as any,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Get all active providers for a tenant
   */
  async getTenantProviders(tenantId: string) {
    return this.prisma.paymentProvider.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Configure a payment provider for a tenant
   */
  async configureProvider(tenantId: string, data: {
    type: string;
    name: string;
    credentials: Record<string, any>;
    config?: Record<string, any>;
    isDefault?: boolean;
    transactionFeePercent?: number;
    fixedFee?: number;
    supportedCurrencies?: string[];
  }) {
    // Validate provider type
    const provider = this.providers.get(data.type);
    if (!provider) {
      throw new Error(`Unknown provider type: ${data.type}`);
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.paymentProvider.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.paymentProvider.upsert({
      where: {
        tenantId_type: {
          tenantId,
          type: data.type as any,
        },
      },
      update: {
        name: data.name,
        credentials: data.credentials,
        config: data.config || {},
        isDefault: data.isDefault ?? false,
        status: 'ACTIVE',
        transactionFeePercent: data.transactionFeePercent,
        fixedFee: data.fixedFee,
        supportedCurrencies: data.supportedCurrencies || ['NPR'],
      },
      create: {
        tenantId,
        type: data.type as any,
        name: data.name,
        credentials: data.credentials,
        config: data.config || {},
        isDefault: data.isDefault ?? false,
        status: 'ACTIVE',
        transactionFeePercent: data.transactionFeePercent,
        fixedFee: data.fixedFee,
        supportedCurrencies: data.supportedCurrencies || ['NPR'],
      },
    });
  }

  /**
   * Initialize a payment through a configured provider
   */
  async initPayment(tenantId: string, providerType: string, request: PaymentInitRequest): Promise<PaymentInitResponse> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Unknown provider type: ${providerType}`);
    }

    const providerRecord = await this.getProviderConfig(tenantId, providerType);
    if (!providerRecord) {
      throw new Error(`Provider ${providerType} is not configured for this tenant`);
    }

    const providerConfig: PaymentProviderConfig = {
      credentials: providerRecord.credentials as Record<string, any>,
      config: providerRecord.config as Record<string, any>,
    };

    if (!provider.isConfigured(providerConfig)) {
      throw new Error(`Provider ${providerType} is missing required credentials`);
    }

    // Create payment transaction record
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        tenantId,
        providerId: providerRecord.id,
        internalOrderId: request.orderId,
        amount: request.amount,
        currency: request.currency || 'NPR',
        status: 'INITIATED',
        type: 'PAYMENT',
        description: request.description,
        customerEmail: request.customerEmail,
        customerPhone: request.customerPhone,
        customerName: request.customerName,
        successUrl: request.successUrl,
        failureUrl: request.failureUrl,
        cancelUrl: request.cancelUrl,
        callbackUrl: request.callbackUrl,
        metadata: request.metadata as any,
        ipAddress: request.metadata?.ipAddress,
        userAgent: request.metadata?.userAgent,
      },
    });

    try {
      const response = await provider.initPayment(request, providerConfig);

      // Update transaction with provider response
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          providerTxnId: response.providerTxnId,
          paymentMethod: response.paymentMethod,
          providerRequest: { orderId: request.orderId, amount: request.amount } as any,
          providerResponse: response.rawResponse as any,
          status: 'PENDING',
        },
      });

      return response;
    } catch (error) {
      // Mark transaction as failed
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          providerResponse: { error: error.message } as any,
        },
      });
      throw error;
    }
  }

  /**
   * Verify a payment after callback
   */
  async verifyPayment(tenantId: string, providerType: string, request: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Unknown provider type: ${providerType}`);
    }

    const providerRecord = await this.getProviderConfig(tenantId, providerType);
    if (!providerRecord) {
      throw new Error(`Provider ${providerType} is not configured for this tenant`);
    }

    const providerConfig: PaymentProviderConfig = {
      credentials: providerRecord.credentials as Record<string, any>,
      config: providerRecord.config as Record<string, any>,
    };

    const response = await provider.verifyPayment(request, providerConfig);

    // Update transaction record
    const updateData: any = {
      verifiedAt: new Date(),
      verifiedBy: request.rawParams ? 'callback' : 'manual',
      providerResponse: response.rawResponse as any,
    };

    if (response.status === 'COMPLETED') {
      updateData.status = 'COMPLETED';
      if (response.amount) {
        updateData.netAmount = response.amount - (providerRecord.transactionFeePercent
          ? (response.amount * Number(providerRecord.transactionFeePercent) / 100)
          : Number(providerRecord.fixedFee || 0));
      }
    } else if (response.status === 'FAILED') {
      updateData.status = 'FAILED';
    } else if (response.status === 'PENDING') {
      updateData.status = 'PENDING';
    } else if (response.status === 'CANCELLED') {
      updateData.status = 'CANCELLED';
    }

    await this.prisma.paymentTransaction.updateMany({
      where: {
        tenantId,
        internalOrderId: request.orderId,
      },
      data: updateData,
    });

    return response;
  }

  /**
   * Process a refund
   */
  async refundPayment(tenantId: string, providerType: string, request: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Unknown provider type: ${providerType}`);
    }

    if (!provider.refundPayment) {
      throw new Error(`Provider ${providerType} does not support refunds`);
    }

    const providerRecord = await this.getProviderConfig(tenantId, providerType);
    if (!providerRecord) {
      throw new Error(`Provider ${providerType} is not configured for this tenant`);
    }

    const providerConfig: PaymentProviderConfig = {
      credentials: providerRecord.credentials as Record<string, any>,
      config: providerRecord.config as Record<string, any>,
    };

    const response = await provider.refundPayment(request, providerConfig);

    // Create refund transaction record
    if (response.success) {
      await this.prisma.paymentTransaction.create({
        data: {
          tenantId,
          providerId: providerRecord.id,
          internalOrderId: `REFUND-${request.providerTxnId}`,
          providerTxnId: response.refundId,
          amount: request.amount,
          currency: 'NPR',
          fee: 0,
          type: 'REFUND',
          status: 'COMPLETED',
          description: request.reason || 'Refund',
          refundedAmount: request.amount,
          refundReason: request.reason,
          providerResponse: response.rawResponse as any,
        },
      });
    }

    return response;
  }

  /**
   * Get transaction history for a tenant
   */
  async getTransactions(tenantId: string, filters?: {
    status?: string;
    providerType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { tenantId };
    if (filters?.status) where.status = filters.status;
    if (filters?.providerType) {
      where.provider = { type: filters.providerType };
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        include: { provider: { select: { name: true, type: true } } },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.paymentTransaction.count({ where }),
    ]);

    return { data: transactions, meta: { total, limit: filters?.limit || 50, offset: filters?.offset || 0 } };
  }

  /**
   * Get payment statistics for a tenant
   */
  async getStats(tenantId: string) {
    const [totalTransactions, completedTransactions, totalAmount, completedAmount] = await Promise.all([
      this.prisma.paymentTransaction.count({ where: { tenantId, type: 'PAYMENT' } }),
      this.prisma.paymentTransaction.count({ where: { tenantId, type: 'PAYMENT', status: 'COMPLETED' } }),
      this.prisma.paymentTransaction.aggregate({
        where: { tenantId, type: 'PAYMENT' },
        _sum: { amount: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: { tenantId, type: 'PAYMENT', status: 'COMPLETED' },
        _sum: { amount: true, netAmount: true },
      }),
    ]);

    return {
      totalTransactions,
      completedTransactions,
      successRate: totalTransactions > 0 ? ((completedTransactions / totalTransactions) * 100).toFixed(2) : '0',
      totalAmount: totalAmount._sum.amount || 0,
      completedAmount: completedAmount._sum.amount || 0,
      netAmount: completedAmount._sum.netAmount || 0,
    };
  }
}
