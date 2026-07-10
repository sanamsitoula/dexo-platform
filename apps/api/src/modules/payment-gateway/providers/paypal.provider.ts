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

export class PaypalProvider implements IPaymentProvider {
  readonly name = 'PayPal';
  readonly type = 'PAYPAL';

  private getApiBase(config: PaymentProviderConfig): string {
    const sandbox = config.config?.sandbox ?? true;
    return sandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  private async getAccessToken(config: PaymentProviderConfig): Promise<string> {
    const { clientId, clientSecret } = config.credentials;
    const apiBase = this.getApiBase(config);

    const response = await axios.post(
      `${apiBase}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data.access_token;
  }

  isConfigured(config: PaymentProviderConfig): boolean {
    return !!(config.credentials?.clientId && config.credentials?.clientSecret);
  }

  async initPayment(
    request: PaymentInitRequest,
    config: PaymentProviderConfig,
  ): Promise<PaymentInitResponse> {
    const apiBase = this.getApiBase(config);

    try {
      const accessToken = await this.getAccessToken(config);

      const orderPayload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: request.orderId,
            amount: {
              currency_code: request.currency || 'USD',
              value: request.amount.toFixed(2),
            },
            description: request.description || `Order ${request.orderId}`,
          },
        ],
        application_context: {
          return_url: request.successUrl,
          cancel_url: request.failureUrl || request.cancelUrl,
          brand_name: config.config?.brandName || 'Dexo Platform',
          user_action: 'PAY_NOW',
        },
      };

      const response = await axios.post(`${apiBase}/v2/checkout/orders`, orderPayload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
      });

      const order = response.data;
      const approveLink = order.links?.find((l: any) => l.rel === 'approve');

      return {
        paymentUrl: approveLink?.href,
        paymentToken: order.id,
        paymentMethod: 'redirect',
        providerTxnId: order.id,
        rawResponse: order,
      };
    } catch (error: any) {
      throw new Error(`PayPal payment init failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async verifyPayment(
    request: PaymentVerifyRequest,
    config: PaymentProviderConfig,
  ): Promise<PaymentVerifyResponse> {
    const apiBase = this.getApiBase(config);

    try {
      const accessToken = await this.getAccessToken(config);
      const orderId = request.rawParams?.token || request.providerTxnId;

      const response = await axios.get(`${apiBase}/v2/checkout/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const order = response.data;

      if (order.status === 'COMPLETED') {
        const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
        return {
          success: true,
          providerTxnId: capture?.id || order.id,
          status: 'COMPLETED',
          amount: parseFloat(capture?.amount?.value || order.purchase_units?.[0]?.amount?.value || '0'),
          rawResponse: order,
        };
      }

      if (order.status === 'PAYER_ACTION_REQUIRED') {
        return {
          success: false,
          providerTxnId: order.id,
          status: 'PENDING',
          rawResponse: order,
          message: 'Awaiting payer action',
        };
      }

      return {
        success: false,
        providerTxnId: order.id,
        status: 'FAILED',
        rawResponse: order,
        message: `Order status: ${order.status}`,
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
      const accessToken = await this.getAccessToken(config);

      const response = await axios.post(
        `${apiBase}/v2/payments/captures/${request.providerTxnId}/refund`,
        {
          amount: {
            currency_code: config.config?.currency || 'USD',
            value: request.amount.toFixed(2),
          },
          note_to_payer: request.reason || 'Refund processed',
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        },
      );

      const refund = response.data;

      return {
        success: refund.status === 'COMPLETED',
        refundId: refund.id,
        amount: parseFloat(refund.amount?.value || '0'),
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
