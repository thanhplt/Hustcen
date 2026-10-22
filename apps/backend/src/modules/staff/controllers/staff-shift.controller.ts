import {
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { StaffShiftService } from '../services/staff-shift.service';

@ApiTags('Staff - Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
@Controller(['staff/shift', 'staff/shifts'])
export class StaffShiftController {
  constructor(private readonly shiftService: StaffShiftService) {}

  @Post(['start', 'open'])
  @ApiOperation({ summary: 'Mở ca làm việc mới' })
  startShift(@Req() req: any) {
    return this.shiftService.startShift(req.user.id);
  }

  @Get(['current', 'active'])
  @ApiOperation({ summary: 'Xem ca làm việc hiện tại của nhân viên' })
  getCurrentShift(@Req() req: any) {
    return this.shiftService.getCurrentShift(req.user.id);
  }

  @Post(['end', 'close'])
  @ApiOperation({ summary: 'Chốt ca làm việc và tổng kết doanh thu bán vé/tiền mặt' })
  endShift(@Req() req: any) {
    return this.shiftService.endShift(req.user.id);
  }
}
