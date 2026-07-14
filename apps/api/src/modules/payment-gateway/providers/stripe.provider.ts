import axios from 'axios';
import {
  IPaymentProvider,
  PaymentInitRequest,
  PaymentInitResponse,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
  PaymentRefundRequest,
  PaymentRefundResponse,
  PaymentProviderConfig,
} from '../payment-provider.interface';

export class StripeProvider implements IPaymentProvider {
  readonly name = 'Stripe';
  readonly type = 'STRIPE';

  private getApiBase(config: PaymentProviderConfig): string {
    const sandbox = config.config?.sandbox ?? true;
    return sandbox
      ? 'https://api.stripe.com/v1'
      : 'https://api.stripe.com/v1';
  }

  /** Tenants that have gone through Stripe Connect onboarding don't hold
   * their own secret key — payments run through Dexo's platform Stripe
   * account and are routed to the tenant via transfer_data.destination. */
  private getAuth(config: PaymentProviderConfig): string {
    const secretKey = config.credentials?.secretKey || process.env.STRIPE_SECRET_KEY;
    return `Bearer ${secretKey}`;
  }

  private getConnectAccountId(config: PaymentProviderConfig): string | undefined {
    return config.config?.connect?.accountId;
  }

  isConfigured(config: PaymentProviderConfig): boolean {
    const hasOwnKeys = !!(config.credentials?.secretKey && config.credentials?.publishableKey);
    const hasConnectAccount = !!this.getConnectAccountId(config) && config.config?.connect?.chargesEnabled;
    return hasOwnKeys || hasConnectAccount;
  }

  async initPayment(
    request: PaymentInitRequest,
    config: PaymentProviderConfig,
  ): Promise<PaymentInitResponse> {
    const apiBase = this.getApiBase(config);
    const { publishableKey } = config.credentials;

    try {
      // Create a Checkout Session via Stripe API
      const params = new URLSearchParams();
      params.append('payment_method_types[]', 'card');
      params.append('mode', 'payment');
      params.append('success_url', request.successUrl);
      params.append('cancel_url', request.failureUrl);
      params.append('client_reference_id', request.orderId);

      if (request.customerEmail) {
        params.append('customer_email', request.customerEmail);
      }

      // Line items
      params.append('line_items[0][price_data][currency]', request.currency?.toLowerCase() || 'usd');
      params.append('line_items[0][price_data][unit_amount]', Math.round(request.amount * 100).toString());
      params.append('line_items[0][price_data][product_data][name]', request.description || `Order ${request.orderId}`);
      params.append('line_items[0][quantity]', '1');

      // Metadata
      if (request.metadata) {
        for (const [key, value] of Object.entries(request.metadata)) {
          params.append(`metadata[${key}]`, String(value));
        }
      }
      params.append('metadata[orderId]', request.orderId);

      const connectAccountId = this.getConnectAccountId(config);
      if (connectAccountId) {
        params.append('payment_intent_data[transfer_data][destination]', connectAccountId);
      }

      const response = await axios.post(`${apiBase}/checkout/sessions`, params, {
        headers: {
          Authorization: this.getAuth(config),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const session = response.data;

      return {
        paymentUrl: session.url,
        paymentToken: session.id,
        paymentMethod: 'sdk',
        providerTxnId: session.payment_intent,
        rawResponse: session,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment init failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async verifyPayment(
    request: PaymentVerifyRequest,
    config: PaymentProviderConfig,
  ): Promise<PaymentVerifyResponse> {
    const apiBase = this.getApiBase(config);

    try {
      // Retrieve the checkout session or payment intent
      const sessionId = request.rawParams?.session_id || request.providerTxnId;
      const response = await axios.get(`${apiBase}/checkout/sessions/${sessionId}`, {
        headers: { Authorization: this.getAuth(config) },
      });

      const session = response.data;

      if (session.payment_status === 'paid') {
        return {
          success: true,
          providerTxnId: session.payment_intent,
          status: 'COMPLETED',
          amount: session.amount_total / 100,
          rawResponse: session,
        };
      }

      return {
        success: false,
        providerTxnId: request.providerTxnId,
        status: session.payment_status === 'unpaid' ? 'PENDING' : 'FAILED',
        rawResponse: session,
        message: `Payment status: ${session.payment_status}`,
      };
    } catch (error: any) {
      return {
        success: false,
        providerTxnId: request.providerTxnId,
        status: 'FAILED',
        message: error.message || 'Verification failed',
        rawResponse: error.response?.data,
      };
    }
  }

  async refundPayment(
    request: PaymentRefundRequest,
    config: PaymentProviderConfig,
  ): Promise<PaymentRefundResponse> {
    const apiBase = this.getApiBase(config);

    try {
      const params = new URLSearchParams();
      params.append('payment_intent', request.providerTxnId);
      params.append('amount', Math.round(request.amount * 100).toString());
      if (request.reason) {
        params.append('reason', 'requested_by_customer');
      }

      const response = await axios.post(`${apiBase}/refunds`, params, {
        headers: {
          Authorization: this.getAuth(config),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const refund = response.data;

      return {
        success: refund.status === 'succeeded',
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        rawResponse: refund,
      };
    } catch (error: any) {
      return {
        success: false,
        rawResponse: error.response?.data,
      };
    }
  }
}
