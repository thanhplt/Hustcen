import { Controller, Get, Post, Query, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { MovieQueryDto, ShowtimeQueryDto, NotifyMeDto } from './dto/public-catalog.dto';

@ApiTags('Public Catalog')
@Controller()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('movies')
  @ApiOperation({ summary: 'Lấy danh sách phim chiếu rạp với bộ lọc nâng cao' })
  @ApiResponse({ status: 200, description: 'Danh sách phim kèm poster variants, trailer và bookingCta' })
  getMovies(@Query() query: MovieQueryDto) {
    return this.publicService.getMovies(query);
  }

  @Get('movies/:slug')
  @ApiOperation({ summary: 'Xem chi tiết phim theo slug kèm đánh giá và phim liên quan' })
  @ApiResponse({ status: 200, description: 'Chi tiết phim' })
  getMovieBySlug(@Param('slug') slug: string) {
    return this.publicService.getMovieBySlug(slug);
  }

  @Post('movies/:id/notify-me')
  @ApiOperation({ summary: 'Đăng ký nhận thông báo khi phim mở bán vé' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  subscribeNotifyMe(
    @Param('id') movieId: string,
    @Body() dto: NotifyMeDto,
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    return this.publicService.subscribeNotifyMe(movieId, dto, userId);
  }

  @Get('cinemas')
  @ApiOperation({ summary: 'Lấy danh sách các cụm rạp HUST Cine theo thành phố' })
  @ApiResponse({ status: 200, description: 'Danh sách cụm rạp kèm danh mục phòng chiếu' })
  getCinemas(@Query('city') city?: string) {
    return this.publicService.getCinemas(city);
  }

  @Get('cinemas/:slug')
  @ApiOperation({ summary: 'Xem chi tiết cụm rạp và tiện ích' })
  @ApiResponse({ status: 200, description: 'Chi tiết cụm rạp' })
  getCinemaBySlug(@Param('slug') slug: string) {
    return this.publicService.getCinemaBySlug(slug);
  }

  @Get('showtimes')
  @ApiOperation({
    summary: 'Lấy lịch chiếu phim theo ngày (Tự động nhóm theo rạp & phòng, tính trạng thái động từ Clock)',
  })
  @ApiResponse({ status: 200, description: 'Lịch chiếu với 5 trạng thái động (OPEN, CLOSING_SOON, CLOSED, ONGOING, ENDED)' })
  getShowtimes(@Query() query: ShowtimeQueryDto) {
    return this.publicService.getShowtimes(query);
  }

  @Get('showtimes/:id')
  @ApiOperation({ summary: 'Lấy chi tiết suất chiếu kèm ma trận sơ đồ ghế và trạng thái giữ ghế' })
  @ApiResponse({ status: 200, description: 'Chi tiết suất chiếu kèm sơ đồ ghế' })
  getShowtimeById(@Param('id') id: string) {
    return this.publicService.getShowtimeById(id);
  }

  @Get('combos')
  @ApiOperation({ summary: 'Lấy danh sách combo bắp nước' })
  @ApiResponse({ status: 200, description: 'Danh sách combo đang kinh doanh' })
  getCombos() {
    return this.publicService.getCombos();
  }
}
