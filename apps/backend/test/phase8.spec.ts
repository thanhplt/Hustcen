import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ClockService } from '../src/common/clock/clock.service';
import { SystemSettingService } from '../src/common/config/system-setting.service';
import { MockGatewayService } from '../src/adapters/payment/mock-gateway.service';
import { DevMailerService } from '../src/adapters/mailer/dev-mailer.service';
import { EventsGateway } from '../src/modules/bookings/gateways/events.gateway';
import { PricingService } from '../src/modules/bookings/services/pricing.service';
import { PaymentsService } from '../src/modules/payments/services/payments.service';
import { StaffShiftService } from '../src/modules/staff/services/staff-shift.service';
import { StaffPosService } from '../src/modules/staff/services/staff-pos.service';
import { StaffScannerService } from '../src/modules/staff/services/staff-scanner.service';
import { PaymentMethod } from '../src/modules/payments/dto/payment.dto';

describe('Phase 8: Tickets, Staff POS & Scanner Tests', () => {
  let prisma: PrismaService;
  let clockService: ClockService;
  let systemSettings: SystemSettingService;
  let mockGateway: MockGatewayService;
  let devMailer: DevMailerService;
  let eventsGateway: EventsGateway;
  let pricingService: PricingService;
  let paymentsService: PaymentsService;
  let staffShiftService: StaffShiftService;
  let staffPosService: StaffPosService;
  let staffScannerService: StaffScannerService;

  let staffUser: any;
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

    pricingService = new PricingService(prisma, clockService);
    paymentsService = new PaymentsService(
      prisma,
      clockService,
      systemSettings,
      mockGateway,
      devMailer,
      eventsGateway,
    );

    staffShiftService = new StaffShiftService(prisma, clockService);
    staffPosService = new StaffPosService(
      prisma,
      clockService,
      pricingService,
      paymentsService,
      eventsGateway,
      staffShiftService,
    );
    staffScannerService = new StaffScannerService(
      prisma,
      clockService,
      paymentsService,
    );

    // Find staff user
    staffUser = await prisma.user.findFirst({ where: { role: 'STAFF' } });
    if (!staffUser) {
      staffUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    }

    // Create a dedicated future showtime
    const movie = await prisma.movie.findFirst({ where: { deletedAt: null } });
    const auditorium = await prisma.auditorium.findFirst({
      where: { bookingMode: 'PER_SEAT' },
      include: {
        seats: { orderBy: [{ rowCode: 'asc' }, { seatNumber: 'asc' }] },
      },
    });

    testSeats = auditorium!.seats;
    const futureDate = new Date(Date.now() + 7 * 86400000);

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

    // Clean up bookings, payments, audit logs, shifts
    for (const bId of createdBookingIds) {
      await prisma.refund.deleteMany({ where: { bookingId: bId } });
      await prisma.bookingSeat.deleteMany({ where: { bookingId: bId } });
      await prisma.bookingCombo.deleteMany({ where: { bookingId: bId } });
      await prisma.payment.deleteMany({ where: { bookingId: bId } });
      await prisma.booking.deleteMany({ where: { id: bId } });
      await prisma.auditLog.deleteMany({ where: { entityType: 'Booking', entityId: bId } });
    }

    await prisma.staffShift.deleteMany({ where: { userId: staffUser.id } });
    await prisma.showtimeSeat.deleteMany({ where: { showtimeId: testShowtimeId } });
    await prisma.showtime.deleteMany({ where: { id: testShowtimeId } });

    await prisma.onModuleDestroy();
  });

  describe('1. Staff Shift Management', () => {
    it('should start a new shift for staff and track active state', async () => {
      // Clean previous open shifts if any
      await prisma.staffShift.deleteMany({ where: { userId: staffUser.id } });

      const res = await staffShiftService.startShift(staffUser.id);
      expect(res.shift).toBeDefined();
      expect(res.shift.startedAt).toBeDefined();
      expect(res.shift.endedAt).toBeNull();
      expect(res.shift.totalSales).toBe(0);
      expect(res.shift.totalCash).toBe(0);

      const current = await staffShiftService.getCurrentShift(staffUser.id);
      expect(current.active).toBe(true);
      expect(current.shift?.id).toBe(res.shift.id);
    });

    it('should record sales into active shift', async () => {
      await staffShiftService.recordSale(staffUser.id, 190000, true);

      const current = await staffShiftService.getCurrentShift(staffUser.id);
      expect(current.shift?.totalSales).toBe(190000);
      expect(current.shift?.totalCash).toBe(190000);
    });

    it('should end shift and produce summary report', async () => {
      const summary = await staffShiftService.endShift(staffUser.id);
      expect(summary.shiftId).toBeDefined();
      expect(summary.endedAt).toBeDefined();
      expect(summary.totalSales).toBe(190000);
      expect(summary.totalCash).toBe(190000);

      const current = await staffShiftService.getCurrentShift(staffUser.id);
      expect(current.active).toBe(false);
    });
  });

  describe('2. Staff Box Office POS Counter Sales', () => {
    beforeAll(async () => {
      // Start a fresh shift for POS sales test
      await staffShiftService.startShift(staffUser.id);
    });

    it('should complete counter ticket sale with CASH, mark seats SOLD, and update shift', async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const seatsToSell = [rowASeats[0].id, rowASeats[1].id];

      const sale = await staffPosService.sellTickets(
        {
          showtimeId: testShowtimeId,
          seatIds: seatsToSell,
          paymentMethod: PaymentMethod.CASH,
          customerName: 'Khách Vãng Lai Bách Khoa',
          customerPhone: '0912998877',
        },
        staffUser.id,
        '127.0.0.1',
      );

      expect(sale.success).toBe(true);
      expect(sale.bookingCode).toMatch(/^#HUST-POS-[A-Z0-9]{6}$/);
      expect(sale.seatsCount).toBe(2);
      expect(sale.finalAmount).toBeGreaterThan(0);
      expect(sale.qrTokenSigned).toBeDefined();

      createdBookingIds.push(sale.bookingId);

      // Verify seats are marked SOLD in DB
      const dbSeats = await prisma.showtimeSeat.findMany({
        where: { showtimeId: testShowtimeId, seatId: { in: seatsToSell } },
      });
      expect(dbSeats.every((s) => s.status === 'SOLD')).toBe(true);

      // Verify shift was incremented
      const shift = await staffShiftService.getCurrentShift(staffUser.id);
      expect(shift.shift?.totalSales).toBe(sale.finalAmount);
      expect(shift.shift?.totalCash).toBe(sale.finalAmount);
    });

    it('should reject selling an already SOLD seat at POS (ConflictException)', async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const soldSeat = [rowASeats[0].id];

      await expect(
        staffPosService.sellTickets(
          {
            showtimeId: testShowtimeId,
            seatIds: soldSeat,
          },
          staffUser.id,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('3. Ticket Scanner & HMAC QR Verification', () => {
    let validTicketQrToken: string;
    let ticketBookingId: string;

    beforeAll(async () => {
      const rowASeats = testSeats.filter((s) => s.rowCode === 'A');
      const seatsToSell = [rowASeats[2].id, rowASeats[3].id];

      const sale = await staffPosService.sellTickets(
        {
          showtimeId: testShowtimeId,
          seatIds: seatsToSell,
          customerName: 'Trần Soát Vé',
        },
        staffUser.id,
      );

      validTicketQrToken = sale.qrTokenSigned!;
      ticketBookingId = sale.bookingId;
      createdBookingIds.push(sale.bookingId);
    });

    it('should reject tampered or forged QR token (BadRequestException)', async () => {
      const fakeToken = `${validTicketQrToken.split('.')[0]}.fakehash1234567890`;

      await expect(
        staffScannerService.scanTicket({ qrToken: fakeToken }, staffUser.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully validate authentic ticket, record scan timestamp and staff ID', async () => {
      const scanResult = await staffScannerService.scanTicket(
        { qrToken: validTicketQrToken },
        staffUser.id,
        '127.0.0.1',
      );

      expect(scanResult.valid).toBe(true);
      expect(scanResult.bookingCode).toBeDefined();
      expect(scanResult.movieTitle).toBeDefined();
      expect(scanResult.seats.length).toBe(2);
      expect(scanResult.scannedBy).toBe(staffUser.id);

      // Verify DB record
      const booking = await prisma.booking.findUnique({
        where: { id: ticketBookingId },
      });
      expect(booking?.qrScannedAt).not.toBeNull();
      expect(booking?.qrScannedBy).toBe(staffUser.id);

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'SCAN_TICKET', entityId: ticketBookingId },
      });
      expect(audit).toBeDefined();
    });

    it('should prevent duplicate entry when scanning the same ticket twice (ConflictException 409)', async () => {
      await expect(
        staffScannerService.scanTicket({ qrToken: validTicketQrToken }, staffUser.id),
      ).rejects.toThrow(ConflictException);
    });

    it('should return staff scan history', async () => {
      const history = await staffScannerService.getScanHistory(staffUser.id);
      expect(history.items.length).toBeGreaterThanOrEqual(1);
      expect(history.meta.total).toBeGreaterThanOrEqual(1);
    });
  });
});
