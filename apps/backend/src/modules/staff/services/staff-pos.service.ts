import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClockService } from '../../../common/clock/clock.service';
import { PricingService } from '../../bookings/services/pricing.service';
import { PaymentsService } from '../../payments/services/payments.service';
import { EventsGateway } from '../../bookings/gateways/events.gateway';
import { StaffShiftService } from './staff-shift.service';
import { PosSellDto } from '../dto/staff.dto';
import { PaymentMethod } from '../../payments/dto/payment.dto';

@Injectable()
export class StaffPosService {
  private readonly logger = new Logger(StaffPosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clockService: ClockService,
    private readonly pricingService: PricingService,
    private readonly paymentsService: PaymentsService,
    private readonly eventsGateway: EventsGateway,
    private readonly staffShiftService: StaffShiftService,
  ) {}

  /**
   * Sell tickets and combos directly at Box Office POS counter
   */
  async sellTickets(dto: PosSellDto, staffUserId: string, ipAddress?: string) {
    const now = this.clockService.now();

    // 1. Fetch showtime
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: dto.showtimeId },
      include: {
        movie: true,
        cinema: true,
        auditorium: true,
      },
    });

    if (!showtime) {
      throw new NotFoundException(`Không tìm thấy suất chiếu với mã ID: ${dto.showtimeId}`);
    }

    if (showtime.isCancelled) {
      throw new ConflictException('Suất chiếu này đã bị hủy, không thể bán vé.');
    }

    if (now > showtime.endAt) {
      throw new BadRequestException('Suất chiếu này đã kết thúc.');
    }

    // 2. Fetch and check seat availability
    const showtimeSeats = await this.prisma.showtimeSeat.findMany({
      where: {
        showtimeId: dto.showtimeId,
        seatId: { in: dto.seatIds },
      },
      include: { seat: true },
    });

    if (showtimeSeats.length !== dto.seatIds.length) {
      throw new BadRequestException('Một số ghế được chọn không tồn tại trong suất chiếu này.');
    }

    for (const stSeat of showtimeSeats) {
      if (stSeat.status === 'SOLD') {
        throw new ConflictException(`Ghế ${stSeat.seat.seatLabel} đã được bán trước đó.`);
      }

      // Check if held by an active online user
      const isActivelyHeldOnline =
        stSeat.status === 'HELD' &&
        stSeat.holdExpiresAt &&
        stSeat.holdExpiresAt >= now;

      if (isActivelyHeldOnline) {
        throw new ConflictException(
          `Ghế ${stSeat.seat.seatLabel} đang được giữ trực tuyến bởi khách hàng khác. Vui lòng chọn ghế khác hoặc chờ hết hạn giữ chỗ.`,
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

    // 4. Generate unique POS booking code
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const bookingCode = `#HUST-POS-${randomSuffix}`;
    const transactionRef = `POS_${Date.now()}_${randomSuffix}`;

    // Temporary ID generation for signed QR token
    const placeholderToken = this.paymentsService.generateSignedQrToken(
      bookingCode,
      bookingCode,
      now.getTime(),
    );

    const isCash = (dto.paymentMethod || PaymentMethod.CASH) === PaymentMethod.CASH;

    // 5. Complete sale in database transaction
    const booking = await this.prisma.$transaction(async (tx) => {
      // Create Booking
      const createdBooking = await tx.booking.create({
        data: {
          bookingCode,
          showtimeId: dto.showtimeId,
          cinemaId: showtime.cinemaId,
          guestName: dto.customerName || 'Khách mua tại quầy',
          guestPhone: dto.customerPhone || null,
          totalAmount: pricing.subtotalSeats + pricing.subtotalCombos,
          discountAmount: pricing.discountAmount,
          finalAmount: pricing.finalAmount,
          status: 'PAID',
          qrTokenSigned: placeholderToken,
          expiresAt: new Date(now.getTime() + 365 * 86400000), // Paid booking doesn't expire
          bookingSeats: {
            create: pricing.seats.map((s) => {
              const stSeat = showtimeSeats.find((hs) => hs.seatId === s.seatId);
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

      // Generate exact QR token with created booking ID
      const realSignedQrToken = this.paymentsService.generateSignedQrToken(
        createdBooking.id,
        bookingCode,
        now.getTime(),
      );

      await tx.booking.update({
        where: { id: createdBooking.id },
        data: { qrTokenSigned: realSignedQrToken },
      });
      createdBooking.qrTokenSigned = realSignedQrToken;

      // Mark seats as SOLD
      await tx.showtimeSeat.updateMany({
        where: {
          showtimeId: dto.showtimeId,
          seatId: { in: dto.seatIds },
        },
        data: {
          status: 'SOLD',
          holdUserId: null,
          holdSessionId: null,
          holdExpiresAt: null,
        },
      });

      // Create Payment record
      await tx.payment.create({
        data: {
          bookingId: createdBooking.id,
          method: dto.paymentMethod || 'CASH',
          status: 'SUCCESS',
          amount: pricing.finalAmount,
          transactionRef,
        },
      });

      // Record AuditLog
      await tx.auditLog.create({
        data: {
          userId: staffUserId,
          action: 'POS_SALE',
          entityType: 'Booking',
          entityId: createdBooking.id,
          newData: JSON.stringify({
            bookingCode,
            finalAmount: pricing.finalAmount,
            paymentMethod: dto.paymentMethod || 'CASH',
            seatsCount: dto.seatIds.length,
            staffUserId,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return createdBooking;
    });

    // 6. Record sale in active shift
    await this.staffShiftService.recordSale(staffUserId, pricing.finalAmount, isCash);

    // 7. Broadcast realtime seat status change
    this.eventsGateway.broadcastSeatStatusChanged(
      dto.showtimeId,
      dto.seatIds.map((seatId) => ({
        seatId,
        status: 'SOLD',
        holdExpiresAt: null,
      })),
    );

    const seatLabels = booking.bookingSeats.map((bs) => bs.showtimeSeat.seat.seatLabel);

    return {
      success: true,
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      movieTitle: showtime.movie.title,
      cinemaName: showtime.cinema.name,
      auditoriumName: showtime.auditorium.name,
      format: showtime.format,
      showtimeStart: showtime.startAt,
      seats: seatLabels,
      seatsCount: seatLabels.length,
      combos: booking.bookingCombos.map((bc) => ({
        name: bc.combo.name,
        quantity: bc.quantity,
        unitPrice: bc.unitPrice,
      })),
      totalAmount: booking.totalAmount,
      discountAmount: booking.discountAmount,
      finalAmount: booking.finalAmount,
      paymentMethod: dto.paymentMethod || 'CASH',
      qrTokenSigned: booking.qrTokenSigned,
      soldBy: staffUserId,
      soldAt: now,
      message: 'Bán vé tại quầy thành công! Sẵn sàng in hóa đơn / vé.',
    };
  }
}
