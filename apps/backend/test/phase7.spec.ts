import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ClockService } from '../src/common/clock/clock.service';
import { SystemSettingService } from '../src/common/config/system-setting.service';
import { MockGatewayService } from '../src/adapters/payment/mock-gateway.service';
import { DevMailerService } from '../src/adapters/mailer/dev-mailer.service';
import { EventsGateway } from '../src/modules/bookings/gateways/events.gateway';
import { PaymentsService } from '../src/modules/payments/services/payments.service';
import { BookingsService } from '../src/modules/bookings/services/bookings.service';
import { PricingService } from '../src/modules/bookings/services/pricing.service';
import { OrphanSeatCheckerService } from '../src/modules/bookings/services/orphan-seat-checker.service';
import { MockPaymentStatus } from '../src/modules/payments/dto/payment.dto';

describe('Phase 7: Payment (Mock Gateway) & Signed Webhook Tests', () => {
  let prisma: PrismaService;
  let clockService: ClockService;
  let systemSettings: SystemSettingService;
  let mockGateway: MockGatewayService;
  let devMailer: DevMailerService;
  let eventsGateway: EventsGateway;
  let paymentsService: PaymentsService;
  let bookingsService: BookingsService;

  let testShowtimeId: string;
  let testSeats: any[];
  const createdBookingIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    clockService = new ClockService();
    systemSettings = new SystemSettingService(prisma);
    mockGateway = new MockGatewayService();
    devMailer = new DevMailerService(prisma);
    eventsGateway = new EventsGateway();

    const pricingService = new PricingService(prisma, clockService);
    const orphanChecker = new OrphanSeatCheckerService(prisma);

    bookingsService = new BookingsService(
      prisma,
      clockService,
      systemSettings,
      pricingService,
      orphanChecker,
      eventsGateway,
    );

    paymentsService = new PaymentsService(
      prisma,
      clockService,
      systemSettings,
      mockGateway,
      devMailer,
      eventsGateway,
    );

    // Create a dedicated future showtime
    const movie = await prisma.movie.findFirst({ where: { deletedAt: null } });
    const auditorium = await prisma.auditorium.findFirst({
      where: { bookingMode: 'PER_SEAT' },
      include: {
        seats: { orderBy: [{ rowCode: 'asc' }, { seatNumber: 'asc' }] },
      },
    });

    testSeats = auditorium!.seats;
    const futureDate = new Date(Date.now() + 6 * 86400000);

    const st = await prisma.showtime.create({
      data: {
        movieId: movie!.id,
        cinemaId: auditorium!.cinemaId,
        auditoriumId: auditorium!.id,
        format: '2D',
        startAt: futureDate,
        endAt: new Date(futureDate.getTime() + 7200000),
        basePrice: 95000,
      },
    });
    testShowtimeId = st.id;

    await prisma.showtimeSeat.createMany({
      data: testSeats.map((s) => ({
        showtimeId: testShowtimeId,
        seatId: s.id,
        status: 'AVAILABLE',
      })),
    });
  });

  afterAll(async () => {
    clockService.reset();

    // Clean up bookings, payments, refunds
    for (const bId of createdBookingIds) {
      await prisma.refund.deleteMany({ where: { bookingId: bId } });
      await prisma.voucherRedemption.deleteMany({ where: { bookingId: bId } });
      await prisma.bookingSeat.deleteMany({ where: { bookingId: bId } });
      await prisma.bookingCombo.deleteMany({ where: { bookingId: bId } });
      await prisma.payment.deleteMany({ where: { bookingId: bId } });
      await prisma.booking.deleteMany({ where: { id: bId } });
      await prisma.auditLog.deleteMany({ where: { entityType: 'Booking', entityId: bId } });
    }

    await prisma.showtimeSeat.deleteMany({ where: { showtimeId: testShowtimeId } });
    await prisma.showtime.deleteMany({ where: { id: testShowtimeId } });

    await prisma.onModuleDestroy();
  });

  describe('1. Payment Intent & Mock Gateway Details', () => {
    let bookingId: string;
    let transactionRef: string;

    beforeAll(async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const selectedSeats = [rowASeats[0].id, rowASeats[1].id];

      // Hold and create booking
      await bookingsService.holdSeats(
        {
          showtimeId: testShowtimeId,
          seatIds: selectedSeats,
          sessionId: 'session-pay-1',
        },
        undefined,
        'session-pay-1',
      );

      const booking = await bookingsService.createBooking(
        {
          showtimeId: testShowtimeId,
          seatIds: selectedSeats,
          guestName: 'Nguyễn Thanh Toán',
          guestEmail: 'payment-student@hust.edu.vn',
          guestPhone: '0912345678',
          sessionId: 'session-pay-1',
        },
        undefined,
        'session-pay-1',
      );

      bookingId = booking.id;
      createdBookingIds.push(booking.id);
    });

    it('should create payment intent and return mock gateway URL and transaction reference', async () => {
      const intent = await paymentsService.createPaymentIntent({
        bookingId,
      });

      expect(intent.paymentUrl).toContain('/payment/mock');
      expect(intent.transactionRef).toMatch(/^MOCK_/);
      expect(intent.amount).toBeGreaterThan(0);
      transactionRef = intent.transactionRef;

      // Check DB record
      const dbPayment = await prisma.payment.findUnique({
        where: { transactionRef },
      });
      expect(dbPayment).toBeDefined();
      expect(dbPayment?.status).toBe('PENDING');
      expect(dbPayment?.amount).toBe(intent.amount);
    });

    it('should retrieve mock payment details for frontend UI', async () => {
      const details = await paymentsService.getMockPaymentDetails(transactionRef);
      expect(details.transactionRef).toBe(transactionRef);
      expect(details.movieTitle).toBeDefined();
      expect(details.cinemaName).toBeDefined();
      expect(details.seats.length).toBe(2);
      expect(details.amount).toBeGreaterThan(0);
    });
  });

  describe('2. Signed Webhook Verification & Order Fulfillment', () => {
    let bookingId: string;
    let transactionRef: string;

    beforeAll(async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const selectedSeats = [rowASeats[2].id, rowASeats[3].id];

      await bookingsService.holdSeats(
        {
          showtimeId: testShowtimeId,
          seatIds: selectedSeats,
          sessionId: 'session-pay-2',
        },
        undefined,
        'session-pay-2',
      );

      const booking = await bookingsService.createBooking(
        {
          showtimeId: testShowtimeId,
          seatIds: selectedSeats,
          guestName: 'Lê Văn Học',
          guestEmail: 'le-van-hoc@hust.edu.vn',
          guestPhone: '0987654321',
          sessionId: 'session-pay-2',
        },
        undefined,
        'session-pay-2',
      );

      bookingId = booking.id;
      createdBookingIds.push(booking.id);

      const intent = await paymentsService.createPaymentIntent({ bookingId });
      transactionRef = intent.transactionRef;
    });

    it('should reject webhook with invalid signature (BadRequestException)', async () => {
      const payload = {
        transactionRef,
        bookingId,
        amount: 190000,
        status: 'SUCCESS',
        signature: 'invalid-fake-signature-hex',
      };

      await expect(paymentsService.handleWebhook(payload)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully fulfill order upon valid signed webhook: Payment SUCCESS, Booking PAID, Seats SOLD, QR Generated', async () => {
      const rawData = {
        transactionRef,
        bookingId,
        amount: 190000,
        status: 'SUCCESS',
      };
      const validSignature = mockGateway.generateSignature(rawData);

      const result = await paymentsService.handleWebhook({
        ...rawData,
        signature: validSignature,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('PAID');
      expect(result.qrTokenSigned).toBeDefined();

      // Verify QR token verification method
      const qrVerification = paymentsService.verifySignedQrToken(result.qrTokenSigned!);
      expect(qrVerification.valid).toBe(true);
      expect(qrVerification.bookingId).toBe(bookingId);

      // Verify DB Payment & Booking
      const payment = await prisma.payment.findUnique({ where: { transactionRef } });
      expect(payment?.status).toBe('SUCCESS');

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(booking?.status).toBe('PAID');
      expect(booking?.qrTokenSigned).toBe(result.qrTokenSigned);

      // Verify seats are SOLD
      const seats = await prisma.showtimeSeat.findMany({
        where: { showtimeId: testShowtimeId, seatId: { in: [testSeats[2].id, testSeats[3].id] } },
      });
      expect(seats.every((s) => s.status === 'SOLD')).toBe(true);

      // Verify confirmation email sent
      const mail = await prisma.devMail.findFirst({
        where: { recipient: 'le-van-hoc@hust.edu.vn', category: 'BOOKING_CONFIRM' },
      });
      expect(mail).toBeDefined();
      expect(mail?.subject).toContain('Xác nhận đặt vé thành công');
    });

    it('should support idempotency: repeated webhook returns success without re-processing', async () => {
      const rawData = {
        transactionRef,
        bookingId,
        amount: 190000,
        status: 'SUCCESS',
      };
      const validSignature = mockGateway.generateSignature(rawData);

      const result = await paymentsService.handleWebhook({
        ...rawData,
        signature: validSignature,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Idempotent');
    });
  });

  describe('3. Race Condition & Late Payment Auto-Refund Flow', () => {
    let lateBookingId: string;
    let lateTransactionRef: string;

    beforeAll(async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const selectedSeats = [rowASeats[4].id, rowASeats[5].id];

      await bookingsService.holdSeats(
        {
          showtimeId: testShowtimeId,
          seatIds: selectedSeats,
          sessionId: 'session-late-pay',
        },
        undefined,
        'session-late-pay',
      );

      const booking = await bookingsService.createBooking(
        {
          showtimeId: testShowtimeId,
          seatIds: selectedSeats,
          guestName: 'Trần Muộn Màng',
          guestEmail: 'late-buyer@hust.edu.vn',
          guestPhone: '0977889900',
          sessionId: 'session-late-pay',
        },
        undefined,
        'session-late-pay',
      );

      lateBookingId = booking.id;
      createdBookingIds.push(booking.id);

      const intent = await paymentsService.createPaymentIntent({ bookingId: lateBookingId });
      lateTransactionRef = intent.transactionRef;
    });

    it('should automatically refund payment if booking hold expired before webhook arrived', async () => {
      // Simulate user taking 15 minutes to pay (hold expires at 10 minutes)
      clockService.setOffsetMinutes(15);

      const rawData = {
        transactionRef: lateTransactionRef,
        bookingId: lateBookingId,
        amount: 190000,
        status: 'SUCCESS',
      };
      const validSignature = mockGateway.generateSignature(rawData);

      const result = await paymentsService.handleWebhook({
        ...rawData,
        signature: validSignature,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('REFUNDED');
      expect(result.message).toContain('tự động hoàn lại');

      // Check DB records
      const payment = await prisma.payment.findUnique({ where: { transactionRef: lateTransactionRef } });
      expect(payment?.status).toBe('REFUNDED');

      const booking = await prisma.booking.findUnique({ where: { id: lateBookingId } });
      expect(booking?.status).toBe('REFUNDED');

      const refund = await prisma.refund.findFirst({ where: { bookingId: lateBookingId } });
      expect(refund).toBeDefined();
      expect(refund?.amount).toBe(190000);
      expect(refund?.reason).toContain('Tự động hoàn tiền');

      // Verify refund notification email
      const refundMail = await prisma.devMail.findFirst({
        where: { recipient: 'late-buyer@hust.edu.vn', category: 'REFUND' },
      });
      expect(refundMail).toBeDefined();
      expect(refundMail?.subject).toContain('Hoàn tiền đơn hàng');

      // Reset clock
      clockService.reset();
    });
  });
});
