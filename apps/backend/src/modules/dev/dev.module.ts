import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { ClockService } from '../../common/clock/clock.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Module({
  controllers: [DevController],
  providers: [ClockService, PrismaService],
})
export class DevModule {}
