import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClockService } from '../../../common/clock/clock.service';
import { SystemSettingService } from '../../../common/config/system-setting.service';
import { DevMailerService } from '../../../adapters/mailer/dev-mailer.service';
import {
  CreateShowtimeDto,
  CreateShowtimeSeriesDto,
  CancelShowtimeDto,
  AdminShowtimeQueryDto,
} from '../dto/admin-showtime.dto';

@Injectable()
export class AdminShowtimesService {
  private readonly logger = new Logger(AdminShowtimesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clockService: ClockService,
    private readonly systemSettings: SystemSettingService,
    private readonly mailer: DevMailerService,
  ) {}

  private async resolveUserId(userId?: string): Promise<string | null> {
    if (!userId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return user ? user.id : null;
  }

  /**
   * Check for showtime conflicts in the same auditorium including cleaning buffer
   */
  async checkAuditoriumConflict(
    auditoriumId: string,
    startAt: Date,
    endAt: Date,
    excludeShowtimeId?: string,
  ) {
    if (startAt.getTime() >= endAt.getTime()) {
      throw new BadRequestException('Thời gian bắt đầu phải trước thời gian kết thúc.');
    }

    const cleaningBufferMinutes = await this.systemSettings.get('cleaningBufferMinutes');
    const bufferMs = cleaningBufferMinutes * 60 * 1000;

    // Buffer is added between shows:
    // Existing show: [S1, E1]. Room is busy until E1 + buffer.
    // New show: [S2, E2]. Room will be busy until E2 + buffer.
    // Conflict occurs if: S2 < E1 + buffer AND S1 < E2 + buffer
    const bufferedStart = new Date(startAt.getTime() - bufferMs);
    const bufferedEnd = new Date(endAt.getTime() + bufferMs);

    const conflicting = await this.prisma.showtime.findFirst({
      where: {
        auditoriumId,
        isCancelled: false,
        id: excludeShowtimeId ? { not: excludeShowtimeId } : undefined,
        startAt: { lt: bufferedEnd },
        endAt: { gt: bufferedStart },
      },
      include: {
        movie: { select: { title: true } },
        auditorium: { select: { name: true } },
      },
    });

    return conflicting;
  }

  /**
   * List showtimes for Admin
   */
  async getShowtimes(query: AdminShowtimeQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.cinemaId) where.cinemaId = query.cinemaId;
    if (query.movieId) where.movieId = query.movieId;

    if (query.date) {
      const startOfDay = new Date(`${query.date}T00:00:00.000Z`);
      const endOfDay = new Date(`${query.date}T23:59:59.999Z`);
      where.startAt = { gte: startOfDay, lte: endOfDay };
    }

    const [items, total] = await Promise.all([
      this.prisma.showtime.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startAt: 'desc' },
        include: {
          movie: { select: { id: true, title: true, slug: true, durationMinutes: true, posterUrl: true } },
          cinema: { select: { id: true, name: true, slug: true } },
          auditorium: { select: { id: true, name: true, type: true, capacity: true } },
          _count: {
            select: {
              showtimeSeats: true,
              bookings: true,
            },
          },
        },
      }),
      this.prisma.showtime.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single showtime detail
   */
  async getShowtimeById(id: string) {
    const showtime = await this.prisma.showtime.findUnique({
      where: { id },
      include: {
        movie: true,
        cinema: true,
        auditorium: {
          include: {
            seats: true,
          },
        },
        showtimeSeats: {
          include: {
            seat: true,
          },
        },
        bookings: {
          select: {
            id: true,
            bookingCode: true,
            status: true,
            finalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!showtime) {
      throw new NotFoundException(`Không tìm thấy suất chiếu với mã ID: ${id}`);
    }

    return showtime;
  }

  /**
   * Create a single showtime
   */
  async createShowtime(dto: CreateShowtimeDto, userId?: string, ipAddress?: string) {
    const resolvedUserId = await this.resolveUserId(userId);

    // 1. Movie check
    const movie = await this.prisma.movie.findUnique({
      where: { id: dto.movieId },
    });
    if (!movie || movie.deletedAt) {
      throw new NotFoundException(`Không tìm thấy phim với mã ID: ${dto.movieId}`);
    }

    // 2. Cinema & Auditorium check
    const auditorium = await this.prisma.auditorium.findUnique({
      where: { id: dto.auditoriumId },
      include: { seats: true },
    });
    if (!auditorium || auditorium.cinemaId !== dto.cinemaId) {
      throw new BadRequestException('Phòng chiếu không hợp lệ hoặc không thuộc rạp chiếu được chọn.');
    }

    // 3. Compute startAt & endAt
    const startAt = new Date(dto.startAt);
    let endAt: Date;
    if (dto.endAt) {
      endAt = new Date(dto.endAt);
    } else {
      endAt = new Date(startAt.getTime() + movie.durationMinutes * 60 * 1000);
    }

    if (startAt.getTime() >= endAt.getTime()) {
      throw new BadRequestException('Thời gian bắt đầu phải trước thời gian kết thúc.');
    }

    // 4. Conflict check
    const conflict = await this.checkAuditoriumConflict(dto.auditoriumId, startAt, endAt);
    if (conflict) {
      const cleaningBufferMinutes = await this.systemSettings.get('cleaningBufferMinutes');
      throw new ConflictException(
        `Xung đột lịch chiếu tại ${conflict.auditorium.name}: Đã có suất chiếu phim "${conflict.movie.title}" (${conflict.startAt.toISOString()} - ${conflict.endAt.toISOString()}). Yêu cầu khoảng cách dọn dẹp tối thiểu là ${cleaningBufferMinutes} phút.`,
      );
    }

    // 5. Create showtime and initialize seats in transaction
    const showtime = await this.prisma.$transaction(async (tx) => {
      const created = await tx.showtime.create({
        data: {
          movieId: dto.movieId,
          cinemaId: dto.cinemaId,
          auditoriumId: dto.auditoriumId,
          format: dto.format || '2D',
          startAt,
          endAt,
          basePrice: dto.basePrice,
        },
      });

      // Generate ShowtimeSeats
      if (auditorium.seats.length > 0) {
        await tx.showtimeSeat.createMany({
          data: auditorium.seats.map((seat) => ({
            showtimeId: created.id,
            seatId: seat.id,
            status: 'AVAILABLE',
          })),
        });
      }

      // Record AuditLog
      await tx.auditLog.create({
        data: {
          userId: resolvedUserId,
          action: 'CREATE_SHOWTIME',
          entityType: 'Showtime',
          entityId: created.id,
          newData: JSON.stringify({
            movieId: created.movieId,
            auditoriumId: created.auditoriumId,
            startAt: created.startAt,
            endAt: created.endAt,
            basePrice: created.basePrice,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return created;
    });

    return showtime;
  }

  /**
   * Create recurring showtimes series
   */
  async createShowtimeSeries(dto: CreateShowtimeSeriesDto, userId?: string, ipAddress?: string) {
    const resolvedUserId = await this.resolveUserId(userId);

    const movie = await this.prisma.movie.findUnique({ where: { id: dto.movieId } });
    if (!movie || movie.deletedAt) {
      throw new NotFoundException(`Không tìm thấy phim với mã ID: ${dto.movieId}`);
    }

    const auditorium = await this.prisma.auditorium.findUnique({
      where: { id: dto.auditoriumId },
      include: { seats: true },
    });
    if (!auditorium || auditorium.cinemaId !== dto.cinemaId) {
      throw new BadRequestException('Phòng chiếu không hợp lệ hoặc không thuộc rạp đã chọn.');
    }

    const [hours, minutes] = dto.timeOfDay.split(':').map(Number);
    const startRange = new Date(dto.startDate);
    const endRange = new Date(dto.endDate);

    if (startRange > endRange) {
      throw new BadRequestException('Ngày bắt đầu chuỗi phải trước hoặc bằng ngày kết thúc.');
    }

    // Generate dates matching daysOfWeek (1=Mon ... 7=Sun)
    const plannedSlots: { startAt: Date; endAt: Date }[] = [];
    const curr = new Date(startRange);
    while (curr <= endRange) {
      // JavaScript getDay(): 0=Sun, 1=Mon, ..., 6=Sat
      // Convert to ISO 1=Mon ... 7=Sun:
      const dayOfWeekIso = curr.getDay() === 0 ? 7 : curr.getDay();

      if (dto.daysOfWeek.includes(dayOfWeekIso)) {
        const slotStart = new Date(curr);
        slotStart.setHours(hours, minutes, 0, 0);

        const slotEnd = new Date(slotStart.getTime() + movie.durationMinutes * 60 * 1000);

        // Pre-check conflict
        const conflict = await this.checkAuditoriumConflict(dto.auditoriumId, slotStart, slotEnd);
        if (conflict) {
          throw new ConflictException(
            `Xung đột khi tạo chuỗi suất chiếu vào ngày ${slotStart.toISOString().split('T')[0]} lúc ${dto.timeOfDay}: Trùng với suất chiếu phim "${conflict.movie.title}".`,
          );
        }

        plannedSlots.push({ startAt: slotStart, endAt: slotEnd });
      }

      // Next day
      curr.setDate(curr.getDate() + 1);
    }

    if (plannedSlots.length === 0) {
      throw new BadRequestException(
        'Không có ngày nào phù hợp với các thứ trong tuần đã chọn trong khoảng thời gian đã định.',
      );
    }

    // Create series and all showtimes in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const series = await tx.showtimeSeries.create({
        data: {
          daysOfWeek: JSON.stringify(dto.daysOfWeek),
          startDate: startRange,
          endDate: endRange,
        },
      });

      const createdShowtimes = [];
      for (const slot of plannedSlots) {
        const st = await tx.showtime.create({
          data: {
            movieId: dto.movieId,
            cinemaId: dto.cinemaId,
            auditoriumId: dto.auditoriumId,
            seriesId: series.id,
            format: dto.format || '2D',
            startAt: slot.startAt,
            endAt: slot.endAt,
            basePrice: dto.basePrice,
          },
        });

        if (auditorium.seats.length > 0) {
          await tx.showtimeSeat.createMany({
            data: auditorium.seats.map((seat) => ({
              showtimeId: st.id,
              seatId: seat.id,
              status: 'AVAILABLE',
            })),
          });
        }

        createdShowtimes.push(st);
      }

      // AuditLog
      await tx.auditLog.create({
        data: {
          userId: resolvedUserId,
          action: 'CREATE_SHOWTIME_SERIES',
          entityType: 'ShowtimeSeries',
          entityId: series.id,
          newData: JSON.stringify({
            seriesId: series.id,
            showtimesCount: createdShowtimes.length,
            timeOfDay: dto.timeOfDay,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return {
        seriesId: series.id,
        createdCount: createdShowtimes.length,
        showtimes: createdShowtimes,
      };
    });

    return result;
  }

  /**
   * Cancel showtime and trigger auto-refund for all paid bookings
   */
  async cancelShowtime(id: string, dto: CancelShowtimeDto, userId?: string, ipAddress?: string) {
    const resolvedUserId = await this.resolveUserId(userId);

    const showtime = await this.prisma.showtime.findUnique({
      where: { id },
      include: {
        movie: true,
        cinema: true,
        auditorium: true,
        bookings: {
          where: { status: 'PAID' },
          include: { user: true },
        },
      },
    });

    if (!showtime) {
      throw new NotFoundException(`Không tìm thấy suất chiếu với mã ID: ${id}`);
    }

    if (showtime.isCancelled) {
      throw new BadRequestException('Suất chiếu này đã bị hủy trước đó.');
    }

    // Perform cancellation and refunds in transaction
    await this.prisma.$transaction(async (tx) => {
      // 1. Mark showtime as cancelled
      await tx.showtime.update({
        where: { id },
        data: {
          isCancelled: true,
          cancelledReason: dto.reason,
        },
      });

      // 2. Refund all paid bookings
      for (const booking of showtime.bookings) {
        await tx.refund.create({
          data: {
            bookingId: booking.id,
            amount: booking.finalAmount,
            reason: `Hủy suất chiếu: ${dto.reason}`,
            approvedBy: resolvedUserId,
          },
        });

        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: 'REFUNDED',
          },
        });
      }

      // 3. Reset all seats of this showtime back to AVAILABLE
      await tx.showtimeSeat.updateMany({
        where: { showtimeId: id },
        data: {
          status: 'AVAILABLE',
          holdUserId: null,
          holdSessionId: null,
          holdExpiresAt: null,
        },
      });

      // 4. Record AuditLog
      await tx.auditLog.create({
        data: {
          userId: resolvedUserId,
          action: 'CANCEL_SHOWTIME',
          entityType: 'Showtime',
          entityId: id,
          newData: JSON.stringify({
            reason: dto.reason,
            refundedBookingsCount: showtime.bookings.length,
          }),
          ipAddress: ipAddress || null,
        },
      });
    });

    // Send notification email to each customer
    for (const booking of showtime.bookings) {
      const recipient = booking.user?.email || booking.guestEmail;
      if (recipient) {
        await this.mailer.sendMail({
          to: recipient,
          subject: `[HUST Cine] Thông báo hủy suất chiếu "${showtime.movie.title}"`,
          category: 'CANCEL',
          bodyText: `Kính gửi quý khách,\n\nSuất chiếu "${showtime.movie.title}" vào lúc ${showtime.startAt.toISOString()} tại ${showtime.cinema.name} (${showtime.auditorium.name}) đã bị hủy vì lý do: ${dto.reason}.\n\nĐơn hàng ${booking.bookingCode} trị giá ${booking.finalAmount.toLocaleString('vi-VN')}đ đã được hoàn tiền đầy đủ.\n\nTrân trọng,\nHUST Cine`,
          bodyHtml: `<p>Kính gửi quý khách,</p><p>Suất chiếu <strong>${showtime.movie.title}</strong> vào lúc ${showtime.startAt.toLocaleString('vi-VN')} tại ${showtime.cinema.name} đã bị hủy.</p><p>Lý do: <em>${dto.reason}</em></p><p>Số tiền <strong>${booking.finalAmount.toLocaleString('vi-VN')}đ</strong> (Đơn hàng #${booking.bookingCode}) đã được hoàn lại đầy đủ.</p>`,
        });
      }
    }

    return {
      success: true,
      message: `Đã hủy suất chiếu và hoàn tiền cho ${showtime.bookings.length} đơn hàng.`,
      refundedBookingsCount: showtime.bookings.length,
    };
  }

  /**
   * Delete a showtime (allowed only if no paid bookings exist)
   */
  async deleteShowtime(id: string, userId?: string, ipAddress?: string) {
    const resolvedUserId = await this.resolveUserId(userId);

    const showtime = await this.prisma.showtime.findUnique({
      where: { id },
      include: {
        bookings: {
          where: { status: 'PAID' },
        },
      },
    });

    if (!showtime) {
      throw new NotFoundException(`Không tìm thấy suất chiếu với mã ID: ${id}`);
    }

    if (showtime.bookings.length > 0) {
      throw new ConflictException(
        `Không thể xóa suất chiếu này vì có ${showtime.bookings.length} vé đã thanh toán. Vui lòng sử dụng chức năng "Hủy suất chiếu" để hoàn tiền cho khách trước.`,
      );
    }

    // Delete showtime seats and showtime
    await this.prisma.$transaction(async (tx) => {
      await tx.showtimeSeat.deleteMany({
        where: { showtimeId: id },
      });
      await tx.showtime.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: resolvedUserId,
          action: 'DELETE_SHOWTIME',
          entityType: 'Showtime',
          entityId: id,
          oldData: JSON.stringify({ startAt: showtime.startAt, format: showtime.format }),
          ipAddress: ipAddress || null,
        },
      });
    });

    return {
      success: true,
      message: 'Đã xóa thành công suất chiếu.',
    };
  }

  /**
   * Cutoff verification helper: ensures booking is disallowed once cutoff has passed
   */
  async canBookShowtime(showtimeId: string): Promise<{ canBook: boolean; reason?: string; message?: string }> {
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: showtimeId },
      select: { startAt: true, endAt: true, isCancelled: true },
    });

    if (!showtime) {
      return { canBook: false, reason: 'NOT_FOUND', message: 'Suất chiếu không tồn tại.' };
    }

    if (showtime.isCancelled) {
      return { canBook: false, reason: 'CANCELLED', message: 'Suất chiếu đã bị hủy.' };
    }

    const now = this.clockService.now();
    const cutoffMinutes = await this.systemSettings.get('bookingCutoffMinutes');
    const cutoffTime = new Date(showtime.startAt.getTime() - cutoffMinutes * 60 * 1000);

    if (now >= showtime.endAt) {
      return { canBook: false, reason: 'ENDED', message: 'Suất chiếu đã kết thúc.' };
    }

    if (now >= showtime.startAt) {
      return { canBook: false, reason: 'ONGOING', message: 'Suất chiếu đang diễn ra.' };
    }

    if (now >= cutoffTime) {
      return {
        canBook: false,
        reason: 'CLOSED',
        message: `Suất chiếu đã đóng đặt vé trực tuyến (${cutoffMinutes} phút trước giờ chiếu).`,
      };
    }

    return { canBook: true };
  }
}
