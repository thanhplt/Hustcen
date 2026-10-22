import { Injectable } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentIntentRequest,
  PaymentIntentResponse,
  WebhookPayload,
  RefundRequest,
  RefundResponse,
} from './payment-provider.interface';

/**
 * VNPay Payment Provider Stub
 * TODO: Integrate VNPay Sandbox / Production API without refactoring domain logic.
 */
@Injectable()
export class VNPayStubService implements PaymentProvider {
  async createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    throw new Error('VNPay is not configured for local development. Use MockGateway instead.');
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    return false;
  }

  async processWebhook(payload: WebhookPayload): Promise<boolean> {
    return false;
  }

  async refund(req: RefundRequest): Promise<RefundResponse> {
    throw new Error('VNPay refund stub.');
  }
}
