import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ClockService } from '../../common/clock/clock.service';
import { UpdateProfileDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clockService?: ClockService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tier: true,
        _count: {
          select: {
            bookings: true,
            favorites: true,
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.phone) {
      const existing = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: userId } },
      });
      if (existing) {
        throw new ConflictException('Số điện thoại này đã được sử dụng bởi tài khoản khác');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
      },
      include: { tier: true },
    });

    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }

  async getFavorites(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: {
        movie: {
          include: {
            genres: {
              include: { genre: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => ({
      favoriteId: f.id,
      createdAt: f.createdAt,
      movie: f.movie,
    }));
  }

  async addFavorite(userId: string, movieId: string) {
    const movie = await this.prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException('Không tìm thấy bộ phim này');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_movieId: { userId, movieId },
      },
    });

    if (existing) {
      return { success: true, message: 'Phim đã có sẵn trong danh sách yêu thích' };
    }

    await this.prisma.favorite.create({
      data: { userId, movieId },
    });

    return { success: true, message: 'Đã thêm phim vào danh sách yêu thích' };
  }

  async removeFavorite(userId: string, movieId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId, movieId },
    });

    return { success: true, message: 'Đã xóa phim khỏi danh sách yêu thích' };
  }

  async getNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      unreadCount,
      notifications,
    };
  }

  async markNotificationAsRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });

    return { success: true };
  }

  async markAllNotificationsAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId },
      data: { isRead: true },
    });

    return { success: true };
  }

  /**
   * Customer Dashboard: profile, spending, loyalty points, exchange rules, upcoming and past tickets
   */
  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tier: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin người dùng');
    }

    // Auto-link any bookings created with matching email or phone to this user account
    await this.prisma.booking.updateMany({
      where: {
        userId: null,
        OR: [
          ...(user.email ? [{ guestEmail: user.email }] : []),
          ...(user.phone ? [{ guestPhone: user.phone }] : []),
        ],
      },
      data: {
        userId: user.id,
      },
    });

    const now = this.clockService ? this.clockService.now() : new Date();

    // Fetch all bookings for this user
    const bookings = await this.prisma.booking.findMany({
      where: {
        OR: [
          { userId },
          ...(user.email ? [{ guestEmail: user.email }] : []),
          ...(user.phone ? [{ guestPhone: user.phone }] : []),
        ],
        status: { in: ['PAID', 'CONFIRMED', 'CANCELLED', 'REFUNDED'] },
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
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total spending across active paid bookings only
    const paidBookings = bookings.filter((b) => b.status === 'PAID' || b.status === 'CONFIRMED');
    const totalSpending = paidBookings.reduce(
      (sum, b) => sum + (b.finalAmount ?? b.totalAmount ?? 0),
      0,
    );

    // Rule: 1.000đ chi tiêu = 10 điểm thưởng (10/1000 = 0.01)
    // 1 điểm thưởng đổi 1 đồng tiền
    const earnedFromSpending = Math.floor((totalSpending / 1000) * 10);
    const activeLoyaltyPoints = Math.max(user.loyaltyPoints || 0, earnedFromSpending);

    if (activeLoyaltyPoints > (user.loyaltyPoints || 0)) {
      this.prisma.user
        .update({
          where: { id: userId },
          data: { loyaltyPoints: activeLoyaltyPoints },
        })
        .catch(() => {});
    }

    const mappedBookings = bookings.map((b) => {
      const seatLabels = b.bookingSeats
        .map((bs) => bs.showtimeSeat?.seat?.seatLabel)
        .filter(Boolean)
        .join(', ');

      const combosSummary = b.bookingCombos.map((bc) => ({
        name: bc.combo.name,
        quantity: bc.quantity,
        unitPrice: bc.unitPrice,
      }));

      const startAt = new Date(b.showtime.startAt);
      const isCancelled = b.status === 'CANCELLED' || b.status === 'REFUNDED';
      const isPast = startAt < now || b.qrScannedAt != null || isCancelled;

      // Cutoff time: 10 minutes before showtime
      const cutoffTime = new Date(startAt.getTime() - 10 * 60 * 1000);
      const canCancel =
        !isCancelled &&
        (b.status === 'PAID' || b.status === 'CONFIRMED') &&
        b.qrScannedAt == null &&
        now <= cutoffTime;

      const minutesUntilCutoff = Math.max(
        0,
        Math.floor((cutoffTime.getTime() - now.getTime()) / 60000),
      );

      return {
        id: b.id,
        bookingCode: b.bookingCode,
        status: b.status,
        totalAmount: b.totalAmount,
        finalAmount: b.finalAmount ?? b.totalAmount,
        discountAmount: b.discountAmount,
        createdAt: b.createdAt,
        qrTokenSigned: b.qrTokenSigned,
        qrScannedAt: b.qrScannedAt,
        isPast,
        isCancelled,
        canCancel,
        minutesUntilCutoff,
        cutoffTime: cutoffTime.toISOString(),
        showtime: {
          id: b.showtime.id,
          startAt: b.showtime.startAt,
          endAt: b.showtime.endAt,
          format: b.showtime.format,
          movie: {
            id: b.showtime.movie.id,
            title: b.showtime.movie.title,
            slug: b.showtime.movie.slug,
            posterUrl: b.showtime.movie.posterUrl,
            durationMinutes: b.showtime.movie.durationMinutes,
            ageRating: b.showtime.movie.ageRating,
          },
          cinema: {
            id: b.showtime.cinema.id,
            name: b.showtime.cinema.name,
            address: b.showtime.cinema.address,
          },
          auditorium: {
            id: b.showtime.auditorium.id,
            name: b.showtime.auditorium.name,
            type: b.showtime.auditorium.type,
          },
        },
        seatLabels,
        combos: combosSummary,
      };
    });

    const upcomingTickets = mappedBookings.filter((b) => !b.isPast);
    const pastTickets = mappedBookings.filter((b) => b.isPast);

    const { passwordHash, ...safeUser } = user;

    return {
      profile: {
        ...safeUser,
        phone: user.phone || '',
        loyaltyPoints: activeLoyaltyPoints,
      },
      stats: {
        phone: user.phone || 'Chưa cập nhật',
        totalSpending,
        loyaltyPoints: activeLoyaltyPoints,
        pointsValueVnd: activeLoyaltyPoints * 1, // 1 điểm = 1 đồng
        rules: {
          earnRate: '1.000 đồng chi tiêu = 10 điểm thưởng',
          redeemRate: '1 điểm thưởng = 1 đồng tiền',
          description:
            'Quy định: Cứ mỗi 1.000 đồng chi tiêu tích lũy được 10 điểm thưởng. 1 điểm thưởng đổi được 1 đồng tiền khi đổi quà hoặc trừ trực tiếp vào tiền vé.',
        },
        totalBookings: bookings.length,
        upcomingCount: upcomingTickets.length,
        pastCount: pastTickets.length,
      },
      upcomingTickets,
      pastTickets,
    };
  }
}
