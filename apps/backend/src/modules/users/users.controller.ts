import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Users & Profile')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Lấy dữ liệu bảng thông tin khách hàng (SĐT, tổng chi tiêu, điểm thưởng, vé sắp chiếu và vé đã xem)' })
  getDashboard(@CurrentUser('sub') userId: string) {
    return this.usersService.getDashboard(userId);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin cá nhân và điểm tích lũy' })
  getProfile(@CurrentUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  updateProfile(@CurrentUser('sub') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Lấy danh sách phim yêu thích' })
  getFavorites(@CurrentUser('sub') userId: string) {
    return this.usersService.getFavorites(userId);
  }

  @Post('favorites/:movieId')
  @ApiOperation({ summary: 'Thêm phim vào danh sách yêu thích' })
  addFavorite(@CurrentUser('sub') userId: string, @Param('movieId') movieId: string) {
    return this.usersService.addFavorite(userId, movieId);
  }

  @Delete('favorites/:movieId')
  @ApiOperation({ summary: 'Xóa phim khỏi danh sách yêu thích' })
  removeFavorite(@CurrentUser('sub') userId: string, @Param('movieId') movieId: string) {
    return this.usersService.removeFavorite(userId, movieId);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Lấy danh sách thông báo của tài khoản' })
  getNotifications(@CurrentUser('sub') userId: string) {
    return this.usersService.getNotifications(userId);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
  markAsRead(@CurrentUser('sub') userId: string, @Param('id') notificationId: string) {
    return this.usersService.markNotificationAsRead(userId, notificationId);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  markAllAsRead(@CurrentUser('sub') userId: string) {
    return this.usersService.markAllNotificationsAsRead(userId);
  }
}
