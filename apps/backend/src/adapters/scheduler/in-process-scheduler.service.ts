import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as cron from 'node-cron';
import { Scheduler } from './scheduler.interface';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClockService } from '../../common/clock/clock.service';

@Injectable()
export class InProcessSchedulerService implements Scheduler, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InProcessSchedulerService.name);
  private tasks: cron.ScheduledTask[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  onModuleInit() {
    this.start();
  }

  onModuleDestroy() {
    this.stop();
  }

  start(): void {
    this.logger.log('Starting In-Process Scheduler (node-cron)...');

    // Run every 30 seconds: Clean expired holds and expired bookings
    const holdTask = cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.triggerExpiredHoldsCleanup();
        await this.triggerExpiredBookingsCleanup();
      } catch (e) {
        this.logger.error('Error in hold/booking cleanup cron', e.message);
      }
    });
    this.tasks.push(holdTask);

    // Run every minute: Showtime reminders
    const reminderTask = cron.schedule('* * * * *', async () => {
      try {
        await this.triggerShowtimeReminders();
      } catch (e) {
        this.logger.error('Error in reminder cron', e.message);
      }
    });
    this.tasks.push(reminderTask);
  }

  stop(): void {
    this.tasks.forEach((t) => t.stop());
    this.tasks = [];
    this.logger.log('Stopped In-Process Scheduler.');
  }

  async triggerExpiredHoldsCleanup(): Promise<number> {
    const now = this.clock.now();
    const result = await this.prisma.showtimeSeat.updateMany({
      where: {
        status: 'HELD',
        holdExpiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'AVAILABLE',
        holdUserId: null,
        holdSessionId: null,
        holdExpiresAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`[Scheduler] Released ${result.count} expired seat holds`);
    }
    return result.count;
  }

  async triggerExpiredBookingsCleanup(): Promise<number> {
    const now = this.clock.now();
    const result = await this.prisma.booking.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    if (result.count > 0) {
      this.logger.log(`[Scheduler] Marked ${result.count} pending bookings as EXPIRED`);
    }
    return result.count;
  }

  async triggerShowtimeStatusBroadcast(): Promise<void> {
    // Handled in coordination with Socket.IO gateway
  }

  async triggerShowtimeReminders(): Promise<number> {
    const now = this.clock.now();
    const targetStart = new Date(now.getTime() + 120 * 60 * 1000); // 2 hours from now
    const targetEnd = new Date(now.getTime() + 121 * 60 * 1000);

    const upcomingShowtimes = await this.prisma.showtime.findMany({
      where: {
        startAt: {
          gte: targetStart,
          lt: targetEnd,
        },
        isCancelled: false,
      },
      include: {
        bookings: {
          where: { status: 'PAID' },
          include: { user: true },
        },
        movie: true,
        cinema: true,
      },
    });

    let count = 0;
    for (const st of upcomingShowtimes) {
      for (const booking of st.bookings) {
        const recipient = booking.user?.email || booking.guestEmail;
        if (recipient) {
          await this.prisma.devMail.create({
            data: {
              recipient,
              subject: `[Nhắc nhở] Suất chiếu phim "${st.movie.title}" sắp bắt đầu sau 2 tiếng`,
              bodyText: `Kính gửi quý khách,\n\nVé xem phim "${st.movie.title}" tại ${st.cinema.name} sẽ bắt đầu lúc ${this.clock.formatHeaderVn(st.startAt)}.\nMã đặt vé: ${booking.bookingCode}.\nVui lòng đến rạp trước 15 phút.`,
              bodyHtml: `<p>Kính gửi quý khách,</p><p>Vé xem phim <strong>"${st.movie.title}"</strong> tại <strong>${st.cinema.name}</strong> sẽ bắt đầu lúc <strong>${this.clock.formatHeaderVn(st.startAt)}</strong>.</p><p>Mã đặt vé: <strong>${booking.bookingCode}</strong>.</p><p>Chúc quý khách xem phim vui vẻ!</p>`,
              category: 'REMINDER',
            },
          });
          count++;
        }
      }
    }

    if (count > 0) {
      this.logger.log(`[Scheduler] Sent ${count} 2-hour showtime reminders`);
    }
    return count;
  }
}
