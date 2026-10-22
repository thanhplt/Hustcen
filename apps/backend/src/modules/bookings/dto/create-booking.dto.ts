import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsOptional,
  IsEmail,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BookingComboItemDto {
  @ApiProperty({ description: 'Mã combo bắp nước' })
  @IsString()
  @IsNotEmpty()
  comboId: string;

  @ApiProperty({ description: 'Số lượng', example: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CalculatePriceDto {
  @ApiProperty({ description: 'Mã suất chiếu (ID)' })
  @IsString()
  @IsNotEmpty()
  showtimeId: string;

  @ApiProperty({ description: 'Danh sách mã ghế' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  seatIds: string[];

  @ApiPropertyOptional({ type: [BookingComboItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingComboItemDto)
  combos?: BookingComboItemDto[];

  @ApiPropertyOptional({ description: 'Mã giảm giá / Voucher', example: 'HUSTSTUDENT' })
  @IsOptional()
  @IsString()
  voucherCode?: string;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'Mã suất chiếu (ID)' })
  @IsString()
  @IsNotEmpty()
  showtimeId: string;

  @ApiProperty({ description: 'Danh sách mã ghế' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  seatIds: string[];

  @ApiPropertyOptional({ type: [BookingComboItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingComboItemDto)
  combos?: BookingComboItemDto[];

  @ApiPropertyOptional({ description: 'Mã giảm giá / Voucher' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'Họ tên khách (nếu chưa đăng nhập)' })
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiPropertyOptional({ description: 'Email nhận vé (nếu chưa đăng nhập)' })
  @IsOptional()
  @IsEmail({}, { message: 'Email khách hàng không hợp lệ' })
  guestEmail?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại khách hàng (nếu chưa đăng nhập)' })
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiPropertyOptional({ description: 'Mã phiên khách vãng lai' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
