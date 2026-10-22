import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class DashboardFilterDto {
  @ApiPropertyOptional({ description: 'Lọc theo cụm rạp' })
  @IsOptional()
  @IsString()
  cinemaId?: string;

  @ApiPropertyOptional({ description: 'Số ngày thống kê biểu đồ', default: 7 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  days?: number = 7;
}
