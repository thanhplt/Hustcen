import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClockService } from '../../common/clock/clock.service';
import { SystemSettingService } from '../../common/config/system-setting.service';

@Module({
  controllers: [PublicController],
  providers: [PublicService, PrismaService, ClockService, SystemSettingService],
  exports: [PublicService],
})
export class PublicModule {}
