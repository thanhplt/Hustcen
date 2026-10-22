import { PrismaService } from '../src/common/prisma/prisma.service';
import { ClockService } from '../src/common/clock/clock.service';
import { SystemSettingService } from '../src/common/config/system-setting.service';
import { PublicService } from '../src/modules/public/public.service';
import { ShowtimeStatus } from '../src/common/types';

describe('Phase 3 Public Catalog Tests', () => {
  let prisma: PrismaService;
  let clockService: ClockService;
  let systemSettings: SystemSettingService;
  let publicService: PublicService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    clockService = new ClockService();
    systemSettings = new SystemSettingService(prisma);
    publicService = new PublicService(prisma, clockService, systemSettings);
  });

  afterAll(async () => {
    clockService.reset();
    await prisma.onModuleDestroy();
  });

  describe('Movies Catalog & Payload Enrichment', () => {
    it('should return catalog excluding DRAFT and HIDDEN movies', async () => {
      const res = await publicService.getMovies({ page: 1, limit: 12 });
      expect(res.total).toBe(12);
      expect(res.items.length).toBeLessThanOrEqual(12);

      res.items.forEach((m) => {
        expect(['DRAFT', 'HIDDEN']).not.toContain(m.status);
        expect(m.poster).toBeDefined();
        expect(m.poster.original).toBeDefined();
        expect(['BOOK', 'NOTIFY_ME', 'NONE']).toContain(m.bookingCta);
      });
    });

    it('should filter movies by genre and age rating', async () => {
      const actionMovies = await publicService.getMovies({ genre: 'hanh-dong' });
      expect(actionMovies.items.length).toBeGreaterThan(0);
      actionMovies.items.forEach((m) => {
        const hasGenre = m.genres.some((g: any) => g.slug === 'hanh-dong');
        expect(hasGenre).toBe(true);
      });

      const t16Movies = await publicService.getMovies({ ageRating: 'T16' });
      t16Movies.items.forEach((m) => {
        expect(m.ageRating).toBe('T16');
      });
    });

    it('should search movies by keyword', async () => {
      const res = await publicService.getMovies({ search: 'Bách Khoa' });
      expect(res.items.length).toBeGreaterThanOrEqual(1);
      expect(res.items[0].title).toContain('Bách Khoa');
    });

    it('should return trailer with autoplay embedUrl when available', async () => {
      const movie = await publicService.getMovieBySlug('chien-binh-cong-nghe-ky-nguyen-moi');
      expect(movie.trailer).not.toBeNull();
      expect(movie.trailer?.embedUrl).toContain('https://www.youtube-nocookie.com/embed/');
      expect(movie.trailer?.embedUrl).toContain('autoplay=1');
      expect(movie.trailer?.embeddable).toBe(true);
      expect(movie.relatedMovies).toBeDefined();
    });

    it('should return null trailer for movies without trailer (Chưa có trailer state)', async () => {
      const movie = await publicService.getMovieBySlug('mat-ma-khong-gian');
      expect(movie.trailer).toBeNull();
      expect(movie.bookingCta).toBe('NOTIFY_ME'); // COMING_SOON without showtimes
    });

    it('should allow user or email to subscribe to notify-me', async () => {
      const movie = await prisma.movie.findFirst();
      const res = await publicService.subscribeNotifyMe(movie!.id, {
        email: 'notify_me_test@hust.edu.vn',
      });
      expect(res.success).toBe(true);

      const sub = await prisma.notifyMeSubscription.findFirst({
        where: { email: 'notify_me_test@hust.edu.vn' },
      });
      expect(sub).not.toBeNull();
      await prisma.notifyMeSubscription.deleteMany({ where: { email: 'notify_me_test@hust.edu.vn' } });
    });
  });

  describe('Cinemas Listing', () => {
    it('should list all cinemas with auditoriums and amenities', async () => {
      const cinemas = await publicService.getCinemas();
      expect(cinemas.length).toBe(5);

      const flagship = cinemas.find((c) => c.slug === 'hust-cine-dai-co-viet');
      expect(flagship).toBeDefined();
      expect(flagship?.amenities).toContain('IMAX Laser');
      expect(flagship?.auditoriums.length).toBe(5);
    });
  });

  describe('Showtimes & Derived Dynamic Status (Core Domain Rule)', () => {
    const mockShowtime = {
      startAt: new Date('2026-10-21T08:00:00.000Z'),
      endAt: new Date('2026-10-21T10:00:00.000Z'),
      isCancelled: false,
      showtimeSeats: [{ status: 'AVAILABLE' }],
    };
    const cutoff = 5;
    const closingSoon = 15;

    it('should derive OPEN at 07:39:59 (before closing soon)', () => {
      const fakeNow = new Date('2026-10-21T07:39:59.000Z');
      const res = publicService.deriveShowtimeStatus(mockShowtime, fakeNow, cutoff, closingSoon);
      expect(res.status).toBe(ShowtimeStatus.OPEN);
      expect(res.secondsUntilClose).toBe(15 * 60 + 1);
    });

    it('should derive CLOSING_SOON at 07:40:00 (within 15m countdown before cutoff)', () => {
      const fakeNow = new Date('2026-10-21T07:40:00.000Z');
      const res = publicService.deriveShowtimeStatus(mockShowtime, fakeNow, cutoff, closingSoon);
      expect(res.status).toBe(ShowtimeStatus.CLOSING_SOON);
      expect(res.secondsUntilClose).toBe(15 * 60); // 900 seconds
    });

    it('should derive CLOSED at 07:55:00 (exact cutoff 5m before start)', () => {
      const fakeNow = new Date('2026-10-21T07:55:00.000Z');
      const res = publicService.deriveShowtimeStatus(mockShowtime, fakeNow, cutoff, closingSoon);
      expect(res.status).toBe(ShowtimeStatus.CLOSED);
      expect(res.secondsUntilClose).toBe(0);
    });

    it('should derive ONGOING at 08:00:00 (movie has started)', () => {
      const fakeNow = new Date('2026-10-21T08:00:00.000Z');
      const res = publicService.deriveShowtimeStatus(mockShowtime, fakeNow, cutoff, closingSoon);
      expect(res.status).toBe(ShowtimeStatus.ONGOING);
    });

    it('should derive ENDED at 10:00:00 (movie has ended)', () => {
      const fakeNow = new Date('2026-10-21T10:00:00.000Z');
      const res = publicService.deriveShowtimeStatus(mockShowtime, fakeNow, cutoff, closingSoon);
      expect(res.status).toBe(ShowtimeStatus.ENDED);
    });

    it('should derive CANCELLED if marked as cancelled', () => {
      const fakeNow = new Date('2026-10-21T07:00:00.000Z');
      const res = publicService.deriveShowtimeStatus(
        { ...mockShowtime, isCancelled: true },
        fakeNow,
        cutoff,
        closingSoon,
      );
      expect(res.status).toBe(ShowtimeStatus.CANCELLED);
    });

    it('should group showtimes by Cinema and Auditorium with correct prices', async () => {
      const res = await publicService.getShowtimes({ includePast: true });
      expect(res.cinemas.length).toBeGreaterThan(0);

      const firstCinema = res.cinemas[0];
      expect(firstCinema.cinema).toBeDefined();
      expect(firstCinema.roomTypes.length).toBeGreaterThan(0);

      const firstRoomType = firstCinema.roomTypes[0] as any;
      expect(firstRoomType.showtimes.length).toBeGreaterThan(0);
      const firstSt = firstRoomType.showtimes[0];
      expect(firstSt.priceFrom).toBeGreaterThan(0);
      expect(firstSt.seatsLeft).toBeDefined();
      expect(firstSt.bookingClosesAt).toBeDefined();
    });
  });
});
