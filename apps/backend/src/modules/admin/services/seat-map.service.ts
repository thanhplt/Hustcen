import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { UpdateSeatMapDto } from '../dto/seat-map.dto';

@Injectable()
export class SeatMapService {
  private readonly logger = new Logger(SeatMapService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get seat map visual layout and current seats
   */
  async getSeatMap(auditoriumId: string) {
    const auditorium = await this.prisma.auditorium.findUnique({
      where: { id: auditoriumId },
      include: {
        cinema: { select: { id: true, name: true } },
        seats: {
          orderBy: [{ rowCode: 'asc' }, { seatNumber: 'asc' }],
        },
      },
    });

    if (!auditorium) {
      throw new NotFoundException(`Không tìm thấy phòng chiếu với mã ID: ${auditoriumId}`);
    }

    let parsedConfig: any = {};
    try {
      parsedConfig = JSON.parse(auditorium.seatLayoutConfig || '{}');
    } catch {
      parsedConfig = {};
    }

    return {
      auditoriumId: auditorium.id,
      name: auditorium.name,
      cinemaName: auditorium.cinema.name,
      type: auditorium.type,
      capacity: auditorium.capacity,
      bookingMode: auditorium.bookingMode,
      layoutConfig: parsedConfig,
      seats: auditorium.seats.map((s) => ({
        id: s.id,
        rowCode: s.rowCode,
        seatNumber: s.seatNumber,
        seatLabel: s.seatLabel,
        seatType: s.seatType,
        isWheelchair: s.isWheelchair,
      })),
    };
  }

  /**
   * Update visual layout and synchronize physical Seat records
   */
  async updateSeatMap(
    auditoriumId: string,
    dto: UpdateSeatMapDto,
    userId?: string,
    ipAddress?: string,
  ) {
    const auditorium = await this.prisma.auditorium.findUnique({
      where: { id: auditoriumId },
      include: { seats: true },
    });

    if (!auditorium) {
      throw new NotFoundException(`Không tìm thấy phòng chiếu với mã ID: ${auditoriumId}`);
    }

    if (!dto.seats || dto.seats.length === 0) {
      throw new BadRequestException('Sơ đồ phòng chiếu phải có ít nhất 1 ghế.');
    }

    // Check unique (rowCode, seatNumber) in input
    const seen = new Set<string>();
    for (const s of dto.seats) {
      const key = `${s.rowCode}_${s.seatNumber}`;
      if (seen.has(key)) {
        throw new BadRequestException(`Ghế trùng lặp tại vị trí hàng ${s.rowCode}, số ${s.seatNumber}.`);
      }
      seen.add(key);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update Auditorium layout config & capacity
      await tx.auditorium.update({
        where: { id: auditoriumId },
        data: {
          seatLayoutConfig: JSON.stringify(dto.layoutConfig),
          capacity: dto.seats.length,
        },
      });

      // 2. Synchronize Seat records
      const existingSeatMap = new Map(
        auditorium.seats.map((s) => [`${s.rowCode}_${s.seatNumber}`, s]),
      );

      const updatedOrCreatedSeatIds: string[] = [];

      for (const s of dto.seats) {
        const key = `${s.rowCode}_${s.seatNumber}`;
        const existing = existingSeatMap.get(key);

        if (existing) {
          // Update properties if changed
          const updated = await tx.seat.update({
            where: { id: existing.id },
            data: {
              seatLabel: s.seatLabel,
              seatType: s.seatType,
              isWheelchair: s.isWheelchair || false,
            },
          });
          updatedOrCreatedSeatIds.push(updated.id);
        } else {
          // Create new seat
          const created = await tx.seat.create({
            data: {
              auditoriumId,
              rowCode: s.rowCode,
              seatNumber: s.seatNumber,
              seatLabel: s.seatLabel,
              seatType: s.seatType,
              isWheelchair: s.isWheelchair || false,
            },
          });
          updatedOrCreatedSeatIds.push(created.id);
        }
      }

      // Check if any old seats were deleted
      const inputKeys = new Set(dto.seats.map((s) => `${s.rowCode}_${s.seatNumber}`));
      for (const oldSeat of auditorium.seats) {
        const key = `${oldSeat.rowCode}_${oldSeat.seatNumber}`;
        if (!inputKeys.has(key)) {
          // Check if seat is linked to any active showtimes
          const count = await tx.showtimeSeat.count({ where: { seatId: oldSeat.id } });
          if (count === 0) {
            await tx.seat.delete({ where: { id: oldSeat.id } });
          }
        }
      }

      // 3. Write AuditLog
      await tx.auditLog.create({
        data: {
          userId: userId || null,
          action: 'UPDATE_SEAT_LAYOUT',
          entityType: 'Auditorium',
          entityId: auditoriumId,
          newData: JSON.stringify({
            auditoriumId,
            newCapacity: dto.seats.length,
          }),
          ipAddress: ipAddress || null,
        },
      });

      return {
        auditoriumId,
        capacity: dto.seats.length,
        seatsCount: updatedOrCreatedSeatIds.length,
      };
    });

    return {
      success: true,
      message: `Đã cập nhật sơ đồ ghế phòng chiếu thành công (${result.capacity} ghế).`,
      ...result,
    };
  }
}
