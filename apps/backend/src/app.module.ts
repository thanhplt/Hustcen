import { Module } from '@nestjs/common';

import { PrismaService } from './common/prisma/prisma.service';
import { ClockService } from './common/clock/clock.service';
import { SystemSettingService } from './common/config/system-setting.service';

import { MockGatewayService } from './adapters/payment/mock-gateway.service';
import { VNPayStubService } from './adapters/payment/vnpay-stub.service';
import { MoMoStubService } from './adapters/payment/momo-stub.service';
import { DevMailerService } from './adapters/mailer/dev-mailer.service';
import { LocalDiskStorageService } from './adapters/storage/local-disk-storage.service';
import { InProcessSchedulerService } from './adapters/scheduler/in-process-scheduler.service';

import { TimeModule } from './modules/time/time.module';
import { DevModule } from './modules/dev/dev.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PublicModule } from './modules/public/public.module';
import { AdminModule } from './modules/admin/admin.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { StaffModule } from './modules/staff/staff.module';

@Module({
  imports: [
    TimeModule,
    DevModule,
    AuthModule,
    UsersModule,
    PublicModule,
    AdminModule,
    BookingsModule,
    PaymentsModule,
    StaffModule,
  ],
  providers: [
    PrismaService,
    ClockService,
    SystemSettingService,
    MockGatewayService,
    VNPayStubService,
    MoMoStubService,
    DevMailerService,
    LocalDiskStorageService,
    InProcessSchedulerService,
  ],
  exports: [
    PrismaService,
    ClockService,
    SystemSettingService,
    MockGatewayService,
    DevMailerService,
    LocalDiskStorageService,
    InProcessSchedulerService,
  ],
})
export class AppModule {}
