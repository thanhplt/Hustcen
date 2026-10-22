import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClockService } from '../../common/clock/clock.service';
import { SystemSettingService } from '../../common/config/system-setting.service';
import { DevMailerService } from '../../adapters/mailer/dev-mailer.service';
import { LocalDiskStorageService } from '../../adapters/storage/local-disk-storage.service';
import { AuthModule } from '../auth/auth.module';
import { YoutubeValidatorService } from './services/youtube-validator.service';
import { PosterProcessorService } from './services/poster-processor.service';
import { AdminMoviesService } from './services/admin-movies.service';
import { AdminShowtimesService } from './services/admin-showtimes.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminSettingsService } from './services/admin-settings.service';
import { SeatMapService } from './services/seat-map.service';
import { AdminMoviesController } from './controllers/admin-movies.controller';
import { AdminShowtimesController } from './controllers/admin-showtimes.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { SeatMapController } from './controllers/seat-map.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminMoviesController,
    AdminShowtimesController,
    AdminDashboardController,
    AdminSettingsController,
    SeatMapController,
  ],
  providers: [
    PrismaService,
    ClockService,
    SystemSettingService,
    DevMailerService,
    LocalDiskStorageService,
    YoutubeValidatorService,
    PosterProcessorService,
    AdminMoviesService,
    AdminShowtimesService,
    AdminDashboardService,
    AdminSettingsService,
    SeatMapService,
  ],
  exports: [
    YoutubeValidatorService,
    PosterProcessorService,
    AdminMoviesService,
    AdminShowtimesService,
    AdminDashboardService,
    AdminSettingsService,
    SeatMapService,
  ],
})
export class AdminModule {}
