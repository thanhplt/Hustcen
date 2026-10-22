import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { StaffPosService } from '../services/staff-pos.service';
import { PosSellDto } from '../dto/staff.dto';

@ApiTags('Staff - Box Office POS')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STAFF', 'ADMIN')
@Controller('staff/pos')
export class StaffPosController {
  constructor(private readonly posService: StaffPosService) {}

  @Post('sell')
  @ApiOperation({ summary: 'Bán vé & combo trực tiếp tại quầy POS, ghi nhận ca làm việc và in hóa đơn' })
  sellTickets(@Body() dto: PosSellDto, @Req() req: any) {
    return this.posService.sellTickets(dto, req.user.id, req.ip);
  }
}
