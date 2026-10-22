import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ClockService } from '../src/common/clock/clock.service';
import { SystemSettingService } from '../src/common/config/system-setting.service';
import { PricingService } from '../src/modules/bookings/services/pricing.service';
import { OrphanSeatCheckerService } from '../src/modules/bookings/services/orphan-seat-checker.service';
import { EventsGateway } from '../src/modules/bookings/gateways/events.gateway';
import { BookingsService } from '../src/modules/bookings/services/bookings.service';

describe('Phase 6: Seat Hold & Booking Engine (Atomic Realtime) Tests', () => {
  let prisma: PrismaService;
  let clockService: ClockService;
  let systemSettings: SystemSettingService;
  let pricingService: PricingService;
  let orphanChecker: OrphanSeatCheckerService;
  let eventsGateway: EventsGateway;
  let bookingsService: BookingsService;

  let testShowtimeId: string;
  let wholeRoomShowtimeId: string;
  let testAuditoriumId: string;
  let wholeRoomAuditoriumId: string;
  let testSeats: any[];
  let wholeRoomSeats: any[];
  let testComboId: string;
  let testVoucherCode: string;

  const cleanupBookingIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    clockService = new ClockService();
    systemSettings = new SystemSettingService(prisma);
    pricingService = new PricingService(prisma, clockService);
    orphanChecker = new OrphanSeatCheckerService(prisma);
    eventsGateway = new EventsGateway();
    bookingsService = new BookingsService(
      prisma,
      clockService,
      systemSettings,
      pricingService,
      orphanChecker,
      eventsGateway,
    );

    const movie = await prisma.movie.findFirst({ where: { deletedAt: null } });

    // 1. Find standard auditorium & create a dedicated future showtime (5 days ahead)
    const standardAuditorium = await prisma.auditorium.findFirst({
      where: { bookingMode: 'PER_SEAT' },
      include: {
        seats: { orderBy: [{ rowCode: 'asc' }, { seatNumber: 'asc' }] },
        cinema: true,
      },
    });

    testAuditoriumId = standardAuditorium!.id;
    testSeats = standardAuditorium!.seats;

    const futureDate = new Date(Date.now() + 5 * 86400000);
    const futureEndDate = new Date(futureDate.getTime() + 7200000);

    const standardSt = await prisma.showtime.create({
      data: {
        movieId: movie!.id,
        cinemaId: standardAuditorium!.cinemaId,
        auditoriumId: testAuditoriumId,
        format: '2D',
        startAt: futureDate,
        endAt: futureEndDate,
        basePrice: 95000,
      },
    });
    testShowtimeId = standardSt.id;

    await prisma.showtimeSeat.createMany({
      data: testSeats.map((s) => ({
        showtimeId: testShowtimeId,
        seatId: s.id,
        status: 'AVAILABLE',
      })),
    });

    // 2. Find Whole-Room auditorium (Private Lab) & create dedicated showtime
    const privateAuditorium = await prisma.auditorium.findFirst({
      where: { bookingMode: 'WHOLE_ROOM' },
      include: { seats: true, cinema: true },
    });

    if (privateAuditorium) {
      wholeRoomAuditoriumId = privateAuditorium.id;
      wholeRoomSeats = privateAuditorium.seats;

      const wholeSt = await prisma.showtime.create({
        data: {
          movieId: movie!.id,
          cinemaId: privateAuditorium.cinemaId,
          auditoriumId: wholeRoomAuditoriumId,
          format: '2D',
          startAt: new Date(futureDate.getTime() + 3600000),
          endAt: new Date(futureDate.getTime() + 10800000),
          basePrice: 500000,
        },
      });
      wholeRoomShowtimeId = wholeSt.id;

      await prisma.showtimeSeat.createMany({
        data: wholeRoomSeats.map((s) => ({
          showtimeId: wholeRoomShowtimeId,
          seatId: s.id,
          status: 'AVAILABLE',
        })),
      });
    }

    // Get a combo and voucher
    const combo = await prisma.combo.findFirst({ where: { isActive: true } });
    testComboId = combo!.id;

    const voucher = await prisma.voucher.findFirst({ where: { isActive: true } });
    testVoucherCode = voucher!.code;
  });

  afterAll(async () => {
    clockService.reset();

    // Clean up created bookings
    for (const bId of cleanupBookingIds) {
      await prisma.voucherRedemption.deleteMany({ where: { bookingId: bId } });
      await prisma.bookingSeat.deleteMany({ where: { bookingId: bId } });
      await prisma.bookingCombo.deleteMany({ where: { bookingId: bId } });
      await prisma.payment.deleteMany({ where: { bookingId: bId } });
      await prisma.booking.deleteMany({ where: { id: bId } });
    }

    // Delete seats and dedicated test showtimes
    await prisma.showtimeSeat.deleteMany({
      where: { showtimeId: { in: [testShowtimeId, wholeRoomShowtimeId].filter(Boolean) } },
    });
    await prisma.showtime.deleteMany({
      where: { id: { in: [testShowtimeId, wholeRoomShowtimeId].filter(Boolean) } },
    });

    await prisma.onModuleDestroy();
  });

  describe('1. Pricing Engine & Surcharge Calculation', () => {
    it('should correctly calculate base price for standard seats', () => {
      // Wednesday (non-weekend) at 14:00, 2D, Standard room
      const wednesday = new Date('2026-10-21T07:00:00.000Z'); // 14:00 VN
      const price = pricingService.calculateSingleSeatPrice(
        95000,
        'STANDARD',
        '2D',
        'STANDARD',
        wednesday,
      );
      expect(price).toBe(95000);
    });

    it('should apply VIP surcharge (+15.000đ)', () => {
      const wednesday = new Date('2026-10-21T07:00:00.000Z');
      const price = pricingService.calculateSingleSeatPrice(
        95000,
        'VIP',
        '2D',
        'STANDARD',
        wednesday,
      );
      expect(price).toBe(95000 + 15000);
    });

    it('should calculate couple seat price as double (2x)', () => {
      const wednesday = new Date('2026-10-21T07:00:00.000Z');
      const price = pricingService.calculateSingleSeatPrice(
        95000,
        'COUPLE',
        '2D',
        'STANDARD',
        wednesday,
      );
      expect(price).toBe(95000 * 2);
    });

    it('should apply IMAX format surcharge (+40.000đ)', () => {
      const wednesday = new Date('2026-10-21T07:00:00.000Z');
      const price = pricingService.calculateSingleSeatPrice(
        95000,
        'STANDARD',
        'IMAX',
        'IMAX',
        wednesday,
      );
      expect(price).toBe(95000 + 40000);
    });

    it('should apply weekend surcharge (+10.000đ)', () => {
      // Saturday 2026-10-24 15:00 VN
      const saturday = new Date('2026-10-24T08:00:00.000Z');
      const price = pricingService.calculateSingleSeatPrice(
        95000,
        'STANDARD',
        '2D',
        'STANDARD',
        saturday,
      );
      expect(price).toBe(95000 + 10000);
    });

    it('should calculate total price including combos and voucher discount', async () => {
      const seatIds = [testSeats[0].id, testSeats[1].id];
      const result = await pricingService.calculateTotalPrice(
        testShowtimeId,
        seatIds,
        [{ comboId: testComboId, quantity: 1 }],
        testVoucherCode,
      );

      expect(result.subtotalSeats).toBeGreaterThan(0);
      expect(result.subtotalCombos).toBeGreaterThan(0);
      expect(result.discountAmount).toBeGreaterThan(0);
      expect(result.finalAmount).toBe(
        result.subtotalSeats + result.subtotalCombos - result.discountAmount,
      );
      expect(result.seats.length).toBe(2);
      expect(result.voucher?.code).toBe(testVoucherCode);
    });
  });

  describe('2. Orphan Seat Prevention Engine', () => {
    it('should reject selection that leaves an isolated single seat at the edge', async () => {
      // In row A, seats are A1, A2, A3, A4...
      // Selecting A2, A3 leaves A1 alone against edge (index 0)
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      if (rowASeats.length >= 4) {
        const orphanCheck = await orphanChecker.checkOrphanSeats(
          testShowtimeId,
          testAuditoriumId,
          [rowASeats[1].id, rowASeats[2].id], // select A2, A3 -> A1 is orphan
          clockService.now(),
        );

        expect(orphanCheck.hasOrphan).toBe(true);
        expect(orphanCheck.orphanSeatLabel).toBe(rowASeats[0].seatLabel);
      }
    });

    it('should allow selection that does NOT leave an isolated single seat', async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      if (rowASeats.length >= 4) {
        // Selecting from edge: A1, A2 leaves remaining run A3..An (length >= 2)
        const orphanCheck = await orphanChecker.checkOrphanSeats(
          testShowtimeId,
          testAuditoriumId,
          [rowASeats[0].id, rowASeats[1].id],
          clockService.now(),
        );

        expect(orphanCheck.hasOrphan).toBe(false);
      }
    });
  });

  describe('3. Atomic Seat Hold Engine & Concurrency Control', () => {
    const sessionIdUserA = 'session-user-a';
    const sessionIdUserB = 'session-user-b';

    it('should successfully hold up to 8 seats for 10 minutes', async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const seatsToHold = [rowASeats[0].id, rowASeats[1].id];

      const holdResult = await bookingsService.holdSeats(
        {
          showtimeId: testShowtimeId,
          seatIds: seatsToHold,
          sessionId: sessionIdUserA,
        },
        undefined,
        sessionIdUserA,
      );

      expect(holdResult.success).toBe(true);
      expect(holdResult.heldSeats.length).toBe(2);
      expect(holdResult.holdExpiresAt).toBeDefined();

      // Verify in DB
      const dbSeats = await prisma.showtimeSeat.findMany({
        where: { showtimeId: testShowtimeId, seatId: { in: seatsToHold } },
      });
      expect(dbSeats.every((s) => s.status === 'HELD')).toBe(true);
      expect(dbSeats.every((s) => s.holdSessionId === sessionIdUserA)).toBe(true);
    });

    it('should block another user from holding already held seats (ConflictException 409)', async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const seatsToHold = [rowASeats[0].id, rowASeats[1].id];

      await expect(
        bookingsService.holdSeats(
          {
            showtimeId: testShowtimeId,
            seatIds: seatsToHold,
            sessionId: sessionIdUserB,
          },
          undefined,
          sessionIdUserB,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject holding more than 8 seats in standard auditorium', async () => {
      const nineSeatIds = testSeats.slice(0, 9).map((s) => s.id);
      await expect(
        bookingsService.holdSeats(
          {
            showtimeId: testShowtimeId,
            seatIds: nineSeatIds,
            sessionId: sessionIdUserA,
          },
          undefined,
          sessionIdUserA,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce whole-room lock for Private auditorium', async () => {
      if (wholeRoomShowtimeId && wholeRoomSeats.length > 0) {
        // Attempting to hold only 1 seat in Whole-Room mode
        await expect(
          bookingsService.holdSeats(
            {
              showtimeId: wholeRoomShowtimeId,
              seatIds: [wholeRoomSeats[0].id],
              sessionId: sessionIdUserA,
            },
            undefined,
            sessionIdUserA,
          ),
        ).rejects.toThrow(BadRequestException);

        // Holding all seats in Whole-Room mode
        const allSeatIds = wholeRoomSeats.map((s) => s.id);
        const holdWhole = await bookingsService.holdSeats(
          {
            showtimeId: wholeRoomShowtimeId,
            seatIds: allSeatIds,
            sessionId: sessionIdUserA,
          },
          undefined,
          sessionIdUserA,
        );
        expect(holdWhole.success).toBe(true);
        expect(holdWhole.heldSeats.length).toBe(wholeRoomSeats.length);
      }
    });

    it('should allow holding previously held seats after hold timer expires', async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const seatsToHold = [rowASeats[0].id, rowASeats[1].id];

      // Fast-forward dev clock past 10 minutes
      clockService.setOffsetMinutes(15);

      // Now User B can hold the same seats because User A's hold expired!
      const userBHold = await bookingsService.holdSeats(
        {
          showtimeId: testShowtimeId,
          seatIds: seatsToHold,
          sessionId: sessionIdUserB,
        },
        undefined,
        sessionIdUserB,
      );

      expect(userBHold.success).toBe(true);

      // Reset dev clock
      clockService.reset();
    });

    it('should release held seats upon manual releaseHold call', async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const seatsToHold = [rowASeats[0].id, rowASeats[1].id];

      const releaseResult = await bookingsService.releaseHold(
        {
          showtimeId: testShowtimeId,
          seatIds: seatsToHold,
          sessionId: sessionIdUserB,
        },
        undefined,
        sessionIdUserB,
      );

      expect(releaseResult.success).toBe(true);

      const dbSeats = await prisma.showtimeSeat.findMany({
        where: { showtimeId: testShowtimeId, seatId: { in: seatsToHold } },
      });
      expect(dbSeats.every((s) => s.status === 'AVAILABLE')).toBe(true);
    });
  });

  describe('4. Booking Creation Flow', () => {
    const bookingSessionId = 'test-booking-session-999';

    it('should create booking for held seats with PENDING status and correct pricing', async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const selectedSeats = [rowASeats[0].id, rowASeats[1].id];

      // 1. Hold seats first
      await bookingsService.holdSeats(
        {
          showtimeId: testShowtimeId,
          seatIds: selectedSeats,
          sessionId: bookingSessionId,
        },
        undefined,
        bookingSessionId,
      );

      // 2. Create Booking
      const booking = await bookingsService.createBooking(
        {
          showtimeId: testShowtimeId,
          seatIds: selectedSeats,
          combos: [{ comboId: testComboId, quantity: 2 }],
          guestName: 'Nguyễn Văn Test',
          guestEmail: 'test-guest@hust.edu.vn',
          guestPhone: '0988776655',
          sessionId: bookingSessionId,
        },
        undefined,
        bookingSessionId,
      );

      expect(booking.id).toBeDefined();
      expect(booking.bookingCode).toMatch(/^#HUST-[A-Z0-9]{6}$/);
      expect(booking.status).toBe('PENDING');
      expect(booking.seats.length).toBe(2);
      expect(booking.combos.length).toBe(1);
      expect(booking.combos[0].quantity).toBe(2);
      expect(booking.finalAmount).toBeGreaterThan(0);

      cleanupBookingIds.push(booking.id);
    });

    it('should reject booking creation when seats are not held by caller', async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const unheldSeats = [rowASeats[2].id, rowASeats[3].id];

      await expect(
        bookingsService.createBooking(
          {
            showtimeId: testShowtimeId,
            seatIds: unheldSeats,
            sessionId: 'unauthorized-stranger-session',
          },
          undefined,
          'unauthorized-stranger-session',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
