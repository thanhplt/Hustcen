import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MovieAgeRating {
  P = 'P',
  K = 'K',
  T13 = 'T13',
  T16 = 'T16',
  T18 = 'T18',
}

export enum MovieStatus {
  DRAFT = 'DRAFT',
  COMING_SOON = 'COMING_SOON',
  NOW_SHOWING = 'NOW_SHOWING',
  ENDED = 'ENDED',
  HIDDEN = 'HIDDEN',
}

export class CreateMovieDto {
  @ApiProperty({ description: 'Tên phim tiếng Việt', example: 'Chiến Binh Công Nghệ: Kỷ Nguyên Mới' })
  @IsString()
  @IsNotEmpty({ message: 'Tên phim không được để trống' })
  title: string;

  @ApiPropertyOptional({ description: 'Tên gốc tiếng Anh', example: 'Tech Warrior: New Era' })
  @IsOptional()
  @IsString()
  originalTitle?: string;

  @ApiProperty({ description: 'Tóm tắt nội dung phim' })
  @IsString()
  @IsNotEmpty({ message: 'Tóm tắt nội dung không được để trống' })
  synopsis: string;

  @ApiProperty({ description: 'Thời lượng tính bằng phút', example: 125 })
  @IsNumber()
  @Min(1, { message: 'Thời lượng phải lớn hơn 0' })
  @Type(() => Number)
  durationMinutes: number;

  @ApiProperty({ description: 'Ngày phát hành (ISO string)', example: '2026-11-01' })
  @IsString()
  @IsNotEmpty()
  releaseDate: string;

  @ApiPropertyOptional({ enum: MovieAgeRating, default: MovieAgeRating.P })
  @IsOptional()
  @IsEnum(MovieAgeRating)
  ageRating?: MovieAgeRating;

  @ApiPropertyOptional({ default: 'Tiếng Việt' })
  @IsOptional()
  @IsString()
  languages?: string;

  @ApiPropertyOptional({ default: 'Phụ đề tiếng Việt' })
  @IsOptional()
  @IsString()
  subtitleInfo?: string;

  @ApiPropertyOptional({ default: 'Việt Nam' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  director?: string;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách diễn viên chính' })
  @IsOptional()
  @IsArray()
  castList?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Định dạng chiếu: 2D, 3D, IMAX', default: ['2D'] })
  @IsOptional()
  @IsArray()
  formats?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Danh sách thể loại IDs' })
  @IsOptional()
  @IsArray()
  genreIds?: string[];

  @ApiPropertyOptional({ enum: MovieStatus, default: MovieStatus.COMING_SOON })
  @IsOptional()
  @IsEnum(MovieStatus)
  status?: MovieStatus;

  @ApiProperty({ description: 'URL ảnh poster phim' })
  @IsString()
  @IsNotEmpty({ message: 'Ảnh poster là bắt buộc' })
  posterUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  posterBlurhash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backdropUrl?: string;

  @ApiPropertyOptional({ description: 'Đường dẫn YouTube Trailer' })
  @IsOptional()
  @IsString()
  trailerUrl?: string;
}

export class UpdateMovieDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  originalTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  synopsis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  releaseDate?: string;

  @ApiPropertyOptional({ enum: MovieAgeRating })
  @IsOptional()
  @IsEnum(MovieAgeRating)
  ageRating?: MovieAgeRating;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  languages?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subtitleInfo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  director?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  castList?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  formats?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  genreIds?: string[];

  @ApiPropertyOptional({ enum: MovieStatus })
  @IsOptional()
  @IsEnum(MovieStatus)
  status?: MovieStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  posterUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  posterBlurhash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  backdropUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trailerUrl?: string;
}

export class ValidateTrailerDto {
  @ApiProperty({ description: 'Đường dẫn YouTube' })
  @IsString()
  @IsNotEmpty()
  trailerUrl: string;
}

export class AdminMovieQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MovieStatus })
  @IsOptional()
  @IsEnum(MovieStatus)
  status?: MovieStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genreId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
