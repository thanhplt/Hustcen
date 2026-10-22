import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingComboItemDto } from '../../bookings/dto/create-booking.dto';
import { PaymentMethod } from '../../payments/dto/payment.dto';

export class ScanTicketDto {
  @ApiProperty({ description: 'Chuỗi mã QR vé điện tử (HMAC signed QR token)' })
  @IsString()
  @IsNotEmpty({ message: 'Mã QR vé không được để trống' })
  qrToken: string;
}

export class PosSellDto {
  @ApiProperty({ description: 'Mã suất chiếu (ID)' })
  @IsString()
  @IsNotEmpty()
  showtimeId: string;

  @ApiProperty({ description: 'Danh sách mã ghế chọn bán' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 ghế' })
  @IsString({ each: true })
  seatIds: string[];

  @ApiPropertyOptional({ type: [BookingComboItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingComboItemDto)
  combos?: BookingComboItemDto[];

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod = PaymentMethod.CASH;

  @ApiPropertyOptional({ description: 'Mã voucher giảm giá nếu có' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'Họ tên khách mua tại quầy' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại khách mua tại quầy' })
  @IsOptional()
  @IsString()
  customerPhone?: string;
}
