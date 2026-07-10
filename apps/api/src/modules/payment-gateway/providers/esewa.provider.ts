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

export class EsewaProvider implements IPaymentProvider {
  readonly name = 'eSewa';
  readonly type = 'ESEWA';

  private getUrls(config: PaymentProviderConfig) {
    const sandbox = config.config?.sandbox ?? true;
    return {
      initiateUrl: sandbox
        ? 'https://rc-epay.esewa.com.np/api/epay/main/v2/form'
        : 'https://epay.esewa.com.np/api/epay/main/v2/form',
      statusUrl: sandbox
        ? 'https://rc.esewa.com.np/api/epay/transaction/status/'
        : 'https://esewa.com.np/api/epay/transaction/status/',
    };
  }

  /**
   * Generate HMAC-SHA256 signature for eSewa
   * Fields: total_amount, transaction_uuid, product_code
   */
  private generateSignature(
    totalAmount: number,
    transactionUuid: string,
    productCode: string,
    secretKey: string,
  ): string {
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(message);
    return hmac.digest('base64');
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

    const totalAmount = request.amount;
    const taxAmount = 0;
    const serviceCharge = 0;
    const deliveryCharge = 0;

    const signature = this.generateSignature(
      totalAmount,
      request.orderId,
      merchantId,
      secretKey,
    );

    const formData: Record<string, string> = {
      amount: request.amount.toString(),
      tax_amount: taxAmount.toString(),
      total_amount: totalAmount.toString(),
      transaction_uuid: request.orderId,
      product_code: merchantId,
      product_service_charge: serviceCharge.toString(),
      product_delivery_charge: deliveryCharge.toString(),
      success_url: request.successUrl,
      failure_url: request.failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    };

    return {
      paymentUrl: urls.initiateUrl,
      paymentMethod: 'redirect',
      formData,
      rawResponse: { formData, initiateUrl: urls.initiateUrl },
    };
  }

  async verifyPayment(
    request: PaymentVerifyRequest,
    config: PaymentProviderConfig,
  ): Promise<PaymentVerifyResponse> {
    const { merchantId } = config.credentials;
    const urls = this.getUrls(config);

    try {
      const statusUrl = `${urls.statusUrl}?product_code=${merchantId}&total_amount=${request.amount}&transaction_uuid=${request.orderId}`;
      const response = await axios.get(statusUrl);
      const data = response.data;

      if (data.status === 'COMPLETE') {
        return {
          success: true,
          providerTxnId: data.ref_id || request.providerTxnId,
          status: 'COMPLETED',
          amount: data.total_amount,
          rawResponse: data,
        };
      }

      if (data.status === 'PENDING') {
        return {
          success: false,
          providerTxnId: request.providerTxnId,
          status: 'PENDING',
          rawResponse: data,
          message: 'Payment is pending',
        };
      }

      return {
        success: false,
        providerTxnId: request.providerTxnId,
        status: 'FAILED',
        rawResponse: data,
        message: `Payment status: ${data.status}`,
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
}
