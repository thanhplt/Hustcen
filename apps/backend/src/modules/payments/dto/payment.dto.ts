import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  MOCK_GATEWAY = 'MOCK_GATEWAY',
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
}

export enum MockPaymentStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Mã đơn hàng (Booking ID)' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.MOCK_GATEWAY })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod = PaymentMethod.MOCK_GATEWAY;
}

export class ProcessMockPaymentDto {
  @ApiProperty({ description: 'Mã giao dịch cổng thanh toán (transactionRef)', example: 'MOCK_123456' })
  @IsString()
  @IsNotEmpty()
  transactionRef: string;

  @ApiProperty({ enum: MockPaymentStatus, default: MockPaymentStatus.SUCCESS })
  @IsEnum(MockPaymentStatus)
  status: MockPaymentStatus;
}

export class PaymentWebhookDto {
  @ApiProperty({ description: 'Mã giao dịch' })
  @IsString()
  @IsNotEmpty()
  transactionRef: string;

  @ApiProperty({ description: 'Mã đơn hàng' })
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @ApiProperty({ description: 'Số tiền thanh toán' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ description: 'Trạng thái' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'Chữ ký HMAC SHA-256' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}
