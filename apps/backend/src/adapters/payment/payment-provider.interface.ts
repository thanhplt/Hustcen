export interface PaymentIntentRequest {
  bookingId: string;
  bookingCode: string;
  amount: number;
  description: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl?: string;
}

export interface PaymentIntentResponse {
  paymentUrl: string;
  transactionRef: string;
  expiresAt: Date;
}

export interface WebhookPayload {
  transactionRef: string;
  bookingCode: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
  signature: string;
  timestamp: string;
}

export interface RefundRequest {
  bookingId: string;
  transactionRef: string;
  amount: number;
  reason: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  timestamp: Date;
}

export interface PaymentProvider {
  createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResponse>;
  verifyWebhookSignature(payload: any, signature: string): boolean;
  processWebhook(payload: WebhookPayload): Promise<boolean>;
  refund(req: RefundRequest): Promise<RefundResponse>;
}
