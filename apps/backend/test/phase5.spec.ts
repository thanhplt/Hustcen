import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ClockService } from '../src/common/clock/clock.service';
import { SystemSettingService } from '../src/common/config/system-setting.service';
import { DevMailerService } from '../src/adapters/mailer/dev-mailer.service';
import { AdminShowtimesService } from '../src/modules/admin/services/admin-showtimes.service';

describe('Phase 5: Admin Showtimes, Recurrence, Conflict Check & Cutoff Tests', () => {
  let prisma: PrismaService;
  let clockService: ClockService;
  let systemSettings: SystemSettingService;
  let devMailer: DevMailerService;
  let adminShowtimesService: AdminShowtimesService;

  let testMovieId: string;
  let testCinemaId: string;
  let testAuditoriumId: string;
  let adminUserId: string;

  const createdShowtimeIds: string[] = [];
  const createdSeriesIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    clockService = new ClockService();
    systemSettings = new SystemSettingService(prisma);
    devMailer = new DevMailerService(prisma);
    adminShowtimesService = new AdminShowtimesService(
      prisma,
      clockService,
      systemSettings,
      devMailer,
    );

    const movie = await prisma.movie.findFirst({ where: { deletedAt: null } });
    testMovieId = movie!.id;

    const auditorium = await prisma.auditorium.findFirst({
      include: { cinema: true, seats: true },
    });
    testAuditoriumId = auditorium!.id;
    testCinemaId = auditorium!.cinemaId;

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    adminUserId = admin!.id;
  });

  afterAll(async () => {
    clockService.reset();

    // Clean up created showtimes and series
    for (const stId of createdShowtimeIds) {
      await prisma.refund.deleteMany({ where: { booking: { showtimeId: stId } } });
      await prisma.bookingSeat.deleteMany({ where: { booking: { showtimeId: stId } } });
      await prisma.bookingCombo.deleteMany({ where: { booking: { showtimeId: stId } } });
      await prisma.payment.deleteMany({ where: { booking: { showtimeId: stId } } });
      await prisma.booking.deleteMany({ where: { showtimeId: stId } });
      await prisma.showtimeSeat.deleteMany({ where: { showtimeId: stId } });
      await prisma.showtime.deleteMany({ where: { id: stId } });
      await prisma.auditLog.deleteMany({ where: { entityType: 'Showtime', entityId: stId } });
    }

    for (const sId of createdSeriesIds) {
      await prisma.showtimeSeries.deleteMany({ where: { id: sId } });
      await prisma.auditLog.deleteMany({ where: { entityType: 'ShowtimeSeries', entityId: sId } });
    }

    await prisma.onModuleDestroy();
  });

  describe('1. Showtime Creation & Conflict Detection with 15-Minute Cleaning Buffer', () => {
    it('should successfully create a showtime and auto-generate all auditorium seats', async () => {
      // Choose a future base date
      const baseStart = new Date('2026-11-20T14:00:00.000Z');
      const baseEnd = new Date('2026-11-20T16:00:00.000Z');

      const showtime = await adminShowtimesService.createShowtime(
        {
          movieId: testMovieId,
          cinemaId: testCinemaId,
          auditoriumId: testAuditoriumId,
          format: '2D',
          startAt: baseStart.toISOString(),
          endAt: baseEnd.toISOString(),
          basePrice: 95000,
        },
        adminUserId,
        '127.0.0.1',
      );

      expect(showtime.id).toBeDefined();
      createdShowtimeIds.push(showtime.id);

      // Verify seats were auto-generated
      const totalSeatsInAuditorium = await prisma.seat.count({
        where: { auditoriumId: testAuditoriumId },
      });
      const generatedSeatsCount = await prisma.showtimeSeat.count({
        where: { showtimeId: showtime.id },
      });

      expect(generatedSeatsCount).toBe(totalSeatsInAuditorium);
      expect(generatedSeatsCount).toBeGreaterThan(0);

      // Check all initialized as AVAILABLE
      const sampleSeat = await prisma.showtimeSeat.findFirst({
        where: { showtimeId: showtime.id },
      });
      expect(sampleSeat?.status).toBe('AVAILABLE');
    });

    it('should reject a showtime that directly overlaps with an existing showtime (ConflictException 409)', async () => {
      // Overlap: 15:00 - 17:00 (base is 14:00 - 16:00)
      const overlappingStart = new Date('2026-11-20T15:00:00.000Z');
      const overlappingEnd = new Date('2026-11-20T17:00:00.000Z');

      await expect(
        adminShowtimesService.createShowtime(
          {
            movieId: testMovieId,
            cinemaId: testCinemaId,
            auditoriumId: testAuditoriumId,
            format: '2D',
            startAt: overlappingStart.toISOString(),
            endAt: overlappingEnd.toISOString(),
            basePrice: 95000,
          },
          adminUserId,
          '127.0.0.1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject a showtime that violates the 15-minute cleaning buffer', async () => {
      // Base ends at 16:00. Cleaning buffer is 15m (room busy until 16:15).
      // Attempting to schedule at 16:10 (only 10m buffer)
      const tightStart = new Date('2026-11-20T16:10:00.000Z');
      const tightEnd = new Date('2026-11-20T18:10:00.000Z');

      await expect(
        adminShowtimesService.createShowtime(
          {
            movieId: testMovieId,
            cinemaId: testCinemaId,
            auditoriumId: testAuditoriumId,
            format: '2D',
            startAt: tightStart.toISOString(),
            endAt: tightEnd.toISOString(),
            basePrice: 95000,
          },
          adminUserId,
          '127.0.0.1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should allow a showtime starting immediately after the 15-minute cleaning buffer', async () => {
      // Base ends at 16:00. Room clean at 16:15.
      // Schedule at 16:15 (exact 15m) or 16:20.
      const validStart = new Date('2026-11-20T16:20:00.000Z');
      const validEnd = new Date('2026-11-20T18:20:00.000Z');

      const nextShowtime = await adminShowtimesService.createShowtime(
        {
          movieId: testMovieId,
          cinemaId: testCinemaId,
          auditoriumId: testAuditoriumId,
          format: '2D',
          startAt: validStart.toISOString(),
          endAt: validEnd.toISOString(),
          basePrice: 95000,
        },
        adminUserId,
        '127.0.0.1',
      );

      expect(nextShowtime.id).toBeDefined();
      createdShowtimeIds.push(nextShowtime.id);
    });
  });

  describe('2. Recurring Showtime Series Generation', () => {
    it('should create recurring showtimes for specified weekdays with series tracking', async () => {
      // Series from 2026-12-01 to 2026-12-07 (Tuesday to Monday)
      // Days of week: [2, 4] -> Tuesday and Thursday
      const seriesResult = await adminShowtimesService.createShowtimeSeries(
        {
          movieId: testMovieId,
          cinemaId: testCinemaId,
          auditoriumId: testAuditoriumId,
          format: '2D',
          timeOfDay: '09:00',
          daysOfWeek: [2, 4], // Tuesday, Thursday
          startDate: '2026-12-01',
          endDate: '2026-12-07',
          basePrice: 90000,
        },
        adminUserId,
        '127.0.0.1',
      );

      expect(seriesResult.seriesId).toBeDefined();
      expect(seriesResult.createdCount).toBe(2); // Dec 1 (Tue) and Dec 3 (Thu)
      expect(seriesResult.showtimes.length).toBe(2);

      createdSeriesIds.push(seriesResult.seriesId);
      seriesResult.showtimes.forEach((st) => createdShowtimeIds.push(st.id));

      // Check linked seriesId
      const firstShowtime = await prisma.showtime.findUnique({
        where: { id: seriesResult.showtimes[0].id },
      });
      expect(firstShowtime?.seriesId).toBe(seriesResult.seriesId);
    });
  });

  describe('3. Showtime Cancellation & Auto-Refund Flow', () => {
    let cancelTestShowtimeId: string;
    let testBookingId: string;

    beforeAll(async () => {
      // Create a dedicated showtime for cancellation test
      const st = await adminShowtimesService.createShowtime(
        {
          movieId: testMovieId,
          cinemaId: testCinemaId,
          auditoriumId: testAuditoriumId,
          format: '2D',
          startAt: '2026-11-25T10:00:00.000Z',
          endAt: '2026-11-25T12:00:00.000Z',
          basePrice: 95000,
        },
        adminUserId,
      );
      cancelTestShowtimeId = st.id;
      createdShowtimeIds.push(st.id);

      // Create a paid booking on this showtime
      const seat = await prisma.showtimeSeat.findFirst({
        where: { showtimeId: st.id },
      });
      await prisma.showtimeSeat.update({
        where: { id: seat!.id },
        data: { status: 'SOLD' },
      });

      const booking = await prisma.booking.create({
        data: {
          bookingCode: `#HUST-TEST-${Date.now()}`,
          showtimeId: st.id,
          cinemaId: testCinemaId,
          guestEmail: 'cancel-student@hust.edu.vn',
          guestName: 'Sinh Viên HUST',
          totalAmount: 95000,
          finalAmount: 95000,
          status: 'PAID',
          expiresAt: new Date(Date.now() + 3600000),
          bookingSeats: {
            create: [
              {
                showtimeSeatId: seat!.id,
                price: 95000,
              },
            ],
          },
        },
      });
      testBookingId = booking.id;
    });

    it('should reject deleting a showtime with active paid bookings', async () => {
      await expect(
        adminShowtimesService.deleteShowtime(cancelTestShowtimeId, adminUserId),
      ).rejects.toThrow(ConflictException);
    });

    it('should cancel showtime, auto-refund all paid bookings and release seats', async () => {
      const cancelResult = await adminShowtimesService.cancelShowtime(
        cancelTestShowtimeId,
        { reason: 'Bảo trì hệ thống âm thanh phòng chiếu' },
        adminUserId,
      );

      expect(cancelResult.success).toBe(true);
      expect(cancelResult.refundedBookingsCount).toBe(1);

      // Verify showtime status
      const showtime = await prisma.showtime.findUnique({
        where: { id: cancelTestShowtimeId },
      });
      expect(showtime?.isCancelled).toBe(true);
      expect(showtime?.cancelledReason).toBe('Bảo trì hệ thống âm thanh phòng chiếu');

      // Verify booking status
      const booking = await prisma.booking.findUnique({
        where: { id: testBookingId },
      });
      expect(booking?.status).toBe('REFUNDED');

      // Verify Refund record created
      const refund = await prisma.refund.findFirst({
        where: { bookingId: testBookingId },
      });
      expect(refund).toBeDefined();
      expect(refund?.amount).toBe(95000);
      expect(refund?.reason).toContain('Bảo trì hệ thống âm thanh');

      // Verify seats are released back to AVAILABLE
      const seats = await prisma.showtimeSeat.findMany({
        where: { showtimeId: cancelTestShowtimeId },
      });
      expect(seats.every((s) => s.status === 'AVAILABLE')).toBe(true);

      // Verify DevMail notification was queued/sent
      const devMail = await prisma.devMail.findFirst({
        where: { recipient: 'cancel-student@hust.edu.vn', category: 'CANCEL' },
      });
      expect(devMail).toBeDefined();
      expect(devMail?.subject.toLowerCase()).toContain('hủy suất chiếu');
    });
  });

  describe('4. Cutoff Verification & Dynamic Time-Travel Checking', () => {
    let cutoffShowtimeId: string;
    const futureTime = new Date('2026-11-28T15:00:00.000Z');

    beforeAll(async () => {
      const st = await adminShowtimesService.createShowtime(
        {
          movieId: testMovieId,
          cinemaId: testCinemaId,
          auditoriumId: testAuditoriumId,
          format: '2D',
          startAt: futureTime.toISOString(),
          endAt: new Date(futureTime.getTime() + 7200000).toISOString(), // 2 hours
          basePrice: 95000,
        },
        adminUserId,
      );
      cutoffShowtimeId = st.id;
      createdShowtimeIds.push(st.id);
    });

    it('should report showtime as OPEN when more than 5 minutes before startAt', async () => {
      // Dev clock set to 30 minutes before showtime
      clockService.setDate(new Date('2026-11-28T14:30:00.000Z'));

      const status = await adminShowtimesService.canBookShowtime(cutoffShowtimeId);
      expect(status.canBook).toBe(true);
    });

    it('should report showtime as CLOSED once within the 5-minute cutoff window', async () => {
      // Dev clock set to 3 minutes before showtime (14:57)
      clockService.setDate(new Date('2026-11-28T14:57:00.000Z'));

      const status = await adminShowtimesService.canBookShowtime(cutoffShowtimeId);
      expect(status.canBook).toBe(false);
      expect(status.reason).toBe('CLOSED');
      expect(status.message).toContain('đóng đặt vé');
    });

    it('should report showtime as ONGOING after startAt', async () => {
      // Dev clock set to 10 minutes into the movie (15:10)
      clockService.setDate(new Date('2026-11-28T15:10:00.000Z'));

      const status = await adminShowtimesService.canBookShowtime(cutoffShowtimeId);
      expect(status.canBook).toBe(false);
      expect(status.reason).toBe('ONGOING');
    });

    it('should report showtime as ENDED after endAt', async () => {
      // Dev clock set to 3 hours after start (18:00)
      clockService.setDate(new Date('2026-11-28T18:00:00.000Z'));

      const status = await adminShowtimesService.canBookShowtime(cutoffShowtimeId);
      expect(status.canBook).toBe(false);
      expect(status.reason).toBe('ENDED');
    });
  });
});
