import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminShowtimesService } from '../services/admin-showtimes.service';
import {
  CreateShowtimeDto,
  CreateShowtimeSeriesDto,
  CancelShowtimeDto,
  AdminShowtimeQueryDto,
} from '../dto/admin-showtime.dto';

@ApiTags('Admin - Showtimes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/showtimes')
export class AdminShowtimesController {
  constructor(private readonly adminShowtimesService: AdminShowtimesService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Danh sách suất chiếu quản trị' })
  getShowtimes(@Query() query: AdminShowtimeQueryDto) {
    return this.adminShowtimesService.getShowtimes(query);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Chi tiết suất chiếu kèm danh sách ghế và đơn hàng' })
  getShowtimeById(@Param('id') id: string) {
    return this.adminShowtimesService.getShowtimeById(id);
  }

  @Get(':id/can-book')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({ summary: 'Kiểm tra trạng thái đóng đặt vé (cutoff time) của suất chiếu' })
  canBookShowtime(@Param('id') id: string) {
    return this.adminShowtimesService.canBookShowtime(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo mới một suất chiếu (kiểm tra xung đột phòng và buffer 15m, khởi tạo ghế)' })
  createShowtime(@Body() dto: CreateShowtimeDto, @Req() req: any) {
    return this.adminShowtimesService.createShowtime(dto, req.user?.id, req.ip);
  }

  @Post('series')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo chuỗi suất chiếu định kỳ lặp lại theo thứ trong tuần' })
  createShowtimeSeries(@Body() dto: CreateShowtimeSeriesDto, @Req() req: any) {
    return this.adminShowtimesService.createShowtimeSeries(dto, req.user?.id, req.ip);
  }

  @Post(':id/cancel')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Hủy suất chiếu và tự động hoàn tiền cho toàn bộ vé đã thanh toán' })
  cancelShowtime(@Param('id') id: string, @Body() dto: CancelShowtimeDto, @Req() req: any) {
    return this.adminShowtimesService.cancelShowtime(id, dto, req.user?.id, req.ip);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa suất chiếu (chặn nếu đã có vé đã thanh toán)' })
  deleteShowtime(@Param('id') id: string, @Req() req: any) {
    return this.adminShowtimesService.deleteShowtime(id, req.user?.id, req.ip);
  }
}
