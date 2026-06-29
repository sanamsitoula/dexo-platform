export interface PaymentInitRequest {
  orderId: string;
  amount: number;
  currency: string;
  description?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  successUrl: string;
  failureUrl: string;
  cancelUrl?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitResponse {
  paymentUrl?: string;       // Redirect URL for user (eSewa, Fonepay, ConnectIPS)
  paymentToken?: string;     // Token for client-side SDK (Stripe, PayPal)
  paymentMethod?: string;    // How to present payment (redirect, sdk, qr)
  providerTxnId?: string;    // Provider's transaction reference
  formData?: Record<string, string>; // Form data for POST redirect (eSewa)
  qrCodeUrl?: string;        // QR code data URL (Fonepay QR)
  rawResponse?: any;         // Raw provider response for debugging
}

export interface PaymentVerifyRequest {
  providerTxnId: string;
  orderId: string;
  amount?: number;
  rawParams?: Record<string, any>; // Callback query params
}

export interface PaymentVerifyResponse {
  success: boolean;
  providerTxnId: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING' | 'CANCELLED' | 'AMBIGUOUS';
  amount?: number;
  fee?: number;
  rawResponse?: any;
  message?: string;
}

export interface PaymentRefundRequest {
  providerTxnId: string;
  amount: number;
  reason?: string;
}

export interface PaymentRefundResponse {
  success: boolean;
  refundId?: string;
  amount?: number;
  status?: string;
  rawResponse?: any;
}

export interface PaymentProviderConfig {
  credentials: Record<string, any>;
  config?: Record<string, any>;
}

export interface IPaymentProvider {
  readonly name: string;
  readonly type: string;

  /** Initialize a payment and return redirect URL or token */
  initPayment(request: PaymentInitRequest, config: PaymentProviderConfig): Promise<PaymentInitResponse>;

  /** Verify a payment after callback or manual check */
  verifyPayment(request: PaymentVerifyRequest, config: PaymentProviderConfig): Promise<PaymentVerifyResponse>;

  /** Refund a completed payment */
  refundPayment?(request: PaymentRefundRequest, config: PaymentProviderConfig): Promise<PaymentRefundResponse>;

  /** Check if provider is configured with valid credentials */
  isConfigured(config: PaymentProviderConfig): boolean;
}
