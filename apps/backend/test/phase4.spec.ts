import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
const sharp = require('sharp');
import { PrismaService } from '../src/common/prisma/prisma.service';
import { LocalDiskStorageService } from '../src/adapters/storage/local-disk-storage.service';
import { PosterProcessorService } from '../src/modules/admin/services/poster-processor.service';
import { YoutubeValidatorService } from '../src/modules/admin/services/youtube-validator.service';
import { AdminMoviesService } from '../src/modules/admin/services/admin-movies.service';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { MovieAgeRating, MovieStatus } from '../src/modules/admin/dto/admin-movie.dto';

describe('Phase 4: Admin Movies, Poster Upload & YouTube Trailer Tests', () => {
  let prisma: PrismaService;
  let storageService: LocalDiskStorageService;
  let posterProcessor: PosterProcessorService;
  let youtubeValidator: YoutubeValidatorService;
  let adminMoviesService: AdminMoviesService;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;
  let createdMovieId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    storageService = new LocalDiskStorageService();
    posterProcessor = new PosterProcessorService(storageService);
    youtubeValidator = new YoutubeValidatorService();
    adminMoviesService = new AdminMoviesService(prisma, youtubeValidator);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  afterAll(async () => {
    if (createdMovieId) {
      await prisma.auditLog.deleteMany({
        where: { entityType: 'Movie', entityId: createdMovieId },
      });
      await prisma.movieGenre.deleteMany({
        where: { movieId: createdMovieId },
      });
      await prisma.movie.deleteMany({
        where: { id: createdMovieId },
      });
    }
    await prisma.movie.deleteMany({
      where: { slug: { startsWith: 'robot-sinh-vien-bach-khoa' } },
    });
    await prisma.onModuleDestroy();
  });

  describe('1. Poster Processor & Magic Bytes Validation', () => {
    it('should validate valid PNG, JPEG, and WebP buffers', async () => {
      // 1. Create true PNG buffer using sharp
      const pngBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 200, g: 16, b: 46, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      expect(posterProcessor.validateMagicBytes(pngBuffer)).toBe('png');

      // 2. Create true JPEG buffer
      const jpegBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .jpeg()
        .toBuffer();

      expect(posterProcessor.validateMagicBytes(jpegBuffer)).toBe('jpeg');

      // 3. Create true WebP buffer
      const webpBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 1 },
        },
      })
        .webp()
        .toBuffer();

      expect(posterProcessor.validateMagicBytes(webpBuffer)).toBe('webp');
    });

    it('should reject fake or unsupported image buffers', () => {
      const fakeBuffer = Buffer.from('NOT_AN_IMAGE_FILE_DATA');
      expect(() => posterProcessor.validateMagicBytes(fakeBuffer)).toThrow(
        BadRequestException,
      );

      const emptyBuffer = Buffer.alloc(5);
      expect(() => posterProcessor.validateMagicBytes(emptyBuffer)).toThrow(
        BadRequestException,
      );
    });

    it('should process poster image into 3 WebP variants and generate blurhash placeholder', async () => {
      // Generate a realistic 800x1200 test image
      const inputBuffer = await sharp({
        create: {
          width: 800,
          height: 1200,
          channels: 3,
          background: { r: 200, g: 16, b: 46 }, // HUST Red
        },
      })
        .jpeg()
        .toBuffer();

      const result = await posterProcessor.processPoster(
        inputBuffer,
        'test-movie-poster.jpg',
      );

      expect(result.posterUrl).toBeDefined();
      expect(result.posterLarge).toContain('.webp');
      expect(result.posterMedium).toContain('.webp');
      expect(result.posterSmall).toContain('.webp');
      expect(result.blurhash).toContain('data:image/webp;base64,');
      expect(result.width).toBe(600);
      expect(result.height).toBe(900);
    });
  });

  describe('2. YouTube Trailer Validator & Extraction', () => {
    it('should extract correct 11-char video ID from various YouTube URL formats', () => {
      const testCases = [
        {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ',
        },
        {
          url: 'https://youtu.be/dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ',
        },
        {
          url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share',
          expected: 'dQw4w9WgXcQ',
        },
        {
          url: 'https://youtube.com/embed/dQw4w9WgXcQ',
          expected: 'dQw4w9WgXcQ',
        },
      ];

      testCases.forEach(({ url, expected }) => {
        expect(youtubeValidator.extractVideoId(url)).toBe(expected);
      });
    });

    it('should reject non-YouTube and malicious URLs', () => {
      const invalidUrls = [
        'javascript:alert("XSS")',
        'https://vimeo.com/76979871',
        '<script>alert(1)</script>',
        'https://malicious-site.com/watch?v=dQw4w9WgXcQ',
        '',
        'not a url',
      ];

      invalidUrls.forEach((url) => {
        expect(youtubeValidator.extractVideoId(url)).toBeNull();
      });
    });

    it('should return valid trailer embed and fallback metadata', async () => {
      const result = await youtubeValidator.validateTrailer(
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      );
      expect(result.videoId).toBe('dQw4w9WgXcQ');
      expect(result.embedUrl).toContain('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
      expect(result.embedUrl).toContain('autoplay=1');
      expect(result.thumbnailUrl).toBeDefined();
    });
  });

  describe('3. Admin Movie Management & AuditLog Tracking', () => {
    let testGenreId: string;
    let adminUserId: string;

    beforeAll(async () => {
      const genre = await prisma.genre.findFirst();
      testGenreId = genre!.id;
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      adminUserId = admin!.id;

      // Clean up previous test movie if any
      await prisma.movie.deleteMany({
        where: { slug: { startsWith: 'robot-sinh-vien-bach-khoa' } },
      });
    });

    it('should reject creating movie without poster image', async () => {
      await expect(
        adminMoviesService.createMovie({
          title: 'Phim Không Có Poster',
          synopsis: 'Mô tả thử nghiệm không có poster',
          durationMinutes: 100,
          releaseDate: '2026-11-20',
          posterUrl: '',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create movie with poster, trailer validation & AuditLog', async () => {
      const movie = await adminMoviesService.createMovie(
        {
          title: 'Robot Sinh Viên Bách Khoa',
          originalTitle: 'HUST Student Robot',
          synopsis: 'Hành trình chế tạo robot vô địch Robocon của sinh viên ĐHBK Hà Nội.',
          durationMinutes: 110,
          releaseDate: '2026-12-15',
          ageRating: MovieAgeRating.P,
          languages: 'Tiếng Việt',
          subtitleInfo: 'Phụ đề tiếng Anh',
          country: 'Việt Nam',
          director: 'Nguyễn Văn A',
          castList: ['Sinh Viên K65', 'Thầy Hướng Dẫn'],
          formats: ['2D', 'IMAX'],
          status: MovieStatus.COMING_SOON,
          posterUrl: 'http://localhost:4000/uploads/posters/robot_bk_lg.webp',
          posterBlurhash: 'data:image/webp;base64,sampleblurhash',
          trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          genreIds: [testGenreId],
        },
        adminUserId,
        '127.0.0.1',
      );

      createdMovieId = movie.id;
      expect(movie.id).toBeDefined();
      expect(movie.slug).toBe('robot-sinh-vien-bach-khoa');
      expect(movie.trailerYoutubeId).toBe('dQw4w9WgXcQ');
      expect(movie.genres.length).toBeGreaterThan(0);
      createdMovieId = movie.id;

      // Check AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'CREATE_MOVIE',
          entityType: 'Movie',
          entityId: movie.id,
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.userId).toBe(adminUserId);
      expect(audit?.ipAddress).toBe('127.0.0.1');
      expect(JSON.parse(audit!.newData!).slug).toBe('robot-sinh-vien-bach-khoa');
    });

    it('should update movie details, re-validate trailer and record UPDATE_MOVIE AuditLog', async () => {
      const updated = await adminMoviesService.updateMovie(
        createdMovieId,
        {
          title: 'Robot Sinh Viên Bách Khoa - Phần 2',
          durationMinutes: 120,
          trailerUrl: 'https://youtu.be/L_LUpnjgPso',
        },
        adminUserId,
        '127.0.0.1',
      );

      expect(updated.title).toBe('Robot Sinh Viên Bách Khoa - Phần 2');
      expect(updated.durationMinutes).toBe(120);
      expect(updated.trailerYoutubeId).toBe('L_LUpnjgPso');

      // Check AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'UPDATE_MOVIE',
          entityType: 'Movie',
          entityId: createdMovieId,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(JSON.parse(audit!.newData!).title).toBe('Robot Sinh Viên Bách Khoa - Phần 2');
    });

    it('should block movie deletion when paid bookings exist (ConflictException HTTP 409)', async () => {
      // Find a movie that has a paid booking from seed data
      const paidBooking = await prisma.booking.findFirst({
        where: { status: 'PAID' },
        include: { showtime: true },
      });

      if (paidBooking) {
        await expect(
          adminMoviesService.deleteMovie(
            paidBooking.showtime.movieId,
            adminUserId,
            '127.0.0.1',
          ),
        ).rejects.toThrow(ConflictException);
      }
    });

    it('should safely soft-delete movie when no paid bookings exist', async () => {
      const result = await adminMoviesService.deleteMovie(
        createdMovieId,
        adminUserId,
        '127.0.0.1',
      );

      expect(result.success).toBe(true);

      const deleted = await prisma.movie.findUnique({
        where: { id: createdMovieId },
      });
      expect(deleted?.deletedAt).not.toBeNull();
      expect(deleted?.status).toBe('ENDED');

      // Check AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: 'DELETE_MOVIE',
          entityType: 'Movie',
          entityId: createdMovieId,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).toBeDefined();
      expect(audit?.action).toBe('DELETE_MOVIE');
    });

    it('should paginate and filter admin movies query', async () => {
      const res = await adminMoviesService.getMovies({
        page: 1,
        limit: 5,
        status: MovieStatus.NOW_SHOWING,
      });

      expect(res.items.length).toBeLessThanOrEqual(5);
      expect(res.meta.total).toBeGreaterThan(0);
      res.items.forEach((m) => {
        expect(m.status).toBe('NOW_SHOWING');
        expect(m.showtimesCount).toBeDefined();
      });
    });
  });

  describe('4. RBAC Authorization for Admin Endpoints', () => {
    it('should allow ADMIN and reject CUSTOMER for admin operations', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

      const adminContext: any = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: 'u1', role: 'ADMIN' } }),
        }),
      };
      expect(rolesGuard.canActivate(adminContext)).toBe(true);

      const customerContext: any = {
        getHandler: () => {},
        getClass: () => {},
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: 'u2', role: 'CUSTOMER' } }),
        }),
      };
      expect(() => rolesGuard.canActivate(customerContext)).toThrow(
        ForbiddenException,
      );
    });
  });
});
