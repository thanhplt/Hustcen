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
 * MoMo Payment Provider Stub
 * TODO: Integrate MoMo All-In-One API without refactoring domain logic.
 */
@Injectable()
export class MoMoStubService implements PaymentProvider {
  async createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    throw new Error('MoMo is not configured for local development. Use MockGateway instead.');
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    return false;
  }

  async processWebhook(payload: WebhookPayload): Promise<boolean> {
    return false;
  }

  async refund(req: RefundRequest): Promise<RefundResponse> {
    throw new Error('MoMo refund stub.');
  }
}
