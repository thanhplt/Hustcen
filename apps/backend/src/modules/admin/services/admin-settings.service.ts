import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SystemSettingService } from '../../../common/config/system-setting.service';
import { UpdateSettingsDto } from '../dto/admin-settings.dto';

@Injectable()
export class AdminSettingsService {
  private readonly logger = new Logger(AdminSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemSettings: SystemSettingService,
  ) {}

  /**
   * Get all active system settings
   */
  async getSettings() {
    return this.systemSettings.getSettings();
  }

  /**
   * Update one or more system settings
   */
  async updateSettings(dto: UpdateSettingsDto, userId?: string, ipAddress?: string) {
    const oldSettings = await this.systemSettings.getSettings();
    const updatedKeys: string[] = [];

    if (dto.bookingCutoffMinutes !== undefined) {
      await this.systemSettings.updateSetting(
        'bookingCutoffMinutes',
        dto.bookingCutoffMinutes,
        'Thời gian đóng đặt vé trước giờ chiếu (phút)',
      );
      updatedKeys.push('bookingCutoffMinutes');
    }

    if (dto.closingSoonMinutes !== undefined) {
      await this.systemSettings.updateSetting(
        'closingSoonMinutes',
        dto.closingSoonMinutes,
        'Thời gian cảnh báo sắp đóng đặt vé (phút)',
      );
      updatedKeys.push('closingSoonMinutes');
    }

    if (dto.cleaningBufferMinutes !== undefined) {
      await this.systemSettings.updateSetting(
        'cleaningBufferMinutes',
        dto.cleaningBufferMinutes,
        'Khoảng cách thời gian dọn dẹp phòng giữa 2 suất chiếu (phút)',
      );
      updatedKeys.push('cleaningBufferMinutes');
    }

    if (dto.seatHoldMinutes !== undefined) {
      await this.systemSettings.updateSetting(
        'seatHoldMinutes',
        dto.seatHoldMinutes,
        'Thời gian giữ ghế chờ thanh toán (phút)',
      );
      updatedKeys.push('seatHoldMinutes');
    }

    const newSettings = await this.systemSettings.getSettings();

    // Record AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: 'UPDATE_SETTING',
        entityType: 'SystemSetting',
        entityId: 'SYSTEM',
        oldData: JSON.stringify(oldSettings),
        newData: JSON.stringify(newSettings),
        ipAddress: ipAddress || null,
      },
    });

    return {
      success: true,
      updatedKeys,
      settings: newSettings,
      message: 'Cập nhật cài đặt hệ thống thành công.',
    };
  }
}
