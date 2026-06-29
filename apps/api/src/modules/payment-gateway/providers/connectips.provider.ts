import * as crypto from 'crypto';
import axios from 'axios';
import {
  IPaymentProvider,
  PaymentInitRequest,
  PaymentInitResponse,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
  PaymentProviderConfig,
} from '../payment-provider.interface';

export class ConnectIpsProvider implements IPaymentProvider {
  readonly name = 'ConnectIPS';
  readonly type = 'CONNECTIPS';

  private getUrls(config: PaymentProviderConfig) {
    const sandbox = config.config?.sandbox ?? true;
    return {
      loginUrl: sandbox
        ? 'https://uat.connectips.com/connectipswebgw/loginpage'
        : 'https://connectips.com/connectipswebgw/loginpage',
      checkTxnUrl: sandbox
        ? 'https://uat.connectips.com/connectipswebws/api/creditor/validatetxn'
        : 'https://connectips.com/connectipswebws/api/creditor/validatetxn',
    };
  }

  /**
   * Generate RSA-SHA256 digital signature for ConnectIPS
   * Uses PFX certificate private key
   */
  private generateSignature(message: string, pfxBuffer: Buffer, pfxPassword: string): string {
    try {
      // Extract private key from PFX
      const p12Asn1 = crypto.createPkcs12(pfxBuffer, pfxPassword);
      const keyData = p12Asn1.toString();

      // For Node.js, we use sign with SHA256
      const sign = crypto.createSign('SHA256');
      sign.update(message);
      sign.end();

      // Sign with the PFX key
      const signature = sign.sign({
        key: pfxBuffer,
        passphrase: pfxPassword,
        format: 'der',
        type: 'pkcs12',
      }, 'base64');

      return signature;
    } catch (error) {
      throw new Error(`Failed to generate ConnectIPS signature: ${error.message}`);
    }
  }

  /**
   * Build the message string for token generation
   * Format: MERCHANTID=<val>, APPID=<val>, APPNAME=<val>, TXNID=<val>, TXNDATE=<val>, TXNCRNCY=<val>, TXNAMT=<val>, REFERENCEID=<val>, REMARKS=<val>, PARTICULARS=<val>, TOKEN=TOKEN
   */
  private buildMessage(params: {
    merchantId: string;
    appId: string;
    appName: string;
    txnId: string;
    txnDate: string;
    txnCrncy: string;
    txnAmt: string;
    referenceId: string;
    remarks: string;
    particulars: string;
  }): string {
    return [
      `MERCHANTID=${params.merchantId}`,
      `APPID=${params.appId}`,
      `APPNAME=${params.appName}`,
      `TXNID=${params.txnId}`,
      `TXNDATE=${params.txnDate}`,
      `TXNCRNCY=${params.txnCrncy}`,
      `TXNAMT=${params.txnAmt}`,
      `REFERENCEID=${params.referenceId}`,
      `REMARKS=${params.remarks}`,
      `PARTICULARS=${params.particulars}`,
      'TOKEN=TOKEN',
    ].join(' , ');
  }

  isConfigured(config: PaymentProviderConfig): boolean {
    return !!(
      config.credentials?.merchantId &&
      config.credentials?.appId &&
      config.credentials?.appName &&
      config.credentials?.password &&
      config.credentials?.pfxBase64 // PFX certificate as base64 string
    );
  }

  async initPayment(
    request: PaymentInitRequest,
    config: PaymentProviderConfig,
  ): Promise<PaymentInitResponse> {
    const { merchantId, appId, appName, password, pfxBase64 } = config.credentials;
    const urls = this.getUrls(config);

    // ConnectIPS uses paisa (1 NPR = 100 paisa)
    const txnAmt = Math.round(request.amount * 100).toString();
    const txnDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '-'); // DD-MM-YYYY

    const message = this.buildMessage({
      merchantId,
      appId,
      appName,
      txnId: request.orderId,
      txnDate,
      txnCrncy: request.currency || 'NPR',
      txnAmt,
      referenceId: request.orderId,
      remarks: request.description || `Payment for ${request.orderId}`,
      particulars: request.description || `Order ${request.orderId}`,
    });

    const pfxBuffer = Buffer.from(pfxBase64, 'base64');
    const token = this.generateSignature(message, pfxBuffer, password);

    // Build form data for POST submission
    const formData: Record<string, string> = {
      MERCHANTID: merchantId,
      APPID: appId,
      APPNAME: appName,
      TXNID: request.orderId,
      TXNDATE: txnDate,
      TXNCRNCY: request.currency || 'NPR',
      TXNAMT: txnAmt,
      REFERENCEID: request.orderId,
      REMARKS: request.description || `Payment for ${request.orderId}`,
      PARTICULARS: request.description || `Order ${request.orderId}`,
      TOKEN: token,
    };

    return {
      paymentUrl: urls.loginUrl,
      paymentMethod: 'redirect',
      formData,
      rawResponse: { loginUrl: urls.loginUrl, formData },
    };
  }

  async verifyPayment(
    request: PaymentVerifyRequest,
    config: PaymentProviderConfig,
  ): Promise<PaymentVerifyResponse> {
    const { merchantId, appId, appName, password, pfxBase64 } = config.credentials;
    const urls = this.getUrls(config);

    try {
      const message = this.buildMessage({
        merchantId,
        appId,
        appName,
        txnId: request.orderId,
        txnDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).replace(/\//g, '-'),
        txnCrncy: 'NPR',
        txnAmt: request.amount ? Math.round(request.amount * 100).toString() : '0',
        referenceId: request.orderId,
        remarks: 'Verification',
        particulars: 'Transaction verification',
      });

      const pfxBuffer = Buffer.from(pfxBase64, 'base64');
      const token = this.generateSignature(message, pfxBuffer, password);

      const response = await axios.post(
        urls.checkTxnUrl,
        {
          MERCHANTID: merchantId,
          APPID: appId,
          APPNAME: appName,
          TXNID: request.orderId,
          TOKEN: token,
        },
        { headers: { 'Content-Type': 'application/json' } },
      );

      const data = response.data;

      if (data.TXNSTATUS === 'SUCCESS' || data.status === 'SUCCESS') {
        return {
          success: true,
          providerTxnId: data.REFERRALCODE || request.providerTxnId,
          status: 'COMPLETED',
          amount: data.TXNAMT ? Number(data.TXNAMT) / 100 : request.amount,
          rawResponse: data,
        };
      }

      return {
        success: false,
        providerTxnId: request.providerTxnId,
        status: 'FAILED',
        rawResponse: data,
        message: data.TXNSTATUS || data.message || 'Verification failed',
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
