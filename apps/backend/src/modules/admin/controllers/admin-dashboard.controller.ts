import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { DashboardFilterDto } from '../dto/admin-dashboard.dto';

@ApiTags('Admin - Dashboard & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get(['summary', 'kpis'])
  @ApiOperation({ summary: 'Tổng quan chỉ số KPI doanh thu, vé bán, tỷ lệ lấp đầy hôm nay' })
  getSummary(@Query() query: DashboardFilterDto) {
    return this.dashboardService.getSummary(query.cinemaId);
  }

  @Get('revenue-chart')
  @ApiOperation({ summary: 'Dữ liệu biểu đồ doanh thu theo ngày' })
  getRevenueChart(@Query() query: DashboardFilterDto) {
    return this.dashboardService.getRevenueChart(query.days, query.cinemaId);
  }

  @Get('occupancy-chart')
  @ApiOperation({ summary: 'Dữ liệu biểu đồ tỷ lệ lấp đầy theo loại phòng chiếu' })
  getOccupancyChart(@Query() query: DashboardFilterDto) {
    return this.dashboardService.getOccupancyChart(query.cinemaId);
  }

  @Get('top-movies')
  @ApiOperation({ summary: 'Top phim có doanh thu và số lượng vé bán cao nhất' })
  getTopMovies(@Query('limit') limit: number = 5) {
    return this.dashboardService.getTopMovies(Number(limit) || 5);
  }
}
