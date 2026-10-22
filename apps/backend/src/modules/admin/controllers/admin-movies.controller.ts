import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminMoviesService } from '../services/admin-movies.service';
import { PosterProcessorService } from '../services/poster-processor.service';
import { YoutubeValidatorService } from '../services/youtube-validator.service';
import {
  CreateMovieDto,
  UpdateMovieDto,
  AdminMovieQueryDto,
  ValidateTrailerDto,
} from '../dto/admin-movie.dto';

@ApiTags('Admin - Movies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/movies')
export class AdminMoviesController {
  constructor(
    private readonly adminMoviesService: AdminMoviesService,
    private readonly posterProcessor: PosterProcessorService,
    private readonly youtubeValidator: YoutubeValidatorService,
  ) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Danh sách phim quản trị (kèm phân trang, lọc, thống kê suất chiếu)' })
  getMovies(@Query() query: AdminMovieQueryDto) {
    return this.adminMoviesService.getMovies(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Chi tiết phim quản trị' })
  getMovieById(@Param('id') id: string) {
    return this.adminMoviesService.getMovieById(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Thêm mới phim (bắt buộc poster, kiểm tra YouTube trailer nếu có, ghi AuditLog)' })
  createMovie(@Body() dto: CreateMovieDto, @Req() req: any) {
    return this.adminMoviesService.createMovie(dto, req.user?.id, req.ip);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật thông tin phim (re-validate trailer nếu link thay đổi, ghi AuditLog)' })
  updateMovie(@Param('id') id: string, @Body() dto: UpdateMovieDto, @Req() req: any) {
    return this.adminMoviesService.updateMovie(id, dto, req.user?.id, req.ip);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa phim (chặn nếu đã có suất chiếu với vé đã thanh toán, ghi AuditLog)' })
  deleteMovie(@Param('id') id: string, @Req() req: any) {
    return this.adminMoviesService.deleteMovie(id, req.user?.id, req.ip);
  }

  @Post('validate-trailer')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Kiểm tra đường dẫn YouTube Trailer và lấy thông tin thumbnail/embed' })
  validateTrailer(@Body() dto: ValidateTrailerDto) {
    return this.youtubeValidator.validateTrailer(dto.trailerUrl);
  }

  @Post('upload-poster')
  @Roles('ADMIN')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Tải lên ảnh poster thật (tạo 3 kích cỡ WebP 600x900, 300x450, 120x180 và blurhash)' })
  async uploadPoster(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp ảnh để tải lên');
    }
    return this.posterProcessor.processPoster(file.buffer, file.originalname);
  }
}
