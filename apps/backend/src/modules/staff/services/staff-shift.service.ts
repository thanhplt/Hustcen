import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClockService } from '../../../common/clock/clock.service';

@Injectable()
export class StaffShiftService {
  private readonly logger = new Logger(StaffShiftService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clockService: ClockService,
  ) {}

  /**
   * Start a new shift for staff member
   */
  async startShift(userId: string) {
    const existing = await this.prisma.staffShift.findFirst({
      where: { userId, endedAt: null },
    });

    if (existing) {
      return {
        alreadyActive: true,
        shift: existing,
        message: 'Bạn đang có một ca làm việc đang hoạt động.',
      };
    }

    const now = this.clockService.now();
    const shift = await this.prisma.staffShift.create({
      data: {
        userId,
        startedAt: now,
        totalSales: 0.0,
        totalCash: 0.0,
      },
    });

    return {
      alreadyActive: false,
      shift,
      message: 'Bắt đầu ca làm việc thành công.',
    };
  }

  /**
   * Get currently active shift
   */
  async getCurrentShift(userId: string) {
    const shift = await this.prisma.staffShift.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (!shift) {
      return { active: false, shift: null };
    }

    return { active: true, shift };
  }

  /**
   * Record POS sale into active shift
   */
  async recordSale(userId: string, amount: number, isCash: boolean) {
    const current = await this.prisma.staffShift.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (current) {
      await this.prisma.staffShift.update({
        where: { id: current.id },
        data: {
          totalSales: { increment: amount },
          totalCash: isCash ? { increment: amount } : undefined,
        },
      });
    }
  }

  /**
   * End and summarize current shift
   */
  async endShift(userId: string) {
    const shift = await this.prisma.staffShift.findFirst({
      where: { userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (!shift) {
      throw new NotFoundException('Không tìm thấy ca làm việc đang hoạt động để kết thúc.');
    }

    const now = this.clockService.now();
    const updated = await this.prisma.staffShift.update({
      where: { id: shift.id },
      data: { endedAt: now },
    });

    return {
      shiftId: updated.id,
      startedAt: updated.startedAt,
      endedAt: updated.endedAt,
      totalSales: updated.totalSales,
      totalCash: updated.totalCash,
      message: 'Đã chốt ca làm việc thành công.',
    };
  }
}
