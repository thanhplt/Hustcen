import { Module } from '@nestjs/common';
import { TimeController } from './time.controller';
import { ClockService } from '../../common/clock/clock.service';

@Module({
  controllers: [TimeController],
  providers: [ClockService],
  exports: [ClockService],
})
export class TimeModule {}
