import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClockService } from '../../common/clock/clock.service';
import { SystemSettingService } from '../../common/config/system-setting.service';
import { MockGatewayService } from '../../adapters/payment/mock-gateway.service';
import { DevMailerService } from '../../adapters/mailer/dev-mailer.service';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsService } from './services/payments.service';
import { PaymentsController } from './controllers/payments.controller';

@Module({
  imports: [BookingsModule],
  controllers: [PaymentsController],
  providers: [
    PrismaService,
    ClockService,
    SystemSettingService,
    MockGatewayService,
    DevMailerService,
    PaymentsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
