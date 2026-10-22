import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AdminSettingsService } from '../services/admin-settings.service';
import { UpdateSettingsDto } from '../dto/admin-settings.dto';

@ApiTags('Admin - System Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Xem các thông số cấu hình hệ thống (cutoff, closing soon, cleaning buffer, seat hold)' })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'Cập nhật thông số hệ thống và ghi nhận AuditLog' })
  updateSettings(@Body() dto: UpdateSettingsDto, @Req() req: any) {
    return this.settingsService.updateSettings(dto, req.user?.id, req.ip);
  }
}
