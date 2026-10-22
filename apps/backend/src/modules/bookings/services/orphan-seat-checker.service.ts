import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export interface OrphanCheckResult {
  hasOrphan: boolean;
  message?: string;
  orphanSeatLabel?: string;
}

@Injectable()
export class OrphanSeatCheckerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if selecting `seatIds` leaves any isolated single seat in any affected row
   */
  async checkOrphanSeats(
    showtimeId: string,
    auditoriumId: string,
    selectedSeatIds: string[],
    now: Date,
  ): Promise<OrphanCheckResult> {
    if (!selectedSeatIds || selectedSeatIds.length === 0) {
      return { hasOrphan: false };
    }

    // 1. Fetch selected seats to identify rows involved
    const selectedSeats = await this.prisma.seat.findMany({
      where: { id: { in: selectedSeatIds }, auditoriumId },
    });

    const affectedRowCodes = Array.from(new Set(selectedSeats.map((s) => s.rowCode)));

    // 2. For each affected row, inspect seat sequence
    for (const rowCode of affectedRowCodes) {
      const allRowSeats = await this.prisma.seat.findMany({
        where: { auditoriumId, rowCode },
        orderBy: { seatNumber: 'asc' },
      });

      // Rows with 2 or fewer seats or couple rows don't produce standard single orphan seats
      if (allRowSeats.length <= 2) continue;
      const isCoupleRow = allRowSeats.every((s) => s.seatType === 'COUPLE');
      if (isCoupleRow) continue;

      // Get current showtime seat statuses
      const showtimeSeats = await this.prisma.showtimeSeat.findMany({
        where: {
          showtimeId,
          seatId: { in: allRowSeats.map((s) => s.id) },
        },
      });

      const stStatusMap = new Map<string, { status: string; holdExpiresAt: Date | null }>();
      showtimeSeats.forEach((st) => {
        stStatusMap.set(st.seatId, { status: st.status, holdExpiresAt: st.holdExpiresAt });
      });

      // Helper to check if a seat is occupied (SOLD or actively HELD)
      const isOccupiedBefore = (seatId: string) => {
        const info = stStatusMap.get(seatId);
        if (!info) return false;
        if (info.status === 'SOLD') return true;
        if (info.status === 'HELD' && info.holdExpiresAt && info.holdExpiresAt >= now) {
          return true;
        }
        return false;
      };

      const selectedSet = new Set(selectedSeatIds);

      // Map to boolean: true = occupied, false = available
      const beforeStates = allRowSeats.map((s) => isOccupiedBefore(s.id));
      const afterStates = allRowSeats.map((s) => isOccupiedBefore(s.id) || selectedSet.has(s.id));

      // Check if afterStates creates an isolated single available seat (0 surrounded by 1s or edges)
      // that wasn't already an orphan in beforeStates
      const isOrphan = (states: boolean[], idx: number) => {
        if (states[idx]) return false; // not available

        const leftOccupied = idx === 0 || states[idx - 1];
        const rightOccupied = idx === states.length - 1 || states[idx + 1];

        return leftOccupied && rightOccupied;
      };

      for (let i = 0; i < allRowSeats.length; i++) {
        const wasOrphanBefore = isOrphan(beforeStates, i);
        const isOrphanAfter = isOrphan(afterStates, i);

        // If an orphan was created by this selection:
        if (isOrphanAfter && !wasOrphanBefore) {
          const orphanSeat = allRowSeats[i];
          // Skip if wheelchair
          if (orphanSeat.isWheelchair) continue;

          return {
            hasOrphan: true,
            orphanSeatLabel: orphanSeat.seatLabel,
            message: `Không được để lại ghế trống đơn lẻ "${orphanSeat.seatLabel}". Vui lòng chọn ghế liền kề hoặc cách ít nhất 2 ghế.`,
          };
        }
      }
    }

    return { hasOrphan: false };
  }
}
