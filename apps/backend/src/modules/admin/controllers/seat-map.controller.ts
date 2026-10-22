import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SeatMapService } from '../services/seat-map.service';
import { UpdateSeatMapDto } from '../dto/seat-map.dto';

@ApiTags('Admin - Seat Map Builder')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/auditoriums')
export class SeatMapController {
  constructor(private readonly seatMapService: SeatMapService) {}

  @Get(':id/layout')
  @ApiOperation({ summary: 'Lấy cấu hình ma trận sơ đồ phòng chiếu và danh sách ghế hiện tại' })
  getSeatMap(@Param('id') id: string) {
    return this.seatMapService.getSeatMap(id);
  }

  @Put(':id/layout')
  @ApiOperation({ summary: 'Lưu sơ đồ thiết kế phòng chiếu mới và đồng bộ dữ liệu ghế trong cơ sở dữ liệu' })
  updateSeatMap(
    @Param('id') id: string,
    @Body() dto: UpdateSeatMapDto,
    @Req() req: any,
  ) {
    return this.seatMapService.updateSeatMap(id, dto, req.user?.id, req.ip);
  }
}
