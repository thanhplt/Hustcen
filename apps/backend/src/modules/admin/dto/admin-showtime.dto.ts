import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShowtimeDto {
  @ApiProperty({ description: 'Mã phim (ID)' })
  @IsString()
  @IsNotEmpty()
  movieId: string;

  @ApiProperty({ description: 'Mã rạp (ID)' })
  @IsString()
  @IsNotEmpty()
  cinemaId: string;

  @ApiProperty({ description: 'Mã phòng chiếu (ID)' })
  @IsString()
  @IsNotEmpty()
  auditoriumId: string;

  @ApiProperty({ description: 'Định dạng chiếu: 2D, 3D, IMAX', default: '2D' })
  @IsString()
  @IsNotEmpty()
  format: string;

  @ApiProperty({ description: 'Thời gian bắt đầu (ISO Date string)', example: '2026-10-25T14:30:00.000Z' })
  @IsString()
  @IsNotEmpty()
  startAt: string;

  @ApiPropertyOptional({ description: 'Thời gian kết thúc (ISO Date string), tự tính nếu bỏ trống' })
  @IsOptional()
  @IsString()
  endAt?: string;

  @ApiProperty({ description: 'Giá vé cơ bản (VNĐ)', example: 95000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice: number;
}

export class CreateShowtimeSeriesDto {
  @ApiProperty({ description: 'Mã phim (ID)' })
  @IsString()
  @IsNotEmpty()
  movieId: string;

  @ApiProperty({ description: 'Mã rạp (ID)' })
  @IsString()
  @IsNotEmpty()
  cinemaId: string;

  @ApiProperty({ description: 'Mã phòng chiếu (ID)' })
  @IsString()
  @IsNotEmpty()
  auditoriumId: string;

  @ApiProperty({ description: 'Định dạng chiếu: 2D, 3D, IMAX', default: '2D' })
  @IsString()
  @IsNotEmpty()
  format: string;

  @ApiProperty({ description: 'Giờ chiếu mỗi ngày (HH:mm, 24-hour format)', example: '14:30' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Giờ chiếu phải đúng định dạng HH:mm (ví dụ 14:30)' })
  timeOfDay: string;

  @ApiProperty({
    description: 'Các ngày trong tuần lặp lại (1=Thứ 2, 2=Thứ 3, ..., 7=Chủ Nhật)',
    example: [1, 2, 3, 4, 5],
  })
  @IsArray()
  daysOfWeek: number[];

  @ApiProperty({ description: 'Ngày bắt đầu lặp (YYYY-MM-DD)', example: '2026-11-01' })
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ description: 'Ngày kết thúc lặp (YYYY-MM-DD)', example: '2026-11-07' })
  @IsString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ description: 'Giá vé cơ bản (VNĐ)', example: 95000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice: number;
}

export class CancelShowtimeDto {
  @ApiProperty({ description: 'Lý do hủy suất chiếu', example: 'Sự cố kỹ thuật tại phòng chiếu' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp lý do hủy suất chiếu' })
  reason: string;
}

export class AdminShowtimeQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo rạp' })
  @IsOptional()
  @IsString()
  cinemaId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo phim' })
  @IsOptional()
  @IsString()
  movieId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;
}
