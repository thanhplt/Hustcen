import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClockService } from '../../common/clock/clock.service';
import { PrismaService } from '../../common/prisma/prisma.service';

import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SetClockDto {
  @IsOptional()
  @IsString()
  setTo?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offsetMinutes?: number;
}

@ApiTags('Dev Tools')
@Controller('dev')
export class DevController {
  constructor(
    private readonly clockService: ClockService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('clock')
  @ApiOperation({ summary: 'Lấy trạng thái Dev Clock Time Travel' })
  getClockStatus() {
    return this.clockService.getDevStatus();
  }

  @Post('clock')
  @ApiOperation({ summary: 'Điều chỉnh Dev Clock (Time Travel)' })
  setClock(@Body() body: SetClockDto) {
    if (body.setTo) {
      this.clockService.setToIso(body.setTo);
    } else if (typeof body.offsetMinutes === 'number') {
      this.clockService.setOffsetMinutes(body.offsetMinutes);
    }
    return {
      success: true,
      ...this.clockService.getDevStatus(),
    };
  }

  @Post('clock/reset')
  @ApiOperation({ summary: 'Khôi phục Dev Clock về thời gian thực' })
  resetClock() {
    this.clockService.reset();
    return {
      success: true,
      ...this.clockService.getDevStatus(),
    };
  }

  @Get('mailbox')
  @ApiOperation({ summary: 'Xem danh sách email/OTP trong Dev Mailbox' })
  async getMailbox(@Query('category') category?: string, @Query('recipient') recipient?: string) {
    const where: any = {};
    if (category) where.category = category;
    if (recipient) where.recipient = { contains: recipient };

    const mails = await this.prisma.devMail.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      total: mails.length,
      mails,
    };
  }

  @Get('demo-accounts')
  @ApiOperation({ summary: 'Lấy danh sách tài khoản demo đã seed' })
  getDemoAccounts() {
    return [
      { role: 'ADMIN', email: 'admin@hustcine.edu.vn', password: 'Admin@123', name: 'Quản trị viên Hệ thống' },
      { role: 'MANAGER', email: 'manager@hustcine.edu.vn', password: 'Manager@123', name: 'Quản lý Cụm Rạp' },
      { role: 'STAFF', email: 'staff@hustcine.edu.vn', password: 'Staff@123', name: 'Thu ngân Box Office' },
      { role: 'CUSTOMER', email: 'customer@hust.edu.vn', password: 'Customer@123', name: 'Nguyễn Văn Bách Khoa (Hội viên Diamond)' },
    ];
  }
}
