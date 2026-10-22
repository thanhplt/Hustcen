import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClockService } from '../../../common/clock/clock.service';
import { BookingComboItemDto } from '../dto/create-booking.dto';

export interface SeatPriceCalculation {
  seatId: string;
  seatLabel: string;
  seatType: string;
  price: number;
}

export interface PriceCalculationResult {
  basePrice: number;
  subtotalSeats: number;
  subtotalCombos: number;
  subtotal?: number;
  totalAmount?: number;
  discountAmount: number;
  finalAmount: number;
  seats: SeatPriceCalculation[];
  combos: Array<{ comboId: string; name: string; quantity: number; unitPrice: number; totalPrice: number }>;
  voucher?: {
    code: string;
    description: string;
    discountAmount: number;
  };
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clockService: ClockService,
  ) {}

  /**
   * Calculate single seat price
   */
  calculateSingleSeatPrice(
    basePrice: number,
    seatType: string,
    format: string,
    roomType: string,
    showtimeStart: Date,
    roomPriceMultiplier = 1.0,
  ): number {
    let seatPrice = basePrice * roomPriceMultiplier;

    // 1. Seat type adjustments
    switch (seatType.toUpperCase()) {
      case 'VIP':
        seatPrice += 15000;
        break;
      case 'COUPLE':
        seatPrice = seatPrice * 2; // holds 2 persons
        break;
      case 'RECLINER':
      case 'SOFA':
        seatPrice += 35000;
        break;
      case 'STANDARD':
      case 'WHEELCHAIR':
      default:
        break;
    }

    // 2. Format adjustment
    const fmt = format.toUpperCase();
    if (fmt.includes('3D')) {
      seatPrice += 20000;
    } else if (fmt.includes('IMAX')) {
      seatPrice += 40000;
    }

    // 3. Weekend surcharge: Saturday (6), Sunday (0/7), or Friday after 17:00
    const vnDate = this.clockService.toVnDate(showtimeStart);
    const day = vnDate.getDay(); // 0=Sun, 5=Fri, 6=Sat
    const hour = vnDate.getHours();

    const isWeekend = day === 6 || day === 0 || (day === 5 && hour >= 17);
    if (isWeekend) {
      seatPrice += 10000;
    }

    // Round to nearest 1.000 VND
    return Math.round(seatPrice / 1000) * 1000;
  }

  /**
   * Complete price calculation for showtime, seats, combos, and optional voucher
   */
  async calculateTotalPrice(
    showtimeId: string,
    seatIds: string[],
    comboItems: BookingComboItemDto[] = [],
    voucherCode?: string,
  ): Promise<PriceCalculationResult> {
    const showtime = await this.prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        auditorium: {
          include: {
            seats: {
              where: { id: { in: seatIds } },
            },
          },
        },
      },
    });

    if (!showtime) {
      throw new BadRequestException('Suất chiếu không tồn tại.');
    }

    const { auditorium } = showtime;
    const seatsMap = new Map(auditorium.seats.map((s) => [s.id, s]));

    // 1. Calculate seats
    const seatCalculations: SeatPriceCalculation[] = [];
    let subtotalSeats = 0;

    for (const seatId of seatIds) {
      const seat = seatsMap.get(seatId);
      if (!seat) {
        throw new BadRequestException(`Không tìm thấy ghế với mã ID: ${seatId}`);
      }

      const price = this.calculateSingleSeatPrice(
        showtime.basePrice,
        seat.seatType,
        showtime.format,
        auditorium.type,
        showtime.startAt,
        auditorium.priceMultiplier,
      );

      seatCalculations.push({
        seatId: seat.id,
        seatLabel: seat.seatLabel,
        seatType: seat.seatType,
        price,
      });

      subtotalSeats += price;
    }

    // 2. Calculate combos
    let subtotalCombos = 0;
    const combosBreakdown: Array<{
      comboId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    if (comboItems && comboItems.length > 0) {
      const comboIds = comboItems.map((c) => c.comboId);
      const dbCombos = await this.prisma.combo.findMany({
        where: { id: { in: comboIds }, isActive: true },
      });
      const dbComboMap = new Map(dbCombos.map((c) => [c.id, c]));

      for (const item of comboItems) {
        const combo = dbComboMap.get(item.comboId);
        if (combo) {
          const itemTotal = combo.price * item.quantity;
          subtotalCombos += itemTotal;
          combosBreakdown.push({
            comboId: combo.id,
            name: combo.name,
            quantity: item.quantity,
            unitPrice: combo.price,
            totalPrice: itemTotal,
          });
        }
      }
    }

    const subtotal = subtotalSeats + subtotalCombos;

    // 3. Apply voucher if provided
    let discountAmount = 0;
    let appliedVoucher: any = undefined;

    if (voucherCode && voucherCode.trim()) {
      const cleanCode = voucherCode.trim().toUpperCase();
      const voucher = await this.prisma.voucher.findUnique({
        where: { code: cleanCode },
      });

      const now = this.clockService.now();

      if (!voucher || !voucher.isActive) {
        throw new BadRequestException(`Mã giảm giá "${cleanCode}" không tồn tại hoặc đã hết hiệu lực.`);
      }

      if (now < voucher.validFrom || now > voucher.validTo) {
        throw new BadRequestException(`Mã giảm giá "${cleanCode}" đã hết hạn sử dụng.`);
      }

      if (voucher.usedCount >= voucher.maxUses) {
        throw new BadRequestException(`Mã giảm giá "${cleanCode}" đã đạt giới hạn số lượt sử dụng.`);
      }

      if (subtotal < voucher.minOrderAmount) {
        throw new BadRequestException(
          `Đơn hàng cần đạt tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')}đ để sử dụng mã này.`,
        );
      }

      if (voucher.discountPct > 0) {
        discountAmount = (subtotal * voucher.discountPct) / 100;
        if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
          discountAmount = voucher.maxDiscount;
        }
      } else if (voucher.discountAmount) {
        discountAmount = voucher.discountAmount;
      }

      discountAmount = Math.min(discountAmount, subtotal);

      appliedVoucher = {
        code: voucher.code,
        description: voucher.description,
        discountAmount,
      };
    }

    const finalAmount = Math.max(0, subtotal - discountAmount);

    return {
      basePrice: showtime.basePrice,
      subtotalSeats,
      subtotalCombos,
      subtotal,
      discountAmount,
      totalAmount: finalAmount,
      finalAmount,
      seats: seatCalculations,
      combos: combosBreakdown,
      voucher: appliedVoucher,
    };
  }
}
