import { IsOptional, IsString, IsInt, Min, IsBoolean, IsEmail } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MovieQueryDto {
  @ApiPropertyOptional({ description: 'Thể loại phim (slug)', example: 'hanh-dong' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiPropertyOptional({ description: 'Định dạng phim', example: 'IMAX' })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({ description: 'Độ tuổi', example: 'T16' })
  @IsOptional()
  @IsString()
  ageRating?: string;

  @ApiPropertyOptional({ description: 'Lọc theo cụm rạp', example: 'hust-cine-dai-co-viet' })
  @IsOptional()
  @IsString()
  cinemaSlug?: string;

  @ApiPropertyOptional({ description: 'Trạng thái phim', example: 'NOW_SHOWING' })
  @IsOptional()
  @IsString()
  status?: string; // NOW_SHOWING, COMING_SOON

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sắp xếp theo', example: 'releaseDate', enum: ['releaseDate', 'rating', 'title'] })
  @IsOptional()
  @IsString()
  sortBy?: 'releaseDate' | 'rating' | 'title';

  @ApiPropertyOptional({ description: 'Thứ tự sắp xếp', example: 'desc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 12;
}

export class ShowtimeQueryDto {
  @ApiPropertyOptional({ description: 'Ngày xem (YYYY-MM-DD), mặc định là hôm nay', example: '2026-10-21' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({ description: 'Lọc theo phim (ID hoặc Slug)' })
  @IsOptional()
  @IsString()
  movie?: string;

  @ApiPropertyOptional({ description: 'Lọc theo rạp (ID hoặc Slug)' })
  @IsOptional()
  @IsString()
  cinema?: string;

  @ApiPropertyOptional({ description: 'Bao gồm cả các suất chiếu đã qua hôm nay', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includePast?: boolean = false;
}

export class NotifyMeDto {
  @ApiPropertyOptional({ example: 'sinhvien@hust.edu.vn' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email?: string;
}
