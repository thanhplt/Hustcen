import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SeatItemDto {
  @ApiProperty({ description: 'Mã hàng ghế (A, B, C...)', example: 'A' })
  @IsString()
  @IsNotEmpty()
  rowCode: string;

  @ApiProperty({ description: 'Số ghế trong hàng', example: 1 })
  @IsNumber()
  @Type(() => Number)
  seatNumber: number;

  @ApiProperty({ description: 'Nhãn ghế đầy đủ', example: 'A1' })
  @IsString()
  @IsNotEmpty()
  seatLabel: string;

  @ApiProperty({ description: 'Loại ghế', default: 'STANDARD', example: 'VIP' })
  @IsString()
  @IsNotEmpty()
  seatType: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isWheelchair?: boolean = false;
}

export class UpdateSeatMapDto {
  @ApiProperty({ description: 'Cấu hình ma trận sơ đồ phòng chiếu (JSON)' })
  @IsNotEmpty()
  layoutConfig: Record<string, any>;

  @ApiProperty({ type: [SeatItemDto], description: 'Danh sách các ghế trong phòng chiếu' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatItemDto)
  seats: SeatItemDto[];
}
