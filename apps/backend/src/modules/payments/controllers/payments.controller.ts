import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import * as jwt from 'jsonwebtoken';
import { PaymentsService } from '../services/payments.service';
import {
  CreatePaymentIntentDto,
  ProcessMockPaymentDto,
  PaymentWebhookDto,
} from '../dto/payment.dto';

function extractUserIdFromReq(req: any): string | undefined {
  if (req?.user?.id) return req.user.id;
  if (req?.user?.sub) return req.user.sub;
  const authHeader = req?.headers?.['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const jwtSecret = process.env.JWT_SECRET || 'hustcine-dev-secret-access-token-key-2026';
      const decoded: any = jwt.verify(token, jwtSecret);
      return decoded.id || decoded.sub;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

@ApiTags('Payments - Mock Gateway & Webhook')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Tạo intent thanh toán (trả về paymentUrl, ref và thời hạn thanh toán)' })
  createPaymentIntent(@Body() dto: CreatePaymentIntentDto, @Req() req: any) {
    const userId = extractUserIdFromReq(req);
    return this.paymentsService.createPaymentIntent(dto, userId);
  }

  @Get('mock/:ref')
  @ApiOperation({ summary: 'Lấy thông tin đơn hàng hiển thị trên trang cổng thanh toán Mock' })
  getMockPaymentDetails(@Param('ref') ref: string) {
    return this.paymentsService.getMockPaymentDetails(ref);
  }

  @Post('mock/process')
  @ApiOperation({ summary: 'Mô phỏng khách bấm "Thanh toán thành công" hoặc "Hủy" trên trang cổng thanh toán' })
  processMockPayment(@Body() dto: ProcessMockPaymentDto) {
    return this.paymentsService.processMockPayment(dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Nhận Webhook có chữ ký số HMAC-SHA256 từ cổng thanh toán' })
  handleWebhook(@Body() payload: PaymentWebhookDto) {
    return this.paymentsService.handleWebhook(payload);
  }
}
