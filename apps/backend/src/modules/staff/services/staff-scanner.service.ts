import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClockService } from '../../../common/clock/clock.service';
import { PaymentsService } from '../../payments/services/payments.service';
import { ScanTicketDto } from '../dto/staff.dto';

@Injectable()
export class StaffScannerService {
  private readonly logger = new Logger(StaffScannerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clockService: ClockService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Scan ticket and validate QR token
   */
  async scanTicket(dto: ScanTicketDto, staffUserId: string, ipAddress?: string) {
    // 1. Verify HMAC cryptographic signature
    const verification = this.paymentsService.verifySignedQrToken(dto.qrToken);
    if (!verification.valid || !verification.bookingId) {
      throw new BadRequestException('Mã QR vé không hợp lệ hoặc đã bị can thiệp/chỉnh sửa.');
    }

    // 2. Fetch Booking with full relations
    const booking = await this.prisma.booking.findUnique({
      where: { id: verification.bookingId },
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
        user: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Không tìm thấy thông tin vé trong hệ thống.');
    }

    // 3. Status checks
    if (booking.status === 'REFUNDED') {
      throw new BadRequestException('Vé này đã được hoàn tiền, không có hiệu lực để vào rạp.');
    }

    if (booking.status !== 'PAID') {
      throw new BadRequestException(`Vé đang ở trạng thái "${booking.status}", chưa thanh toán thành công.`);
    }

    // 4. Duplicate scan check
    if (booking.qrScannedAt) {
      const scannedTime = booking.qrScannedAt.toLocaleString('vi-VN');
      throw new ConflictException(
        `Vé này ĐÃ ĐƯỢC QUÉT vào cửa trước đó lúc ${scannedTime}. Vui lòng kiểm tra lại để phòng tránh vé trùng lặp!`,
      );
    }

    // 5. Showtime timing check
    const now = this.clockService.now();
    const { showtime } = booking;

    if (now > showtime.endAt) {
      throw new BadRequestException('Suất chiếu của vé này đã kết thúc.');
    }

    // 6. Record scan
    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        qrScannedAt: now,
        qrScannedBy: staffUserId,
      },
    });

    // Write AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: staffUserId,
        action: 'SCAN_TICKET',
        entityType: 'Booking',
        entityId: booking.id,
        newData: JSON.stringify({
          bookingCode: booking.bookingCode,
          scannedAt: now,
          staffUserId,
        }),
        ipAddress: ipAddress || null,
      },
    });

    const seatLabels = booking.bookingSeats.map((bs) => bs.showtimeSeat.seat.seatLabel);
    const comboSummaries = booking.bookingCombos.map((bc) => `${bc.combo.name} (x${bc.quantity})`);

    return {
      valid: true,
      bookingCode: booking.bookingCode,
      movieTitle: showtime.movie.title,
      posterUrl: showtime.movie.posterUrl,
      cinemaName: showtime.cinema.name,
      auditoriumName: showtime.auditorium.name,
      format: showtime.format,
      showtimeStart: showtime.startAt,
      showtimeEnd: showtime.endAt,
      seats: seatLabels,
      seatsCount: seatLabels.length,
      combos: comboSummaries,
      customerName: booking.user?.fullName || booking.guestName || 'Khách vãng lai',
      scannedAt: updated.qrScannedAt,
      scannedBy: staffUserId,
      message: 'Vé hợp lệ! Chào mừng quý khách vào phòng chiếu.',
    };
  }

  /**
   * Get scan history for current staff
   */
  async getScanHistory(staffUserId: string, page = 1, limit = 20) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { qrScannedBy: staffUserId },
        skip,
        take: l,
        orderBy: { qrScannedAt: 'desc' },
        include: {
          showtime: {
            include: {
              movie: { select: { title: true, posterUrl: true } },
              auditorium: { select: { name: true } },
            },
          },
          bookingSeats: {
            include: {
              showtimeSeat: {
                include: { seat: true },
              },
            },
          },
        },
      }),
      this.prisma.booking.count({ where: { qrScannedBy: staffUserId } }),
    ]);

    return {
      items: items.map((b) => ({
        bookingCode: b.bookingCode,
        movieTitle: b.showtime.movie.title,
        auditoriumName: b.showtime.auditorium.name,
        seats: b.bookingSeats.map((bs) => bs.showtimeSeat.seat.seatLabel),
        scannedAt: b.qrScannedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
