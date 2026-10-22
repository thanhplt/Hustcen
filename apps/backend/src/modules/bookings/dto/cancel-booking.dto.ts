import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelBookingDto {
  @ApiPropertyOptional({ description: 'Lý do hủy đơn đặt vé', example: 'Tôi có việc bận đột xuất' })
  @IsOptional()
  @IsString()
  reason?: string;
}
