import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { YoutubeValidatorService } from './youtube-validator.service';
import { slugify } from '../../../common/utils/slug.util';
import {
  CreateMovieDto,
  UpdateMovieDto,
  AdminMovieQueryDto,
} from '../dto/admin-movie.dto';

@Injectable()
export class AdminMoviesService {
  private readonly logger = new Logger(AdminMoviesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youtubeValidator: YoutubeValidatorService,
  ) {}

  /**
   * List all movies with filtering, search & pagination for Admin
   */
  async getMovies(query: AdminMovieQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { title: { contains: search } },
        { originalTitle: { contains: search } },
        { director: { contains: search } },
      ];
    }

    if (query.genreId) {
      where.genres = {
        some: {
          genreId: query.genreId,
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.movie.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          genres: {
            include: {
              genre: true,
            },
          },
          _count: {
            select: {
              showtimes: true,
              reviews: true,
            },
          },
        },
      }),
      this.prisma.movie.count({ where }),
    ]);

    const formatted = items.map((m) => ({
      ...m,
      formats: JSON.parse(m.formats || '["2D"]'),
      castList: m.castList ? JSON.parse(m.castList) : [],
      genres: m.genres.map((g) => g.genre),
      showtimesCount: m._count.showtimes,
      reviewsCount: m._count.reviews,
    }));

    return {
      items: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single movie details
   */
  async getMovieById(id: string) {
    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
        showtimes: {
          where: { isCancelled: false },
          orderBy: { startAt: 'asc' },
          take: 10,
          include: {
            cinema: { select: { id: true, name: true, slug: true } },
            auditorium: { select: { id: true, name: true, type: true } },
          },
        },
        _count: {
          select: {
            showtimes: true,
            reviews: true,
          },
        },
      },
    });

    if (!movie || movie.deletedAt) {
      throw new NotFoundException(`Không tìm thấy phim với mã ID: ${id}`);
    }

    return {
      ...movie,
      formats: JSON.parse(movie.formats || '["2D"]'),
      castList: movie.castList ? JSON.parse(movie.castList) : [],
      genres: movie.genres.map((g) => g.genre),
      showtimesCount: movie._count.showtimes,
      reviewsCount: movie._count.reviews,
    };
  }

  private async resolveUserId(userId?: string): Promise<string | null> {
    if (!userId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user ? user.id : null;
  }

  /**
   * Create new movie
   */
  async createMovie(
    dto: CreateMovieDto,
    userId?: string,
    ipAddress?: string,
  ) {
    // 1. Validate poster
    if (!dto.posterUrl || !dto.posterUrl.trim()) {
      throw new BadRequestException('Ảnh poster phim là bắt buộc.');
    }

    const resolvedUserId = await this.resolveUserId(userId);

    // 2. Validate YouTube trailer if provided
    let trailerData: any = {};
    if (dto.trailerUrl && dto.trailerUrl.trim()) {
      const validated = await this.youtubeValidator.validateTrailer(dto.trailerUrl);
      trailerData = {
        trailerYoutubeId: validated.videoId,
        trailerUrlOriginal: dto.trailerUrl.trim(),
        trailerEmbeddable: validated.embeddable,
        trailerTitle: validated.title,
        trailerCheckedAt: new Date(),
      };
    }

    // 3. Generate unique slug
    let baseSlug = slugify(dto.title);
    if (!baseSlug) baseSlug = `movie-${Date.now()}`;
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await this.prisma.movie.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 4. Create in DB
    const movie = await this.prisma.movie.create({
      data: {
        slug: uniqueSlug,
        title: dto.title.trim(),
        originalTitle: dto.originalTitle ? dto.originalTitle.trim() : null,
        synopsis: dto.synopsis.trim(),
        durationMinutes: dto.durationMinutes,
        releaseDate: new Date(dto.releaseDate),
        ageRating: dto.ageRating || 'P',
        languages: dto.languages || 'Tiếng Việt',
        subtitleInfo: dto.subtitleInfo || 'Phụ đề tiếng Việt',
        country: dto.country || 'Việt Nam',
        director: dto.director ? dto.director.trim() : null,
        castList: dto.castList ? JSON.stringify(dto.castList) : null,
        formats: dto.formats ? JSON.stringify(dto.formats) : JSON.stringify(['2D']),
        status: dto.status || 'COMING_SOON',
        posterUrl: dto.posterUrl,
        posterBlurhash: dto.posterBlurhash || null,
        backdropUrl: dto.backdropUrl || null,
        ...trailerData,
        createdBy: resolvedUserId,
        genres: dto.genreIds && dto.genreIds.length > 0
          ? {
              create: dto.genreIds.map((genreId) => ({
                genre: { connect: { id: genreId } },
              })),
            }
          : undefined,
      },
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
    });

    // 5. Write AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: resolvedUserId,
        action: 'CREATE_MOVIE',
        entityType: 'Movie',
        entityId: movie.id,
        newData: JSON.stringify({
          title: movie.title,
          slug: movie.slug,
          status: movie.status,
          duration: movie.durationMinutes,
          trailer: movie.trailerYoutubeId,
        }),
        ipAddress: ipAddress || null,
      },
    });

    return {
      ...movie,
      formats: JSON.parse(movie.formats || '["2D"]'),
      castList: movie.castList ? JSON.parse(movie.castList) : [],
      genres: movie.genres.map((g) => g.genre),
    };
  }

  /**
   * Update movie details
   */
  async updateMovie(
    id: string,
    dto: UpdateMovieDto,
    userId?: string,
    ipAddress?: string,
  ) {
    if (!id) {
      throw new BadRequestException('ID phim không được để trống.');
    }

    const resolvedUserId = await this.resolveUserId(userId);

    const existing = await this.prisma.movie.findUnique({
      where: { id },
      include: { genres: true },
    });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException(`Không tìm thấy phim với mã ID: ${id}`);
    }

    const updateData: any = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title.trim();
    }
    if (dto.originalTitle !== undefined) {
      updateData.originalTitle = dto.originalTitle ? dto.originalTitle.trim() : null;
    }
    if (dto.synopsis !== undefined) {
      updateData.synopsis = dto.synopsis.trim();
    }
    if (dto.durationMinutes !== undefined) {
      updateData.durationMinutes = dto.durationMinutes;
    }
    if (dto.releaseDate !== undefined) {
      updateData.releaseDate = new Date(dto.releaseDate);
    }
    if (dto.ageRating !== undefined) {
      updateData.ageRating = dto.ageRating;
    }
    if (dto.languages !== undefined) {
      updateData.languages = dto.languages;
    }
    if (dto.subtitleInfo !== undefined) {
      updateData.subtitleInfo = dto.subtitleInfo;
    }
    if (dto.country !== undefined) {
      updateData.country = dto.country;
    }
    if (dto.director !== undefined) {
      updateData.director = dto.director ? dto.director.trim() : null;
    }
    if (dto.castList !== undefined) {
      updateData.castList = dto.castList ? JSON.stringify(dto.castList) : null;
    }
    if (dto.formats !== undefined) {
      updateData.formats = JSON.stringify(dto.formats);
    }
    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }
    if (dto.posterUrl !== undefined) {
      if (!dto.posterUrl.trim()) {
        throw new BadRequestException('Ảnh poster phim không được để trống.');
      }
      updateData.posterUrl = dto.posterUrl;
    }
    if (dto.posterBlurhash !== undefined) {
      updateData.posterBlurhash = dto.posterBlurhash;
    }
    if (dto.backdropUrl !== undefined) {
      updateData.backdropUrl = dto.backdropUrl;
    }

    // Trailer validation if updated
    if (dto.trailerUrl !== undefined) {
      const trimmedTrailer = dto.trailerUrl ? dto.trailerUrl.trim() : '';
      if (!trimmedTrailer) {
        updateData.trailerYoutubeId = null;
        updateData.trailerUrlOriginal = null;
        updateData.trailerEmbeddable = null;
        updateData.trailerTitle = null;
        updateData.trailerCheckedAt = null;
      } else if (trimmedTrailer !== existing.trailerUrlOriginal) {
        const validated = await this.youtubeValidator.validateTrailer(trimmedTrailer);
        updateData.trailerYoutubeId = validated.videoId;
        updateData.trailerUrlOriginal = trimmedTrailer;
        updateData.trailerEmbeddable = validated.embeddable;
        updateData.trailerTitle = validated.title;
        updateData.trailerCheckedAt = new Date();
      }
    }

    // Genre update
    if (dto.genreIds !== undefined) {
      await this.prisma.movieGenre.deleteMany({
        where: { movieId: id },
      });
      if (dto.genreIds.length > 0) {
        updateData.genres = {
          create: dto.genreIds.map((genreId) => ({
            genre: { connect: { id: genreId } },
          })),
        };
      }
    }

    const updated = await this.prisma.movie.update({
      where: { id },
      data: updateData,
      include: {
        genres: {
          include: {
            genre: true,
          },
        },
      },
    });

    // Write AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: resolvedUserId,
        action: 'UPDATE_MOVIE',
        entityType: 'Movie',
        entityId: id,
        oldData: JSON.stringify({
          title: existing.title,
          status: existing.status,
          trailer: existing.trailerYoutubeId,
        }),
        newData: JSON.stringify({
          title: updated.title,
          status: updated.status,
          trailer: updated.trailerYoutubeId,
        }),
        ipAddress: ipAddress || null,
      },
    });

    return {
      ...updated,
      formats: JSON.parse(updated.formats || '["2D"]'),
      castList: updated.castList ? JSON.parse(updated.castList) : [],
      genres: updated.genres.map((g) => g.genre),
    };
  }

  /**
   * Delete movie (with protection against showtimes with paid bookings)
   */
  async deleteMovie(id: string, userId?: string, ipAddress?: string) {
    if (!id) {
      throw new BadRequestException('ID phim không được để trống.');
    }

    const resolvedUserId = await this.resolveUserId(userId);

    const movie = await this.prisma.movie.findUnique({
      where: { id },
      include: {
        showtimes: {
          include: {
            bookings: {
              where: { status: 'PAID' },
            },
          },
        },
      },
    });

    if (!movie || movie.deletedAt) {
      throw new NotFoundException(`Không tìm thấy phim với mã ID: ${id}`);
    }

    // Check if any showtime has paid bookings
    const totalPaidBookings = movie.showtimes.reduce(
      (sum, st) => sum + st.bookings.length,
      0,
    );

    if (totalPaidBookings > 0) {
      throw new ConflictException(
        `Không thể xóa phim "${movie.title}". Đang có ${totalPaidBookings} vé đã thanh toán thuộc các suất chiếu của phim này. Vui lòng hủy suất chiếu và hoàn tiền vé trước khi xóa phim.`,
      );
    }

    // Soft delete movie and mark as ENDED
    await this.prisma.movie.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'ENDED',
      },
    });

    // Write AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: resolvedUserId,
        action: 'DELETE_MOVIE',
        entityType: 'Movie',
        entityId: id,
        oldData: JSON.stringify({ title: movie.title, status: movie.status }),
        newData: JSON.stringify({ deletedAt: new Date(), status: 'ENDED' }),
        ipAddress: ipAddress || null,
      },
    });

    return {
      success: true,
      message: `Đã xóa thành công phim "${movie.title}"`,
    };
  }
}
