import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClockService } from '../../common/clock/clock.service';
import { SystemSettingService } from '../../common/config/system-setting.service';
import { DevMailerService } from '../../adapters/mailer/dev-mailer.service';
import { PricingService } from './services/pricing.service';
import { OrphanSeatCheckerService } from './services/orphan-seat-checker.service';
import { EventsGateway } from './gateways/events.gateway';
import { BookingsService } from './services/bookings.service';
import { BookingsController } from './controllers/bookings.controller';

@Module({
  controllers: [BookingsController],
  providers: [
    PrismaService,
    ClockService,
    SystemSettingService,
    DevMailerService,
    PricingService,
    OrphanSeatCheckerService,
    EventsGateway,
    BookingsService,
  ],
  exports: [
    PricingService,
    BookingsService,
    EventsGateway,
  ],
})
export class BookingsModule {}
