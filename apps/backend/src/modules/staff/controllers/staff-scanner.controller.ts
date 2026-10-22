import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { StaffScannerService } from '../services/staff-scanner.service';
import { ScanTicketDto } from '../dto/staff.dto';

@ApiTags('Staff - Ticket Scanner')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
@Controller('staff/scanner')
export class StaffScannerController {
  constructor(private readonly scannerService: StaffScannerService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Quét và xác thực mã QR vé vào phòng chiếu (chống vé giả & vé trùng lặp)' })
  scanTicket(@Body() dto: ScanTicketDto, @Req() req: any) {
    return this.scannerService.scanTicket(dto, req.user.id, req.ip);
  }

  @Get('history')
  @ApiOperation({ summary: 'Lịch sử soát vé của nhân viên' })
  getScanHistory(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return this.scannerService.getScanHistory(req.user.id, p, l);
  }
}
