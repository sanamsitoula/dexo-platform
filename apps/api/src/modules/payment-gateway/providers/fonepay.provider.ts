import * as crypto from 'crypto';
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

export class FonepayProvider implements IPaymentProvider {
  readonly name = 'Fonepay';
  readonly type = 'FONEPAY';

  private getUrls(config: PaymentProviderConfig) {
    const sandbox = config.config?.sandbox ?? true;
    return {
      initiateUrl: sandbox
        ? 'https://dev-clientapi.fonepay.com/api/merchantRequest'
        : 'https://clientapi.fonepay.com/api/merchantRequest',
      verifyUrl: sandbox
        ? 'https://dev-clientapi.fonepay.com/api/merchantRequest/verificationMerchant'
        : 'https://clientapi.fonepay.com/api/merchantRequest/verificationMerchant',
    };
  }

  /**
   * Generate HMAC-SHA512 signature (DV) for Fonepay
   * Field order: PID, MD, PRN, AMT, CRN, DT, R1, R2, RU
   * Output: Uppercase hexadecimal
   */
  private generateSignature(params: {
    pid: string;
    prn: string;
    amt: string;
    dt: string;
    r1: string;
    r2: string;
    ru: string;
    secretKey: string;
  }): string {
    const md = 'P'; // Always 'P' for payment
    const data = `${params.pid},${md},${params.prn},${params.amt},NPR,${params.dt},${params.r1},${params.r2},${params.ru}`;

    const hmac = crypto.createHmac('sha512', params.secretKey);
    hmac.update(data);
    return hmac.digest('hex').toUpperCase();
  }

  isConfigured(config: PaymentProviderConfig): boolean {
    return !!(config.credentials?.merchantId && config.credentials?.secretKey);
  }

  async initPayment(
    request: PaymentInitRequest,
    config: PaymentProviderConfig,
  ): Promise<PaymentInitResponse> {
    const { merchantId, secretKey } = config.credentials;
    const urls = this.getUrls(config);

    const amt = request.amount.toFixed(2);
    const dt = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
    const r1 = `Order_${request.orderId}`;
    const r2 = 'N/A';
    const ru = request.callbackUrl || request.successUrl;

    const dv = this.generateSignature({
      pid: merchantId,
      prn: request.orderId,
      amt,
      dt,
      r1,
      r2,
      ru,
      secretKey,
    });

    const params = new URLSearchParams({
      PID: merchantId,
      MD: 'P',
      PRN: request.orderId,
      AMT: amt,
      CRN: 'NPR',
      DT: dt,
      R1: r1,
      R2: r2,
      RU: ru,
      DV: dv,
    });

    const fullUrl = `${urls.initiateUrl}?${params.toString()}`;

    return {
      paymentUrl: fullUrl,
      paymentMethod: 'redirect',
      rawResponse: {
        initiateUrl: urls.initiateUrl,
        params: Object.fromEntries(params),
      },
    };
  }

  async verifyPayment(
    request: PaymentVerifyRequest,
    config: PaymentProviderConfig,
  ): Promise<PaymentVerifyResponse> {
    const { merchantId } = config.credentials;
    const urls = this.getUrls(config);

    try {
      const verifyUrl = `${urls.verifyUrl}?PID=${merchantId}&PRN=${request.orderId}&AMT=${request.amount}&BID=${request.providerTxnId}&MD=P`;
      const response = await axios.get(verifyUrl);
      const data = response.data;

      if (data && (data.isSuccess === true || data.status === 'success')) {
        return {
          success: true,
          providerTxnId: request.providerTxnId,
          status: 'COMPLETED',
          amount: request.amount,
          rawResponse: data,
        };
      }

      return {
        success: false,
        providerTxnId: request.providerTxnId,
        status: 'FAILED',
        rawResponse: data,
        message: data?.message || 'Verification failed',
      };
    } catch (error) {
      return {
        success: false,
        providerTxnId: request.providerTxnId,
        status: 'FAILED',
        message: error.message || 'Verification failed',
        rawResponse: error.response?.data,
      };
    }
  }
}
