import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClockService } from '../../common/clock/clock.service';

@ApiTags('Time')
@Controller('time')
export class TimeController {
  constructor(private readonly clockService: ClockService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy thời gian máy chủ chuẩn (UTC + Asia/Ho_Chi_Minh)' })
  @ApiResponse({ status: 200, description: 'Thời gian máy chủ hiện tại kèm múi giờ và thứ' })
  getServerTime() {
    return {
      serverNow: this.clockService.nowIso(),
      timezone: this.clockService.getTimezone(),
      weekday: this.clockService.getWeekdayVn(),
      weekdayFull: this.clockService.getWeekdayFullVn(),
      displayHeader: this.clockService.formatHeaderVn(),
    };
  }
}
