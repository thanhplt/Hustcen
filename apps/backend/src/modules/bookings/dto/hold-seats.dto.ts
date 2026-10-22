import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

export class HoldSeatsDto {
  @ApiProperty({ description: 'Mã suất chiếu (ID)' })
  @IsString()
  @IsNotEmpty()
  showtimeId: string;

  @ApiProperty({ description: 'Danh sách mã ghế (Seat IDs)', example: ['seat-id-1', 'seat-id-2'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 ghế' })
  @IsString({ each: true })
  seatIds: string[];

  @ApiPropertyOptional({ description: 'Mã phiên khách (dành cho khách vãng lai chưa đăng nhập)' })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class ReleaseHoldDto {
  @ApiProperty({ description: 'Mã suất chiếu (ID)' })
  @IsString()
  @IsNotEmpty()
  showtimeId: string;

  @ApiProperty({ description: 'Danh sách mã ghế cần nhả giữ' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  seatIds: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionId?: string;
}
