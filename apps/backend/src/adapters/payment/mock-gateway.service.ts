import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PaymentProvider,
  PaymentIntentRequest,
  PaymentIntentResponse,
  WebhookPayload,
  RefundRequest,
  RefundResponse,
} from './payment-provider.interface';

@Injectable()
export class MockGatewayService implements PaymentProvider {
  private readonly logger = new Logger(MockGatewayService.name);
  private readonly secretKey = process.env.PAYMENT_WEBHOOK_SECRET || 'hustcine-mock-webhook-secret-2026';
  private readonly frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  async createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const transactionRef = `MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const paymentUrl = `${this.frontendUrl}/payment/mock?bookingId=${req.bookingId}&bookingCode=${encodeURIComponent(
      req.bookingCode,
    )}&amount=${req.amount}&ref=${transactionRef}`;

    this.logger.log(`Created Mock Payment Intent for ${req.bookingCode}: ${transactionRef}`);

    return {
      paymentUrl,
      transactionRef,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    };
  }

  generateSignature(data: Record<string, any>): string {
    const payload = Object.keys(data)
      .sort()
      .filter((k) => k !== 'signature')
      .map((k) => `${k}=${data[k]}`)
      .join('&');

    return crypto.createHmac('sha256', this.secretKey).update(payload).digest('hex');
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    if (!signature) return false;
    const expectedSignature = this.generateSignature(payload);
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }

  async processWebhook(payload: WebhookPayload): Promise<boolean> {
    this.logger.log(`Processing Mock Webhook for Ref: ${payload.transactionRef}, Status: ${payload.status}`);
    return payload.status === 'SUCCESS';
  }

  async refund(req: RefundRequest): Promise<RefundResponse> {
    this.logger.log(`Processed Mock Refund for Ref ${req.transactionRef}, Amount: ${req.amount}`);
    return {
      success: true,
      refundId: `REFUND_${Date.now()}`,
      amount: req.amount,
      timestamp: new Date(),
    };
  }
}
