import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { ClockService } from '../src/common/clock/clock.service';
import { SystemSettingService } from '../src/common/config/system-setting.service';
import { AdminDashboardService } from '../src/modules/admin/services/admin-dashboard.service';
import { AdminSettingsService } from '../src/modules/admin/services/admin-settings.service';
import { SeatMapService } from '../src/modules/admin/services/seat-map.service';

describe('Phase 9: Admin Dashboard Analytics, System Settings & Seat-Map Builder Tests', () => {
  let prisma: PrismaService;
  let clockService: ClockService;
  let systemSettings: SystemSettingService;
  let dashboardService: AdminDashboardService;
  let settingsService: AdminSettingsService;
  let seatMapService: SeatMapService;

  let testAuditoriumId: string;
  let adminUserId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    clockService = new ClockService();
    systemSettings = new SystemSettingService(prisma);

    dashboardService = new AdminDashboardService(prisma, clockService);
    settingsService = new AdminSettingsService(prisma, systemSettings);
    seatMapService = new SeatMapService(prisma);

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    adminUserId = admin!.id;

    const auditorium = await prisma.auditorium.findFirst({
      include: { seats: true },
    });
    testAuditoriumId = auditorium!.id;
  });

  afterAll(async () => {
    // Reset settings to defaults
    await systemSettings.updateSetting('bookingCutoffMinutes', 5);
    await systemSettings.updateSetting('closingSoonMinutes', 15);
    await systemSettings.updateSetting('cleaningBufferMinutes', 15);
    await systemSettings.updateSetting('seatHoldMinutes', 10);

    await prisma.auditLog.deleteMany({
      where: {
        entityType: { in: ['SystemSetting', 'Auditorium'] },
      },
    });

    await prisma.onModuleDestroy();
  });

  describe('1. Admin Dashboard Analytics & KPI Metrics', () => {
    it('should return KPI summary with revenue, tickets sold, occupancy rate, and active movies count', async () => {
      const summary = await dashboardService.getSummary();

      expect(summary.todayRevenue).toBeGreaterThanOrEqual(0);
      expect(summary.todayBookingsCount).toBeGreaterThanOrEqual(0);
      expect(summary.todayTicketsSold).toBeGreaterThanOrEqual(0);
      expect(summary.occupancyRate).toBeGreaterThanOrEqual(0);
      expect(summary.occupancyRate).toBeLessThanOrEqual(100);
      expect(summary.activeMoviesCount).toBeGreaterThanOrEqual(0);
      expect(summary.cinemasCount).toBe(5);
      expect(summary.comparisons).toBeDefined();
    });

    it('should generate revenue chart history for specified number of days', async () => {
      const chart = await dashboardService.getRevenueChart(7);

      expect(chart.length).toBe(7);
      chart.forEach((entry) => {
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry.revenue).toBeGreaterThanOrEqual(0);
        expect(entry.bookingsCount).toBeGreaterThanOrEqual(0);
        expect(entry.ticketsCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return occupancy rate grouped by all 5 room types', async () => {
      const occupancy = await dashboardService.getOccupancyChart();

      expect(occupancy.length).toBe(5);
      const roomTypes = occupancy.map((o) => o.roomType);
      expect(roomTypes).toContain('STANDARD');
      expect(roomTypes).toContain('GRAND');
      expect(roomTypes).toContain('IMAX');
      expect(roomTypes).toContain('LUXURY');
      expect(roomTypes).toContain('PRIVATE');

      occupancy.forEach((o) => {
        expect(o.occupancyRate).toBeGreaterThanOrEqual(0);
        expect(o.occupancyRate).toBeLessThanOrEqual(100);
      });
    });

    it('should list top performing movies ranked by revenue', async () => {
      const topMovies = await dashboardService.getTopMovies(5);

      expect(topMovies.length).toBeLessThanOrEqual(5);
      if (topMovies.length > 1) {
        expect(topMovies[0].revenue).toBeGreaterThanOrEqual(topMovies[1].revenue);
      }
    });
  });

  describe('2. System Settings Management & AuditLog', () => {
    it('should retrieve current system settings', async () => {
      const settings = await settingsService.getSettings();

      expect(settings.bookingCutoffMinutes).toBeDefined();
      expect(settings.closingSoonMinutes).toBeDefined();
      expect(settings.cleaningBufferMinutes).toBeDefined();
      expect(settings.seatHoldMinutes).toBeDefined();
    });

    it('should update settings and record UPDATE_SETTING in AuditLog', async () => {
      const result = await settingsService.updateSettings(
        {
          bookingCutoffMinutes: 8,
          seatHoldMinutes: 12,
        },
        adminUserId,
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(result.settings.bookingCutoffMinutes).toBe(8);
      expect(result.settings.seatHoldMinutes).toBe(12);

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'UPDATE_SETTING', entityId: 'SYSTEM' },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(audit?.userId).toBe(adminUserId);
      expect(JSON.parse(audit!.newData!).bookingCutoffMinutes).toBe(8);
    });
  });

  describe('3. Visual Seat-Map Builder API', () => {
    it('should retrieve current seat map layout config and seat matrix', async () => {
      const seatMap = await seatMapService.getSeatMap(testAuditoriumId);

      expect(seatMap.auditoriumId).toBe(testAuditoriumId);
      expect(seatMap.name).toBeDefined();
      expect(seatMap.capacity).toBeGreaterThan(0);
      expect(seatMap.seats.length).toBeGreaterThan(0);
    });

    it('should reject seat-map update with duplicate seat positions (BadRequestException)', async () => {
      const duplicateSeats = [
        { rowCode: 'A', seatNumber: 1, seatLabel: 'A1', seatType: 'STANDARD' },
        { rowCode: 'A', seatNumber: 1, seatLabel: 'A1-Dup', seatType: 'VIP' },
      ];

      await expect(
        seatMapService.updateSeatMap(
          testAuditoriumId,
          {
            layoutConfig: { rows: 1, cols: 2 },
            seats: duplicateSeats,
          },
          adminUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update seat layout config and synchronize seats in database with AuditLog', async () => {
      const currentMap = await seatMapService.getSeatMap(testAuditoriumId);
      const modifiedSeats = currentMap.seats.map((s, idx) => ({
        rowCode: s.rowCode,
        seatNumber: s.seatNumber,
        seatLabel: s.seatLabel,
        // Mark first 4 seats as VIP
        seatType: idx < 4 ? 'VIP' : s.seatType,
        isWheelchair: s.isWheelchair,
      }));

      const updateResult = await seatMapService.updateSeatMap(
        testAuditoriumId,
        {
          layoutConfig: { ...currentMap.layoutConfig, updatedByAdmin: true },
          seats: modifiedSeats,
        },
        adminUserId,
        '127.0.0.1',
      );

      expect(updateResult.success).toBe(true);

      // Verify AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'UPDATE_SEAT_LAYOUT', entityId: testAuditoriumId },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(audit?.userId).toBe(adminUserId);
    });
  });
});
