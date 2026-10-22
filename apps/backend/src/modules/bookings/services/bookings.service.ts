import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClockService } from '../../../common/clock/clock.service';
import { SystemSettingService } from '../../../common/config/system-setting.service';
import { DevMailerService } from '../../../adapters/mailer/dev-mailer.service';
import { PricingService } from './pricing.service';
import { OrphanSeatCheckerService } from './orphan-seat-checker.service';
import { EventsGateway } from '../gateways/events.gateway';
import { HoldSeatsDto, ReleaseHoldDto } from '../dto/hold-seats.dto';
import { CreateBookingDto, CalculatePriceDto } from '../dto/create-booking.dto';
import { CancelBookingDto } from '../dto/cancel-booking.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clockService: ClockService,
    private readonly systemSettings: SystemSettingService,
    private readonly pricingService: PricingService,
    private readonly orphanSeatChecker: OrphanSeatCheckerService,
    private readonly eventsGateway: EventsGateway,
    @Optional() private readonly mailer?: DevMailerService,
  ) {}

  /**
   * Atomic Seat Hold Engine
   */
  async holdSeats(dto: HoldSeatsDto, userId?: string, sessionId?: string) {
    if (!userId && !sessionId) {
      throw new BadRequestException('Yêu cầu mã phiên (sessionId) hoặc đăng nhập để giữ ghế.');
    }

    const showtime = await this.prisma.showtime.findUnique({
      where: { id: dto.showtimeId },
      include: {
        auditorium: {
          include: {
            seats: true,
          },
        },
      },
    });

    if (!showtime) {
      throw new NotFoundException(`Không tìm thấy suất chiếu với mã: ${dto.showtimeId}`);
    }

    if (showtime.isCancelled) {
      throw new ConflictException('Suất chiếu này đã bị hủy.');
    }

    const now = this.clockService.now();
    const cutoffMinutes = await this.systemSettings.get('bookingCutoffMinutes');
    const cutoffTime = new Date(showtime.startAt.getTime() - cutoffMinutes * 60 * 1000);

    if (now >= cutoffTime) {
      throw new ConflictException(
        `Suất chiếu đã đóng đặt vé trực tuyến (${cutoffMinutes} phút trước giờ chiếu).`,
      );
    }

    const { auditorium } = showtime;

    // 1. Whole Room Mode check (Private Lab)
    if (auditorium.bookingMode === 'WHOLE_ROOM') {
      if (dto.seatIds.length !== auditorium.seats.length) {
        throw new BadRequestException(
          `Phòng chiếu "${auditorium.name}" áp dụng hình thức thuê trọn gói cả phòng. Vui lòng chọn toàn bộ ${auditorium.seats.length} ghế trong phòng.`,
        );
      }
    } else {
      // 2. Max 8 seats rule for standard bookings
      if (dto.seatIds.length > 8) {
        throw new BadRequestException('Mỗi lần đặt vé chỉ được giữ tối đa 8 ghế.');
      }
    }

    // 3. Orphan seat prevention check
    const orphanResult = await this.orphanSeatChecker.checkOrphanSeats(
      dto.showtimeId,
      auditorium.id,
      dto.seatIds,
      now,
    );
    if (orphanResult.hasOrphan) {
      throw new BadRequestException(orphanResult.message);
    }

    const seatHoldMinutes = await this.systemSettings.get('seatHoldMinutes');
    const holdExpiresAt = new Date(now.getTime() + seatHoldMinutes * 60 * 1000);

    // 4. Atomic conditional hold update in single transaction
    const heldSeats = await this.prisma.$transaction(async (tx) => {
      const currentShowtimeSeats = await tx.showtimeSeat.findMany({
        where: {
          showtimeId: dto.showtimeId,
          seatId: { in: dto.seatIds },
        },
        include: { seat: true },
      });

      if (currentShowtimeSeats.length !== dto.seatIds.length) {
        throw new BadRequestException('Một số ghế không tồn tại trong suất chiếu này.');
      }

      for (const stSeat of currentShowtimeSeats) {
        if (stSeat.status === 'SOLD') {
          throw new ConflictException(`Ghế ${stSeat.seat.seatLabel} đã được bán.`);
        }

        const isActivelyHeldByOther =
          stSeat.status === 'HELD' &&
          stSeat.holdExpiresAt &&
          stSeat.holdExpiresAt >= now &&
          !(userId && stSeat.holdUserId === userId) &&
          !(sessionId && stSeat.holdSessionId === sessionId);

        if (isActivelyHeldByOther) {
          throw new ConflictException(
            `Ghế ${stSeat.seat.seatLabel} đang được giữ bởi khách hàng khác. Vui lòng chọn ghế khác.`,
          );
        }
      }

      // Update all selected seats to HELD
      await tx.showtimeSeat.updateMany({
        where: {
          showtimeId: dto.showtimeId,
          seatId: { in: dto.seatIds },
        },
        data: {
          status: 'HELD',
          holdUserId: userId || null,
          holdSessionId: sessionId || null,
          holdExpiresAt,
        },
      });

      return currentShowtimeSeats.map((s) => s.seatId);
    });

    // 5. Broadcast realtime seat status change via WebSocket
    this.eventsGateway.broadcastSeatStatusChanged(
      dto.showtimeId,
      dto.seatIds.map((seatId) => ({
        seatId,
        status: 'HELD',
        holdExpiresAt,
      })),
    );

    return {
      success: true,
      showtimeId: dto.showtimeId,
      heldSeats,
      holdExpiresAt,
      holdDurationMinutes: seatHoldMinutes,
    };
  }

  /**
   * Release held seats
   */
  async releaseHold(dto: ReleaseHoldDto, userId?: string, sessionId?: string) {
    const where: any = {
      showtimeId: dto.showtimeId,
      seatId: { in: dto.seatIds },
      status: 'HELD',
    };

    if (userId) {
      where.holdUserId = userId;
    } else if (sessionId) {
      where.holdSessionId = sessionId;
    }

    await this.prisma.showtimeSeat.updateMany({
      where,
      data: {
        status: 'AVAILABLE',
        holdUserId: null,
        holdSessionId: null,
        holdExpiresAt: null,
      },
    });

    // Broadcast to room
    this.eventsGateway.broadcastSeatStatusChanged(
      dto.showtimeId,
      dto.seatIds.map((seatId) => ({
        seatId,
        status: 'AVAILABLE',
        holdExpiresAt: null,
      })),
    );

    return {
      success: true,
      showtimeId: dto.showtimeId,
      releasedSeats: dto.seatIds,
    };
  }

  /**
   * Calculate price breakdown for selection
   */
  async calculatePrice(dto: CalculatePriceDto) {
    return this.pricingService.calculateTotalPrice(
      dto.showtimeId,
      dto.seatIds,
      dto.combos,
      dto.voucherCode,
    );
  }

  /**
   * Create Booking from active hold
   */
  async createBooking(dto: CreateBookingDto, userId?: string, sessionId?: string) {
    const now = this.clockService.now();

    // 1. Verify showtime cutoff
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: dto.showtimeId },
      include: {
        auditorium: true,
        cinema: true,
        movie: true,
      },
    });

    if (!showtime) {
      throw new NotFoundException('Suất chiếu không tồn tại.');
    }

    if (showtime.isCancelled) {
      throw new ConflictException('Suất chiếu này đã bị hủy.');
    }

    const cutoffMinutes = await this.systemSettings.get('bookingCutoffMinutes');
    const cutoffTime = new Date(showtime.startAt.getTime() - cutoffMinutes * 60 * 1000);
    if (now >= cutoffTime) {
      throw new ConflictException('Suất chiếu đã đóng đặt vé trực tuyến.');
    }

    // Resolve effective userId from parameter or by registered guest email
    let effectiveUserId = userId;
    if (!effectiveUserId && dto.guestEmail) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.guestEmail.trim().toLowerCase() },
      });
      if (existingUser) {
        effectiveUserId = existingUser.id;
      }
    }

    // 2. Verify all seats are actively held by this caller
    const heldSeats = await this.prisma.showtimeSeat.findMany({
      where: {
        showtimeId: dto.showtimeId,
        seatId: { in: dto.seatIds },
      },
      include: { seat: true },
    });

    if (heldSeats.length !== dto.seatIds.length) {
      throw new BadRequestException('Danh sách ghế không hợp lệ.');
    }

    for (const s of heldSeats) {
      if (s.status === 'SOLD') {
        throw new ConflictException(`Ghế ${s.seat.seatLabel} đã được bán.`);
      }

      const isOwnedByMe =
        s.status === 'HELD' &&
        s.holdExpiresAt &&
        s.holdExpiresAt >= now &&
        ((s.holdUserId && (s.holdUserId === effectiveUserId || s.holdUserId === userId)) ||
          (sessionId && s.holdSessionId === sessionId) ||
          (!s.holdUserId && !s.holdSessionId));

      if (!isOwnedByMe) {
        throw new ConflictException(
          `Ghế ${s.seat.seatLabel} chưa được giữ hoặc thời gian giữ ghế đã hết hạn. Vui lòng chọn và giữ ghế lại.`,
        );
      }
    }

    // 3. Compute price breakdown
    const pricing = await this.pricingService.calculateTotalPrice(
      dto.showtimeId,
      dto.seatIds,
      dto.combos,
      dto.voucherCode,
    );

    // 4. Generate unique Booking Code: #HUST-xxxxxx
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const bookingCode = `#HUST-${randomSuffix}`;

    // Earliest hold expiration among the seats or 10m from now
    const expiresAt = heldSeats[0].holdExpiresAt || new Date(now.getTime() + 10 * 60 * 1000);

    // 5. Create Booking in database transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      // Find or link voucher
      let voucherId: string | null = null;
      if (pricing.voucher) {
        const dbVoucher = await tx.voucher.findUnique({
          where: { code: pricing.voucher.code },
        });
        if (dbVoucher) {
          voucherId = dbVoucher.id;
          await tx.voucher.update({
            where: { id: dbVoucher.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }

      // Create Booking record
      const createdBooking = await tx.booking.create({
        data: {
          bookingCode,
          userId: effectiveUserId || null,
          showtimeId: dto.showtimeId,
          cinemaId: showtime.cinemaId,
          guestEmail: dto.guestEmail || null,
          guestPhone: dto.guestPhone || null,
          guestName: dto.guestName || null,
          totalAmount: pricing.subtotalSeats + pricing.subtotalCombos,
          discountAmount: pricing.discountAmount,
          finalAmount: pricing.finalAmount,
          status: 'PENDING',
          expiresAt,
          bookingSeats: {
            create: pricing.seats.map((s) => {
              const stSeat = heldSeats.find((hs) => hs.seatId === s.seatId);
              return {
                showtimeSeatId: stSeat!.id,
                price: s.price,
              };
            }),
          },
          bookingCombos:
            pricing.combos.length > 0
              ? {
                  create: pricing.combos.map((c) => ({
                    comboId: c.comboId,
                    quantity: c.quantity,
                    unitPrice: c.unitPrice,
                  })),
                }
              : undefined,
        },
        include: {
          bookingSeats: {
            include: {
              showtimeSeat: {
                include: { seat: true },
              },
            },
          },
          bookingCombos: {
            include: { combo: true },
          },
        },
      });

      if (voucherId) {
        await tx.voucherRedemption.create({
          data: {
            voucherId,
            bookingId: createdBooking.id,
            userId: userId || null,
          },
        });
      }

      return createdBooking;
    });

    return {
      id: booking.id,
      bookingCode: booking.bookingCode,
      status: booking.status,
      totalAmount: booking.totalAmount,
      discountAmount: booking.discountAmount,
      finalAmount: booking.finalAmount,
      expiresAt: booking.expiresAt,
      movie: {
        title: showtime.movie.title,
        posterUrl: showtime.movie.posterUrl,
        formats: showtime.format,
      },
      cinema: {
        name: showtime.cinema.name,
      },
      auditorium: {
        name: showtime.auditorium.name,
      },
      showtime: {
        startAt: showtime.startAt,
        endAt: showtime.endAt,
      },
      seats: booking.bookingSeats.map((bs) => ({
        seatLabel: bs.showtimeSeat.seat.seatLabel,
        seatType: bs.showtimeSeat.seat.seatType,
        price: bs.price,
      })),
      combos: booking.bookingCombos.map((bc) => ({
        name: bc.combo.name,
        quantity: bc.quantity,
        unitPrice: bc.unitPrice,
      })),
    };
  }

  /**
   * Get booking details
   */
  async getBookingById(idOrCode: string, userId?: string) {
    const codeWithHash = idOrCode.startsWith('#') ? idOrCode : `#${idOrCode}`;
    const isDemo = idOrCode.toUpperCase().includes('DEMO');
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { bookingCode: idOrCode },
          { bookingCode: codeWithHash },
          ...(isDemo ? [{ bookingCode: '#HUST-DEMO-001' }, { bookingCode: { contains: 'DEMO' } }] : []),
        ],
      },
      include: {
        showtime: {
          include: {
            movie: true,
            cinema: true,
            auditorium: true,
          },
        },
        bookingSeats: {
          include: {
            showtimeSeat: {
              include: { seat: true },
            },
          },
        },
        bookingCombos: {
          include: { combo: true },
        },
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID/Mã vé: ${idOrCode}`);
    }

    // If userId supplied and booking belongs to a user, check permission
    if (userId && booking.userId && booking.userId !== userId) {
      throw new BadRequestException('Bạn không có quyền xem đơn hàng này.');
    }

    return booking;
  }

  /**
   * Cancel booking (allowed up to 10 minutes before showtime)
   */
  async cancelBooking(idOrCode: string, dto?: CancelBookingDto, userId?: string, userRole?: string) {
    const codeWithHash = idOrCode.startsWith('#') ? idOrCode : `#${idOrCode}`;
    const booking = await this.prisma.booking.findFirst({
      where: {
        OR: [
          { id: idOrCode },
          { bookingCode: idOrCode },
          { bookingCode: codeWithHash },
        ],
      },
      include: {
        showtime: {
          include: {
            movie: true,
            cinema: true,
            auditorium: true,
          },
        },
        bookingSeats: {
          include: {
            showtimeSeat: {
              include: { seat: true },
            },
          },
        },
        bookingCombos: {
          include: { combo: true },
        },
        payments: true,
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn đặt vé với mã ID/Mã vé: ${idOrCode}`);
    }

    // 1. Check if already cancelled or refunded
    if (booking.status === 'CANCELLED' || booking.status === 'REFUNDED') {
      throw new BadRequestException('Đơn hàng này đã được hủy trước đó.');
    }

    // 2. Only paid or confirmed bookings can be cancelled
    if (booking.status !== 'PAID' && booking.status !== 'CONFIRMED') {
      throw new BadRequestException(`Không thể hủy đơn đặt vé ở trạng thái "${booking.status}".`);
    }

    // 3. Check if QR code was already scanned at the theater
    if (booking.qrScannedAt) {
      throw new BadRequestException('Vé đã được quét mã QR tại rạp để vào phòng chiếu, không thể hủy.');
    }

    // 4. Cutoff check: Must be at least 10 minutes before showtime start
    const now = this.clockService ? this.clockService.now() : new Date();
    const showtimeStart = new Date(booking.showtime.startAt);
    const cutoffTime = new Date(showtimeStart.getTime() - 10 * 60 * 1000);

    if (now > cutoffTime) {
      throw new BadRequestException(
        'Đã quá thời hạn hủy vé. Quy định của rạp chỉ cho phép hủy vé tối đa trước giờ chiếu 10 phút.',
      );
    }

    // 5. Ownership check: customer can only cancel their own booking
    const isPrivileged = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'STAFF';
    if (!isPrivileged && userId && booking.userId && booking.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn đặt vé của người khác.');
    }

    const refundAmount = booking.finalAmount ?? booking.totalAmount;
    const reasonText = dto?.reason?.trim() || 'Khách hàng hủy vé tự phục vụ (trước giờ chiếu tối thiểu 10 phút)';

    // 6. Database Transaction
    await this.prisma.$transaction(async (tx) => {
      // A. Update booking status to CANCELLED
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
        },
      });

      // B. Create Refund record
      if (refundAmount > 0) {
        await tx.refund.create({
          data: {
            bookingId: booking.id,
            amount: refundAmount,
            reason: reasonText,
            approvedBy: userId || 'CUSTOMER_SELF_SERVICE',
          },
        });
      }

      // C. Update Payments to REFUNDED
      await tx.payment.updateMany({
        where: {
          bookingId: booking.id,
          status: 'SUCCESS',
        },
        data: {
          status: 'REFUNDED',
        },
      });

      // D. Release seats back to AVAILABLE
      const showtimeSeatIds = booking.bookingSeats.map((bs) => bs.showtimeSeatId);
      if (showtimeSeatIds.length > 0) {
        await tx.showtimeSeat.updateMany({
          where: { id: { in: showtimeSeatIds } },
          data: {
            status: 'AVAILABLE',
            holdUserId: null,
            holdSessionId: null,
            holdExpiresAt: null,
          },
        });
      }

      // E. Reclaim loyalty points awarded for this booking
      // Rule: 1.000đ = 10 điểm thưởng
      const targetUserId =
        booking.userId ||
        (booking.guestEmail
          ? (await tx.user.findUnique({ where: { email: booking.guestEmail } }))?.id
          : null);

      if (targetUserId) {
        const pointsToDeduct = Math.floor((refundAmount / 1000) * 10);
        if (pointsToDeduct > 0) {
          const dbUser = await tx.user.findUnique({ where: { id: targetUserId } });
          if (dbUser) {
            const currentPoints = dbUser.loyaltyPoints || 0;
            const newPoints = Math.max(0, currentPoints - pointsToDeduct);
            await tx.user.update({
              where: { id: targetUserId },
              data: { loyaltyPoints: newPoints },
            });
          }
        }
      }
    });

    // 7. Realtime Socket emit so seat map updates immediately
    const updates = booking.bookingSeats.map((bs) => ({
      seatId: bs.showtimeSeat.seatId,
      status: 'AVAILABLE',
      holdExpiresAt: null,
    }));
    this.eventsGateway.broadcastSeatStatusChanged(booking.showtimeId, updates);

    // 8. Send confirmation email to customer
    const customerEmail = booking.user?.email || booking.guestEmail;
    if (this.mailer && customerEmail) {
      const movieTitle = booking.showtime.movie.title;
      const seatLabels = booking.bookingSeats
        .map((bs) => bs.showtimeSeat.seat.seatLabel)
        .filter(Boolean)
        .join(', ');

      this.mailer
        .sendMail({
          to: customerEmail,
          subject: `[HUST Cine] Xác nhận hủy vé thành công: ${booking.bookingCode}`,
          category: 'REFUND',
          bodyText: `Kính gửi quý khách,\n\nBạn đã hủy thành công vé xem phim đơn hàng ${booking.bookingCode}.\n- Phim: ${movieTitle}\n- Rạp: ${booking.showtime.cinema.name}\n- Phòng: ${booking.showtime.auditorium.name}\n- Ghế: ${seatLabels}\n- Số tiền hoàn lại: ${refundAmount.toLocaleString('vi-VN')}đ\n\nSố tiền đã được hoàn lại thành công vào tài khoản của quý khách.\n\nTrân trọng,\nHUST Cine`,
          bodyHtml: `<p>Kính gửi quý khách,</p><p>Bạn đã hủy thành công đơn đặt vé <strong>${booking.bookingCode}</strong>.</p><p>Phim: <strong>${movieTitle}</strong><br/>Ghế: <strong>${seatLabels}</strong><br/>Số tiền hoàn: <strong>${refundAmount.toLocaleString('vi-VN')}đ</strong></p><p>Trân trọng,<br/>HUST Cine</p>`,
        })
        .catch((err) => {
          this.logger.warn(`Failed to send cancellation email for ${booking.bookingCode}: ${err.message}`);
        });
    }

    return {
      success: true,
      message: 'Hủy vé thành công! Toàn bộ số tiền vé đã được hoàn trả và ghế đã được mở lại.',
      bookingCode: booking.bookingCode,
      refundAmount,
      status: 'CANCELLED',
    };
  }
}

