import { ClockService } from '../src/common/clock/clock.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { SystemSettingService } from '../src/common/config/system-setting.service';
import { MockGatewayService } from '../src/adapters/payment/mock-gateway.service';
import { DevMailerService } from '../src/adapters/mailer/dev-mailer.service';
import { LocalDiskStorageService } from '../src/adapters/storage/local-disk-storage.service';
import { TimeController } from '../src/modules/time/time.controller';

describe('Phase 1 Foundation Tests', () => {
  let clockService: ClockService;
  let prisma: PrismaService;
  let systemSettingService: SystemSettingService;
  let mockGateway: MockGatewayService;
  let devMailer: DevMailerService;
  let storageService: LocalDiskStorageService;
  let timeController: TimeController;

  beforeAll(async () => {
    clockService = new ClockService();
    prisma = new PrismaService();
    await prisma.onModuleInit();
    systemSettingService = new SystemSettingService(prisma);
    mockGateway = new MockGatewayService();
    devMailer = new DevMailerService(prisma);
    storageService = new LocalDiskStorageService();
    timeController = new TimeController(clockService);
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  describe('ClockService & Time Travel', () => {
    it('should return current time in ISO format and Asia/Ho_Chi_Minh timezone', () => {
      const nowIso = clockService.nowIso();
      expect(nowIso).toBeDefined();
      expect(clockService.getTimezone()).toBe('Asia/Ho_Chi_Minh');
    });

    it('should return valid Vietnamese weekday abbreviation (T2-T7, CN)', () => {
      const weekday = clockService.getWeekdayVn();
      expect(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']).toContain(weekday);
    });

    it('should format header string in Vietnamese correctly', () => {
      const headerStr = clockService.formatHeaderVn();
      expect(headerStr).toMatch(/^(Thứ|Chủ Nhật).+·\s\d{2}:\d{2}$/);
    });

    it('should support time travel with offsetMinutes and reset', () => {
      const before = clockService.now().getTime();
      clockService.setOffsetMinutes(60); // Jump forward 1 hour
      const after = clockService.now().getTime();
      expect(after - before).toBeGreaterThanOrEqual(3599000);

      clockService.reset();
      const resetTime = clockService.now().getTime();
      expect(Math.abs(resetTime - Date.now())).toBeLessThan(1000);
    });

    it('should set clock to exact ISO string with setToIso', () => {
      const targetIso = '2026-10-21T07:45:00.000Z';
      clockService.setToIso(targetIso);
      const diff = Math.abs(clockService.now().getTime() - new Date(targetIso).getTime());
      expect(diff).toBeLessThan(50);
      clockService.reset();
    });
  });

  describe('GET /time Controller', () => {
    it('should return serverNow, timezone, weekday and displayHeader', () => {
      const res = timeController.getServerTime();
      expect(res.serverNow).toBeDefined();
      expect(res.timezone).toBe('Asia/Ho_Chi_Minh');
      expect(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']).toContain(res.weekday);
      expect(res.displayHeader).toBeDefined();
    });
  });

  describe('SystemSettingService', () => {
    it('should return default settings without hard-coding', async () => {
      const settings = await systemSettingService.getSettings();
      expect(settings.bookingCutoffMinutes).toBe(5);
      expect(settings.closingSoonMinutes).toBe(15);
      expect(settings.cleaningBufferMinutes).toBe(15);
      expect(settings.seatHoldMinutes).toBe(10);
    });

    it('should update and persist system setting', async () => {
      await systemSettingService.updateSetting('bookingCutoffMinutes', 6, 'Test update');
      const updated = await systemSettingService.get('bookingCutoffMinutes');
      expect(updated).toBe(6);
      // restore
      await systemSettingService.updateSetting('bookingCutoffMinutes', 5, 'Default cutoff');
    });
  });

  describe('Adapters', () => {
    it('MockGateway should create payment intent and sign/verify webhooks', async () => {
      const intent = await mockGateway.createPaymentIntent({
        bookingId: 'test-booking-id',
        bookingCode: '#HUST-1234',
        amount: 95000,
        description: 'Vé xem phim',
      });
      expect(intent.paymentUrl).toContain('/payment/mock');
      expect(intent.transactionRef).toContain('MOCK_');

      const payload = {
        transactionRef: intent.transactionRef,
        bookingCode: '#HUST-1234',
        amount: 95000,
        status: 'SUCCESS',
      };
      const sig = mockGateway.generateSignature(payload);
      const isValid = mockGateway.verifyWebhookSignature(payload, sig);
      expect(isValid).toBe(true);

      const isInvalid = mockGateway.verifyWebhookSignature(payload, 'wrong-signature');
      expect(isInvalid).toBe(false);
    });

    it('DevMailer should send email and store in DevMail table', async () => {
      const res = await devMailer.sendMail({
        to: 'test@hust.edu.vn',
        subject: 'Mã xác thực OTP',
        bodyText: 'Mã OTP của bạn là: 123456',
        bodyHtml: '<p>Mã OTP của bạn là: <strong>123456</strong></p>',
        category: 'OTP',
      });
      expect(res.success).toBe(true);
      expect(res.id).toBeDefined();

      const saved = await prisma.devMail.findUnique({ where: { id: res.id } });
      expect(saved).not.toBeNull();
      expect(saved?.recipient).toBe('test@hust.edu.vn');
      expect(saved?.category).toBe('OTP');
    });

    it('LocalDiskStorage should save file and return static URL', async () => {
      const buffer = Buffer.from('fake-image-bytes');
      const file = await storageService.saveFile(buffer, 'test-poster.webp', 'posters');
      expect(file.filename).toBeDefined();
      expect(file.url).toContain('/uploads/posters/');
      expect(file.size).toBe(buffer.length);

      // Clean up
      const deleted = await storageService.deleteFile(file.path);
      expect(deleted).toBe(true);
    });
  });

  describe('Database Seed Verification', () => {
    it('should have 12 movies seeded', async () => {
      const count = await prisma.movie.count({ where: { deletedAt: null } });
      expect(count).toBeGreaterThanOrEqual(12);
    });

    it('should have 5 cinemas seeded with flagship Đại Cồ Việt having all 5 room types', async () => {
      const cinemas = await prisma.cinema.findMany({ include: { auditoriums: true } });
      expect(cinemas.length).toBe(5);

      const flagship = cinemas.find((c) => c.slug === 'hust-cine-dai-co-viet');
      expect(flagship).toBeDefined();
      const types = flagship!.auditoriums.map((a) => a.type);
      expect(types).toContain('STANDARD');
      expect(types).toContain('GRAND');
      expect(types).toContain('IMAX');
      expect(types).toContain('LUXURY');
      expect(types).toContain('PRIVATE');
    });

    it('should have seeded demo accounts for Admin, Manager, Staff, Customer', async () => {
      const admin = await prisma.user.findUnique({ where: { email: 'admin@hustcine.edu.vn' } });
      const manager = await prisma.user.findUnique({ where: { email: 'manager@hustcine.edu.vn' } });
      const staff = await prisma.user.findUnique({ where: { email: 'staff@hustcine.edu.vn' } });
      const customer = await prisma.user.findUnique({ where: { email: 'customer@hust.edu.vn' } });

      expect(admin?.role).toBe('ADMIN');
      expect(manager?.role).toBe('MANAGER');
      expect(staff?.role).toBe('STAFF');
      expect(customer?.role).toBe('CUSTOMER');
    });

    it('should have showtimes created with seat matrices', async () => {
      const showtimesCount = await prisma.showtime.count();
      expect(showtimesCount).toBeGreaterThanOrEqual(14);

      const firstSt = await prisma.showtime.findFirst({
        include: { showtimeSeats: true, auditorium: true },
      });
      expect(firstSt).not.toBeNull();
      // 108 single seats + 6 couple seats (holds 12 people) + 2 wheelchair = 116 records
      expect(firstSt!.showtimeSeats.length).toBe(116);
    });
  });
});
