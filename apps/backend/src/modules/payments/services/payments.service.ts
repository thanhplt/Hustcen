import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClockService } from '../../../common/clock/clock.service';
import { SystemSettingService } from '../../../common/config/system-setting.service';
import { MockGatewayService } from '../../../adapters/payment/mock-gateway.service';
import { DevMailerService } from '../../../adapters/mailer/dev-mailer.service';
import { EventsGateway } from '../../bookings/gateways/events.gateway';
import {
  CreatePaymentIntentDto,
  ProcessMockPaymentDto,
  PaymentWebhookDto,
  MockPaymentStatus,
} from '../dto/payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly qrSecret = process.env.QR_SECRET || 'hustcine-ticket-qr-secret-key-2026';

  constructor(
    private readonly prisma: PrismaService,
    private readonly clockService: ClockService,
    private readonly systemSettings: SystemSettingService,
    private readonly mockGateway: MockGatewayService,
    private readonly mailer: DevMailerService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Create payment intent for a pending booking
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto, userId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: {
        showtime: true,
        cinema: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã ID: ${dto.bookingId}`);
    }

    if (booking.status !== 'PENDING') {
      throw new ConflictException(
        `Đơn hàng đang ở trạng thái "${booking.status}", không thể tạo yêu cầu thanh toán mới.`,
      );
    }

    const now = this.clockService.now();
    if (now > booking.expiresAt) {
      throw new ConflictException('Đơn hàng đã hết hạn giữ chỗ.');
    }

    // Call MockGatewayService to generate intent
    const intent = await this.mockGateway.createPaymentIntent({
      bookingId: booking.id,
      bookingCode: booking.bookingCode,
      amount: booking.finalAmount,
      description: `Thanh toán vé xem phim ${booking.bookingCode}`,
      customerEmail: booking.guestEmail || undefined,
      customerPhone: booking.guestPhone || undefined,
    });

    // Record Payment in database
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        method: dto.method || 'MOCK_GATEWAY',
        status: 'PENDING',
        amount: booking.finalAmount,
        transactionRef: intent.transactionRef,
        gatewayPayload: JSON.stringify(intent),
      },
    });

    return {
      paymentId: payment.id,
      paymentUrl: intent.paymentUrl,
      transactionRef: intent.transactionRef,
      amount: booking.finalAmount,
      expiresAt: booking.expiresAt,
      bookingCode: booking.bookingCode,
    };
  }

  /**
   * Get payment details for the Mock Gateway page
   */
  async getMockPaymentDetails(transactionRef: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { transactionRef },
      include: {
        booking: {
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
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy giao dịch thanh toán: ${transactionRef}`);
    }

    const { booking } = payment;
    const { showtime } = booking;

    return {
      transactionRef: payment.transactionRef,
      amount: payment.amount,
      status: payment.status,
      bookingCode: booking.bookingCode,
      movieTitle: showtime.movie.title,
      posterUrl: showtime.movie.posterUrl,
      cinemaName: showtime.cinema.name,
      auditoriumName: showtime.auditorium.name,
      format: showtime.format,
      showtimeStart: showtime.startAt,
      seats: booking.bookingSeats.map((bs) => bs.showtimeSeat.seat.seatLabel),
      combos: booking.bookingCombos.map((bc) => `${bc.combo.name} (x${bc.quantity})`),
      expiresAt: booking.expiresAt,
    };
  }

  /**
   * Simulate user paying on Mock Gateway page
   */
  async processMockPayment(dto: ProcessMockPaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { transactionRef: dto.transactionRef },
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy giao dịch thanh toán: ${dto.transactionRef}`);
    }

    if (dto.status === MockPaymentStatus.SUCCESS) {
      const payload = {
        transactionRef: dto.transactionRef,
        bookingId: payment.bookingId,
        amount: payment.amount,
        status: 'SUCCESS',
      };

      const signature = this.mockGateway.generateSignature(payload);
      return this.handleWebhook({ ...payload, signature });
    }

    // Handled as failed or cancelled
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED' },
    });

    return {
      success: false,
      status: dto.status,
      message: 'Giao dịch thanh toán không thành công hoặc đã bị hủy.',
    };
  }

  /**
   * Generate HMAC signed QR token for ticket entry validation
   */
  generateSignedQrToken(bookingId: string, bookingCode: string, timestamp: number): string {
    const rawData = `${bookingId}:${bookingCode}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', this.qrSecret).update(rawData).digest('hex');
    const encodedPayload = Buffer.from(rawData).toString('base64url');
    return `${encodedPayload}.${hmac}`;
  }

  /**
   * Verify HMAC signed QR token
   */
  verifySignedQrToken(signedToken: string): { valid: boolean; bookingId?: string; bookingCode?: string } {
    if (!signedToken || !signedToken.includes('.')) {
      return { valid: false };
    }

    const [encodedPayload, receivedSignature] = signedToken.split('.');
    try {
      const rawData = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
      const expectedSignature = crypto.createHmac('sha256', this.qrSecret).update(rawData).digest('hex');

      const sigBuffer = Buffer.from(receivedSignature);
      const expectedBuffer = Buffer.from(expectedSignature);
      if (sigBuffer.length !== expectedBuffer.length) return { valid: false };

      if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return { valid: false };
      }

      const [bookingId, bookingCode] = rawData.split(':');
      return { valid: true, bookingId, bookingCode };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Signed Webhook processor with idempotency and race condition auto-refund
   */
  async handleWebhook(payload: PaymentWebhookDto) {
    const { signature, ...dataToVerify } = payload;

    // 1. Verify HMAC Signature
    const isValidSignature = this.mockGateway.verifyWebhookSignature(dataToVerify, signature);
    if (!isValidSignature) {
      this.logger.warn(`Invalid webhook signature for Ref: ${payload.transactionRef}`);
      throw new BadRequestException('Chữ ký Webhook không hợp lệ.');
    }

    // 2. Fetch Payment & Booking
    const payment = await this.prisma.payment.findUnique({
      where: { transactionRef: payload.transactionRef },
      include: {
        booking: {
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
            user: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Không tìm thấy giao dịch: ${payload.transactionRef}`);
    }

    // 3. Idempotency Check: if already SUCCESS, return HTTP 200 without double processing
    if (payment.status === 'SUCCESS') {
      return {
        success: true,
        message: 'Giao dịch đã được ghi nhận thành công trước đó (Idempotent).',
        bookingCode: payment.booking.bookingCode,
      };
    }

    const { booking } = payment;
    const now = this.clockService.now();

    // 4. Race Condition: Check if booking hold expired before payment confirmed
    const isExpired = now > booking.expiresAt;
    const isShowtimeCancelled = booking.showtime.isCancelled;

    if (isExpired || isShowtimeCancelled) {
      this.logger.warn(
        `Late payment or cancelled showtime for Booking ${booking.bookingCode}. Triggering Auto-Refund.`,
      );

      // Auto-Refund
      await this.prisma.$transaction(async (tx) => {
        await tx.refund.create({
          data: {
            bookingId: booking.id,
            amount: payment.amount,
            reason: isShowtimeCancelled
              ? 'Suất chiếu đã bị hủy trước khi nhận được thanh toán (Tự động hoàn tiền)'
              : 'Thanh toán sau khi hết hạn giữ chỗ (Tự động hoàn tiền)',
          },
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'REFUNDED' },
        });

        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'REFUNDED' },
        });
      });

      // Send refund notification email
      const customerEmail = booking.user?.email || booking.guestEmail;
      if (customerEmail) {
        await this.mailer.sendMail({
          to: customerEmail,
          subject: `[HUST Cine] Hoàn tiền đơn hàng ${booking.bookingCode}`,
          category: 'REFUND',
          bodyText: `Kính gửi quý khách,\n\nĐơn hàng ${booking.bookingCode} đã hết hạn giữ chỗ hoặc suất chiếu đã bị hủy trước khi giao dịch được xác nhận.\n\nSố tiền ${payment.amount.toLocaleString('vi-VN')}đ đã được tự động hoàn lại đầy đủ vào tài khoản của quý khách.\n\nTrân trọng,\nHUST Cine`,
          bodyHtml: `<p>Kính gửi quý khách,</p><p>Đơn hàng <strong>${booking.bookingCode}</strong> đã hết thời gian giữ chỗ.</p><p>Số tiền <strong>${payment.amount.toLocaleString('vi-VN')}đ</strong> đã được tự động hoàn lại đầy đủ.</p>`,
        });
      }

      return {
        success: false,
        status: 'REFUNDED',
        message: 'Đơn hàng đã hết hạn giữ chỗ. Số tiền thanh toán đã được tự động hoàn lại cho quý khách.',
      };
    }

    // 5. SUCCESSFUL FULFILLMENT
    const signedQrToken = this.generateSignedQrToken(
      booking.id,
      booking.bookingCode,
      now.getTime(),
    );

    const seatIds = booking.bookingSeats.map((bs) => bs.showtimeSeat.seatId);

    await this.prisma.$transaction(async (tx) => {
      // Update Payment
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS' },
      });

      // Ensure booking is linked to user account if created with registered email/phone
      let bookingUserId = booking.userId;
      if (!bookingUserId && (booking.guestEmail || booking.guestPhone)) {
        const foundUser = await tx.user.findFirst({
          where: {
            OR: [
              ...(booking.guestEmail ? [{ email: booking.guestEmail.trim().toLowerCase() }] : []),
              ...(booking.guestPhone ? [{ phone: booking.guestPhone.trim() }] : []),
            ],
          },
        });
        if (foundUser) {
          bookingUserId = foundUser.id;
        }
      }

      // Update Booking
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'PAID',
          qrTokenSigned: signedQrToken,
          userId: bookingUserId,
        },
      });

      // Award Loyalty Points: 1.000đ = 10 điểm thưởng
      if (bookingUserId) {
        const pointsEarned = Math.floor((payment.amount / 1000) * 10);
        if (pointsEarned > 0) {
          await tx.user.update({
            where: { id: bookingUserId },
            data: {
              loyaltyPoints: { increment: pointsEarned },
            },
          });
        }
      }

      // Mark all seats as SOLD
      await tx.showtimeSeat.updateMany({
        where: {
          showtimeId: booking.showtimeId,
          seatId: { in: seatIds },
        },
        data: {
          status: 'SOLD',
          holdUserId: null,
          holdSessionId: null,
          holdExpiresAt: null,
        },
      });

      // Write AuditLog
      await tx.auditLog.create({
        data: {
          userId: booking.userId || null,
          action: 'PAYMENT_SUCCESS',
          entityType: 'Booking',
          entityId: booking.id,
          newData: JSON.stringify({
            amount: payment.amount,
            method: payment.method,
            transactionRef: payment.transactionRef,
            bookingCode: booking.bookingCode,
          }),
        },
      });
    });

    // Broadcast seat status update to all connected clients
    this.eventsGateway.broadcastSeatStatusChanged(
      booking.showtimeId,
      seatIds.map((seatId) => ({
        seatId,
        status: 'SOLD',
        holdExpiresAt: null,
      })),
    );

    // Send confirmation email with ticket details
    const customerEmail = booking.user?.email || booking.guestEmail;
    if (customerEmail) {
      const seatLabels = booking.bookingSeats.map((bs) => bs.showtimeSeat.seat.seatLabel).join(', ');
      await this.mailer.sendMail({
        to: customerEmail,
        subject: `[HUST Cine] Xác nhận đặt vé thành công: ${booking.bookingCode}`,
        category: 'BOOKING_CONFIRM',
        bodyText: `Kính gửi quý khách,\n\nBạn đã thanh toán thành công đơn đặt vé xem phim tại HUST Cine!\n\nThông tin vé:\n- Mã đơn: ${booking.bookingCode}\n- Phim: ${booking.showtime.movie.title}\n- Rạp: ${booking.showtime.cinema.name} (${booking.showtime.auditorium.name})\n- Suất chiếu: ${booking.showtime.startAt.toISOString()}\n- Ghế: ${seatLabels}\n- Tổng tiền: ${payment.amount.toLocaleString('vi-VN')}đ\n\nVui lòng đưa mã QR trong tài khoản hoặc email này cho nhân viên soát vé tại rạp.\n\nChúc bạn xem phim vui vẻ!\nHUST Cine`,
        bodyHtml: `<p>Xin chào quý khách,</p><p>Đơn đặt vé <strong>${booking.bookingCode}</strong> đã thanh toán thành công!</p><p>Phim: <strong>${booking.showtime.movie.title}</strong><br/>Rạp: ${booking.showtime.cinema.name} (${booking.showtime.auditorium.name})<br/>Ghế: <strong>${seatLabels}</strong><br/>Tổng tiền: <strong>${payment.amount.toLocaleString('vi-VN')}đ</strong></p><p>Mã vé điện tử (QR Token): <code>${signedQrToken}</code></p>`,
      });
    }

    return {
      success: true,
      status: 'PAID',
      bookingCode: booking.bookingCode,
      qrTokenSigned: signedQrToken,
      message: 'Thanh toán thành công! Vé đã được xuất.',
    };
  }
}
