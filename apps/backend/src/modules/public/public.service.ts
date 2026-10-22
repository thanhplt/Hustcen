import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClockService } from '../../common/clock/clock.service';
import { SystemSettingService } from '../../common/config/system-setting.service';
import { MovieQueryDto, ShowtimeQueryDto, NotifyMeDto } from './dto/public-catalog.dto';
import { ShowtimeStatus } from '../../common/types';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly systemSettings: SystemSettingService,
  ) {}

  async getMovies(query: MovieQueryDto) {
    const { genre, format, ageRating, cinemaSlug, status, search, sortBy, order, page = 1, limit = 12 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      status: { notIn: ['DRAFT', 'HIDDEN'] },
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (ageRating) {
      where.ageRating = ageRating;
    }

    if (genre) {
      where.genres = {
        some: {
          genre: { slug: genre },
        },
      };
    }

    if (format) {
      where.formats = { contains: format };
    }

    if (cinemaSlug) {
      where.showtimes = {
        some: {
          cinema: { slug: cinemaSlug },
        },
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { originalTitle: { contains: search } },
        { director: { contains: search } },
      ];
    }

    let orderBy: any = { releaseDate: 'desc' };
    if (sortBy === 'rating') {
      orderBy = { ratingAvg: order || 'desc' };
    } else if (sortBy === 'title') {
      orderBy = { title: order || 'asc' };
    } else if (sortBy === 'releaseDate') {
      orderBy = { releaseDate: order || 'desc' };
    }

    const [total, movies] = await Promise.all([
      this.prisma.movie.count({ where }),
      this.prisma.movie.findMany({
        where,
        include: {
          genres: { include: { genre: true } },
          showtimes: {
            where: { isCancelled: false },
            select: { startAt: true, endAt: true },
            orderBy: { startAt: 'asc' },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const now = this.clock.now();
    const cutoffMinutes = await this.systemSettings.get('bookingCutoffMinutes');

    const items = movies.map((m) => {
      return this.enrichMoviePayload(m, now, cutoffMinutes);
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async getMovieBySlug(slug: string) {
    const movie = await this.prisma.movie.findFirst({
      where: {
        slug,
        status: { notIn: ['DRAFT', 'HIDDEN'] },
        deletedAt: null,
      },
      include: {
        genres: { include: { genre: true } },
        reviews: {
          include: {
            user: { select: { id: true, fullName: true, tier: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        showtimes: {
          where: { isCancelled: false },
          select: { startAt: true, endAt: true },
          orderBy: { startAt: 'asc' },
        },
      },
    });

    if (!movie) {
      throw new NotFoundException('Không tìm thấy thông tin phim');
    }

    const now = this.clock.now();
    const cutoffMinutes = await this.systemSettings.get('bookingCutoffMinutes');
    const enriched = this.enrichMoviePayload(movie, now, cutoffMinutes);

    // Related movies (sharing at least 1 genre)
    const genreIds = movie.genres.map((g) => g.genreId);
    const related = await this.prisma.movie.findMany({
      where: {
        id: { not: movie.id },
        status: { notIn: ['DRAFT', 'HIDDEN'] },
        deletedAt: null,
        genres: { some: { genreId: { in: genreIds } } },
      },
      include: {
        genres: { include: { genre: true } },
      },
      take: 4,
    });

    return {
      ...enriched,
      cast: movie.castList ? JSON.parse(movie.castList) : [],
      formats: movie.formats ? JSON.parse(movie.formats) : ['2D'],
      reviews: movie.reviews,
      relatedMovies: related.map((r) => this.enrichMoviePayload(r, now, cutoffMinutes)),
    };
  }

  async subscribeNotifyMe(movieId: string, dto: NotifyMeDto, userId?: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException('Không tìm thấy bộ phim này');
    }

    await this.prisma.notifyMeSubscription.create({
      data: {
        movieId,
        email: dto.email || null,
        userId: userId || null,
      },
    });

    return {
      success: true,
      message: `Đã đăng ký nhận thông báo khi phim "${movie.title}" mở bán vé!`,
    };
  }

  async getCinemas(city = 'Hà Nội') {
    const cinemas = await this.prisma.cinema.findMany({
      where: city ? { city } : {},
      include: {
        auditoriums: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            capacity: true,
            priceMultiplier: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return cinemas.map((c) => ({
      ...c,
      amenities: c.amenities ? JSON.parse(c.amenities) : [],
    }));
  }

  async getCinemaBySlug(slug: string) {
    const cinema = await this.prisma.cinema.findUnique({
      where: { slug },
      include: {
        auditoriums: true,
      },
    });

    if (!cinema) {
      throw new NotFoundException('Không tìm thấy cụm rạp');
    }

    return {
      ...cinema,
      amenities: cinema.amenities ? JSON.parse(cinema.amenities) : [],
    };
  }

  async getShowtimes(query: ShowtimeQueryDto) {
    const now = this.clock.now();
    const cutoffMinutes = await this.systemSettings.get('bookingCutoffMinutes');
    const closingSoonMinutes = await this.systemSettings.get('closingSoonMinutes');

    // Default to today in Asia/Ho_Chi_Minh
    const targetDateStr = query.date || this.getDateStringVn(now);
    const { startOfDayUtc, endOfDayUtc } = this.getDayRangeUtc(targetDateStr);

    const where: any = {
      isCancelled: false,
      startAt: {
        gte: startOfDayUtc,
        lte: endOfDayUtc,
      },
    };

    if (query.cinema) {
      where.cinema = {
        OR: [{ id: query.cinema }, { slug: query.cinema }],
      };
    }

    if (query.movie) {
      where.movie = {
        OR: [{ id: query.movie }, { slug: query.movie }],
      };
    }

    const showtimes = await this.prisma.showtime.findMany({
      where,
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            slug: true,
            originalTitle: true,
            durationMinutes: true,
            ageRating: true,
            posterUrl: true,
            status: true,
            subtitleInfo: true,
            languages: true,
            formats: true,
            genres: {
              include: {
                genre: true,
              },
            },
          },
        },
        cinema: {
          select: {
            id: true,
            name: true,
            slug: true,
            address: true,
          },
        },
        auditorium: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            capacity: true,
            priceMultiplier: true,
          },
        },
        showtimeSeats: {
          select: {
            status: true,
            holdExpiresAt: true,
          },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    // Process dynamic status and group by Cinema -> Auditorium / Room Type
    const groupedCinemas = new Map<string, any>();
    const groupedMovies = new Map<string, any>();

    for (const st of showtimes) {
      const { status, bookingClosesAt, secondsUntilClose } = this.deriveShowtimeStatus(
        st,
        now,
        cutoffMinutes,
        closingSoonMinutes,
      );

      // Hide ENDED showtimes unless includePast is explicitly requested
      if (status === ShowtimeStatus.ENDED && !query.includePast) {
        continue;
      }

      // Calculate seats left
      let availableSeats = 0;
      for (const s of st.showtimeSeats) {
        if (s.status === 'AVAILABLE') {
          availableSeats++;
        } else if (s.status === 'HELD' && s.holdExpiresAt && s.holdExpiresAt.getTime() < now.getTime()) {
          availableSeats++; // Expired hold counts as available
        }
      }

      const cinemaKey = st.cinema.id;
      if (!groupedCinemas.has(cinemaKey)) {
        groupedCinemas.set(cinemaKey, {
          cinema: st.cinema,
          roomTypes: new Map<string, any>(),
        });
      }

      const cinemaEntry = groupedCinemas.get(cinemaKey);
      const roomTypeKey = st.auditorium.type;

      if (!cinemaEntry.roomTypes.has(roomTypeKey)) {
        cinemaEntry.roomTypes.set(roomTypeKey, {
          roomType: roomTypeKey,
          roomName: st.auditorium.name,
          capacity: st.auditorium.capacity,
          showtimes: [],
        });
      }

      const priceFrom = Math.round(st.basePrice * st.auditorium.priceMultiplier);
      const startTimeStr = this.formatTimeVn(st.startAt);
      const endTimeStr = this.formatTimeVn(st.endAt);

      cinemaEntry.roomTypes.get(roomTypeKey).showtimes.push({
        id: st.id,
        format: st.format,
        startAt: st.startAt.toISOString(),
        endAt: st.endAt.toISOString(),
        startTime: startTimeStr,
        endTime: endTimeStr,
        timeDisplay: `${startTimeStr} – ${endTimeStr}`,
        status,
        bookingClosesAt: bookingClosesAt.toISOString(),
        secondsUntilClose,
        priceFrom,
        seatsLeft: availableSeats,
        totalSeats: st.showtimeSeats.length || st.auditorium.capacity,
        movie: st.movie,
        auditorium: st.auditorium,
      });

      // Also group by Movie -> Format/Auditorium -> Showtimes
      const movieKey = st.movie.id;
      if (!groupedMovies.has(movieKey)) {
        groupedMovies.set(movieKey, {
          movie: {
            id: st.movie.id,
            title: st.movie.title,
            slug: st.movie.slug,
            originalTitle: st.movie.originalTitle,
            durationMinutes: st.movie.durationMinutes,
            ageRating: st.movie.ageRating,
            posterUrl: st.movie.posterUrl,
            status: st.movie.status,
            subtitleInfo: st.movie.subtitleInfo,
            languages: st.movie.languages,
            formats: st.movie.formats,
            genres: st.movie.genres ? (st.movie.genres as any[]).map((g) => g.genre?.name).filter(Boolean) : [],
          },
          cinema: st.cinema,
          formatGroups: new Map<string, any>(),
        });
      }

      const movieEntry = groupedMovies.get(movieKey);

      // Determine label: e.g. "2D Phụ Đề Anh & Việt | Rạp STARIUM" or "2D Phụ Đề Anh & Việt"
      let audTag = '';
      if (st.auditorium.name) {
        const cleanName = st.auditorium.name.replace(/Phòng \d+\s*\((.*)\)/, '$1').trim();
        if (cleanName && !cleanName.includes('Tiêu Chuẩn') && !cleanName.includes('Standard')) {
          audTag = cleanName.startsWith('Rạp') ? cleanName : `Rạp ${cleanName}`;
        }
      }

      const subLabel = st.movie.subtitleInfo || 'Phụ Đề Anh & Việt';
      const formatLabel = audTag ? `${st.format} ${subLabel} | ${audTag}` : `${st.format} ${subLabel}`;

      if (!movieEntry.formatGroups.has(formatLabel)) {
        movieEntry.formatGroups.set(formatLabel, {
          formatLabel,
          format: st.format,
          auditoriumName: st.auditorium.name,
          auditoriumType: st.auditorium.type,
          showtimes: [],
        });
      }

      movieEntry.formatGroups.get(formatLabel).showtimes.push({
        id: st.id,
        format: st.format,
        startAt: st.startAt.toISOString(),
        endAt: st.endAt.toISOString(),
        startTime: startTimeStr,
        endTime: endTimeStr,
        timeDisplay: `${startTimeStr} – ${endTimeStr}`,
        status,
        bookingClosesAt: bookingClosesAt.toISOString(),
        secondsUntilClose,
        priceFrom,
        seatsLeft: availableSeats,
        totalSeats: st.showtimeSeats.length || st.auditorium.capacity,
        auditorium: st.auditorium,
        canBook: status === ShowtimeStatus.OPEN || status === ShowtimeStatus.CLOSING_SOON,
      });
    }

    // Convert map to array response
    const results = Array.from(groupedCinemas.values()).map((cin) => ({
      cinema: cin.cinema,
      roomTypes: Array.from(cin.roomTypes.values()),
    }));

    const moviesGrouped = Array.from(groupedMovies.values()).map((mg) => ({
      movie: mg.movie,
      cinema: mg.cinema,
      formatGroups: Array.from(mg.formatGroups.values()).map((fg: any) => ({
        ...fg,
        showtimes: fg.showtimes.sort((a: any, b: any) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
      })),
    }));

    return {
      date: targetDateStr,
      isToday: targetDateStr === this.getDateStringVn(now),
      cinemas: results,
      moviesGrouped,
    };
  }

  // Derive status directly at read time from ClockService (never stored)
  deriveShowtimeStatus(
    st: { startAt: Date; endAt: Date; isCancelled: boolean; showtimeSeats?: any[] },
    now: Date,
    cutoffMinutes = 5,
    closingSoonMinutes = 15,
  ): { status: ShowtimeStatus; bookingClosesAt: Date; secondsUntilClose: number } {
    const bookingClosesAt = new Date(st.startAt.getTime() - cutoffMinutes * 60000);
    const closingSoonThreshold = new Date(bookingClosesAt.getTime() - closingSoonMinutes * 60000);
    const secondsUntilClose = Math.max(0, Math.floor((bookingClosesAt.getTime() - now.getTime()) / 1000));

    if (st.isCancelled) {
      return { status: ShowtimeStatus.CANCELLED, bookingClosesAt, secondsUntilClose: 0 };
    }

    if (now.getTime() >= st.endAt.getTime()) {
      return { status: ShowtimeStatus.ENDED, bookingClosesAt, secondsUntilClose: 0 };
    }

    if (now.getTime() >= st.startAt.getTime() && now.getTime() < st.endAt.getTime()) {
      return { status: ShowtimeStatus.ONGOING, bookingClosesAt, secondsUntilClose: 0 };
    }

    if (now.getTime() >= bookingClosesAt.getTime() && now.getTime() < st.startAt.getTime()) {
      return { status: ShowtimeStatus.CLOSED, bookingClosesAt, secondsUntilClose: 0 };
    }

    if (now.getTime() >= closingSoonThreshold.getTime() && now.getTime() < bookingClosesAt.getTime()) {
      return { status: ShowtimeStatus.CLOSING_SOON, bookingClosesAt, secondsUntilClose };
    }

    // Check sold out
    if (st.showtimeSeats && st.showtimeSeats.length > 0) {
      const hasAvailable = st.showtimeSeats.some(
        (s) =>
          s.status === 'AVAILABLE' ||
          (s.status === 'HELD' && s.holdExpiresAt && s.holdExpiresAt.getTime() < now.getTime()),
      );
      if (!hasAvailable) {
        return { status: ShowtimeStatus.SOLD_OUT, bookingClosesAt, secondsUntilClose };
      }
    }

    return { status: ShowtimeStatus.OPEN, bookingClosesAt, secondsUntilClose };
  }

  private enrichMoviePayload(movie: any, now: Date, cutoffMinutes: number) {
    const { showtimes, ...rest } = movie;

    // Determine upcoming showtimes and nextAvailableShowtimeDate
    let nextAvailableShowtimeDate: string | null = null;
    let hasUpcomingShowtimes = false;

    if (showtimes && showtimes.length > 0) {
      for (const st of showtimes) {
        const closesAt = new Date(st.startAt.getTime() - cutoffMinutes * 60000);
        if (now.getTime() < closesAt.getTime()) {
          hasUpcomingShowtimes = true;
          if (!nextAvailableShowtimeDate) {
            nextAvailableShowtimeDate = this.getDateStringVn(st.startAt);
          }
          break;
        }
      }
    }

    // Determine bookingCta
    let bookingCta: 'BOOK' | 'NOTIFY_ME' | 'NONE' = 'NONE';
    if (hasUpcomingShowtimes) {
      bookingCta = 'BOOK';
    } else if (movie.status === 'COMING_SOON') {
      bookingCta = 'NOTIFY_ME';
    }

    // Trailer payload with autoplay support
    const trailer = movie.trailerYoutubeId
      ? {
          youtubeId: movie.trailerYoutubeId,
          embedUrl: `https://www.youtube-nocookie.com/embed/${movie.trailerYoutubeId}?autoplay=1&enablejsapi=1&rel=0`,
          thumbnailUrl: `https://img.youtube.com/vi/${movie.trailerYoutubeId}/hqdefault.jpg`,
          embeddable: movie.trailerEmbeddable ?? true,
        }
      : null;

    // Poster variants
    const poster = {
      original: movie.posterUrl,
      large: movie.posterUrl,
      medium: movie.posterUrl,
      thumb: movie.posterUrl,
      blurhash: movie.posterBlurhash,
      width: movie.posterWidth || 600,
      height: movie.posterHeight || 900,
    };

    return {
      ...rest,
      poster,
      trailer,
      hasUpcomingShowtimes,
      nextAvailableShowtimeDate,
      bookingCta,
      genres: movie.genres?.map((g: any) => g.genre) || [],
    };
  }

  async getShowtimeById(id: string) {
    const now = this.clock.now();
    const cutoffMinutes = await this.systemSettings.get('bookingCutoffMinutes');
    const closingSoonMinutes = await this.systemSettings.get('closingSoonMinutes');

    const showtime = (await this.prisma.showtime.findUnique({
      where: { id },
      include: {
        movie: {
          include: {
            genres: {
              include: { genre: true },
            },
          },
        },
        cinema: true,
        auditorium: {
          include: {
            seats: {
              orderBy: [{ rowCode: 'asc' }, { seatNumber: 'asc' }],
            },
          },
        },
        showtimeSeats: true,
      },
    })) as any;

    if (!showtime) {
      throw new NotFoundException('Không tìm thấy suất chiếu');
    }

    const { status, bookingClosesAt, secondsUntilClose } = this.deriveShowtimeStatus(
      showtime,
      now,
      cutoffMinutes,
      closingSoonMinutes,
    );

    const seatStateMap = new Map<string, { status: string; holdExpiresAt: Date | null }>();
    if (showtime.showtimeSeats) {
      for (const ss of showtime.showtimeSeats) {
        let currentStatus = ss.status;
        if (ss.status === 'HELD' && ss.holdExpiresAt && ss.holdExpiresAt.getTime() < now.getTime()) {
          currentStatus = 'AVAILABLE';
        }
        seatStateMap.set(ss.seatId, {
          status: currentStatus,
          holdExpiresAt: ss.holdExpiresAt,
        });
      }
    }

    const seats = (showtime.auditorium?.seats || []).map((s: any) => {
      const state = seatStateMap.get(s.id);
      return {
        id: s.id,
        seatLabel: s.seatLabel,
        rowCode: s.rowCode,
        seatNumber: s.seatNumber,
        seatType: s.seatType,
        isWheelchair: s.isWheelchair,
        status: state ? state.status : 'AVAILABLE',
        holdExpiresAt: state ? state.holdExpiresAt : null,
      };
    });

    return {
      id: showtime.id,
      startAt: showtime.startAt.toISOString(),
      endAt: showtime.endAt.toISOString(),
      basePrice: showtime.basePrice,
      format: showtime.format,
      status,
      bookingClosesAt: bookingClosesAt.toISOString(),
      secondsUntilClose,
      isCancelled: showtime.isCancelled,
      movie: this.enrichMoviePayload(showtime.movie, now, cutoffMinutes),
      cinema: showtime.cinema,
      auditorium: {
        id: showtime.auditorium.id,
        name: showtime.auditorium.name,
        code: showtime.auditorium.code,
        type: showtime.auditorium.type,
        capacity: showtime.auditorium.capacity,
        priceMultiplier: showtime.auditorium.priceMultiplier,
      },
      seats,
    };
  }

  async getCombos() {
    return this.prisma.combo.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  private getDateStringVn(date: Date): string {
    const vnDate = this.clock.toVnDate(date);
    const y = vnDate.getFullYear();
    const m = String(vnDate.getMonth() + 1).padStart(2, '0');
    const d = String(vnDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private getDayRangeUtc(dateStr: string): { startOfDayUtc: Date; endOfDayUtc: Date } {
    // dateStr: YYYY-MM-DD
    // Asia/Ho_Chi_Minh is UTC+7
    const [y, m, d] = dateStr.split('-').map(Number);
    const startOfDayUtc = new Date(Date.UTC(y, m - 1, d, 0 - 7, 0, 0, 0));
    const endOfDayUtc = new Date(Date.UTC(y, m - 1, d, 23 - 7, 59, 59, 999));
    return { startOfDayUtc, endOfDayUtc };
  }

  private formatTimeVn(date: Date): string {
    const vnDate = this.clock.toVnDate(date);
    const h = String(vnDate.getHours()).padStart(2, '0');
    const m = String(vnDate.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}
