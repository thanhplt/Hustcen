import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClockService } from '../../common/clock/clock.service';
import { AuthModule } from '../auth/auth.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PaymentsModule } from '../payments/payments.module';
import { StaffScannerService } from './services/staff-scanner.service';
import { StaffShiftService } from './services/staff-shift.service';
import { StaffPosService } from './services/staff-pos.service';
import { StaffScannerController } from './controllers/staff-scanner.controller';
import { StaffPosController } from './controllers/staff-pos.controller';
import { StaffShiftController } from './controllers/staff-shift.controller';

@Module({
  imports: [AuthModule, BookingsModule, PaymentsModule],
  controllers: [
    StaffScannerController,
    StaffPosController,
    StaffShiftController,
  ],
  providers: [
    PrismaService,
    ClockService,
    StaffScannerService,
    StaffShiftService,
    StaffPosService,
  ],
  exports: [
    StaffScannerService,
    StaffShiftService,
    StaffPosService,
  ],
})
export class StaffModule {}
