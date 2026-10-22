import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ description: 'Thời gian đóng đặt vé trước giờ chiếu (phút)', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  bookingCutoffMinutes?: number;

  @ApiPropertyOptional({ description: 'Thời gian cảnh báo sắp đóng đặt vé (phút)', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  closingSoonMinutes?: number;

  @ApiPropertyOptional({ description: 'Khoảng cách thời gian dọn dẹp phòng giữa 2 suất chiếu (phút)', example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cleaningBufferMinutes?: number;

  @ApiPropertyOptional({ description: 'Thời gian giữ ghế chờ thanh toán (phút)', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  seatHoldMinutes?: number;
}
