import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ClockService } from '../../../common/clock/clock.service';

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clockService: ClockService,
  ) {}

  /**
   * Get KPI summary cards and comparisons
   */
  async getSummary(cinemaId?: string) {
    const now = this.clockService.now();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    const endOfYesterday = new Date(endOfToday.getTime() - 86400000);

    const bookingWhereToday: any = {
      status: 'PAID',
      createdAt: { gte: startOfToday, lte: endOfToday },
    };
    if (cinemaId) bookingWhereToday.cinemaId = cinemaId;

    const bookingWhereYesterday: any = {
      status: 'PAID',
      createdAt: { gte: startOfYesterday, lte: endOfYesterday },
    };
    if (cinemaId) bookingWhereYesterday.cinemaId = cinemaId;

    const [
      todayPaidBookings,
      yesterdayPaidBookings,
      activeMoviesCount,
      cinemasCount,
      todayShowtimes,
    ] = await Promise.all([
      this.prisma.booking.findMany({
        where: bookingWhereToday,
        include: { bookingSeats: true },
      }),
      this.prisma.booking.findMany({
        where: bookingWhereYesterday,
        include: { bookingSeats: true },
      }),
      this.prisma.movie.count({
        where: { status: 'NOW_SHOWING', deletedAt: null },
      }),
      this.prisma.cinema.count(),
      this.prisma.showtime.findMany({
        where: {
          cinemaId: cinemaId || undefined,
          isCancelled: false,
          startAt: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          _count: { select: { showtimeSeats: true } },
        },
      }),
    ]);

    const todayRevenue = todayPaidBookings.reduce((sum, b) => sum + b.finalAmount, 0);
    const todayBookingsCount = todayPaidBookings.length;
    const todayTicketsSold = todayPaidBookings.reduce(
      (sum, b) => sum + b.bookingSeats.length,
      0,
    );

    const yesterdayRevenue = yesterdayPaidBookings.reduce((sum, b) => sum + b.finalAmount, 0);
    const yesterdayBookingsCount = yesterdayPaidBookings.length;

    // Revenue growth percentage
    let revenueGrowthPct = 0;
    if (yesterdayRevenue > 0) {
      revenueGrowthPct = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100);
    } else if (todayRevenue > 0) {
      revenueGrowthPct = 100;
    }

    // Occupancy rate calculation
    const totalSeatsOfferedToday = todayShowtimes.reduce(
      (sum, st) => sum + st._count.showtimeSeats,
      0,
    );
    const occupancyRate =
      totalSeatsOfferedToday > 0
        ? Math.round((todayTicketsSold / totalSeatsOfferedToday) * 1000) / 10
        : 0;

    return {
      todayRevenue,
      todayBookingsCount,
      todayTicketsSold,
      occupancyRate,
      activeMoviesCount,
      cinemasCount,
      comparisons: {
        yesterdayRevenue,
        yesterdayBookingsCount,
        revenueGrowthPct,
      },
    };
  }

  /**
   * Daily revenue history for charts
   */
  async getRevenueChart(days: number = 7, cinemaId?: string) {
    const daysCount = Math.max(1, Math.min(days, 30));
    const now = this.clockService.now();
    const result: Array<{
      date: string;
      revenue: number;
      bookingsCount: number;
      ticketsCount: number;
    }> = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      const where: any = {
        status: 'PAID',
        createdAt: { gte: startOfDay, lte: endOfDay },
      };
      if (cinemaId) where.cinemaId = cinemaId;

      const bookings = await this.prisma.booking.findMany({
        where,
        include: { bookingSeats: true },
      });

      const revenue = bookings.reduce((sum, b) => sum + b.finalAmount, 0);
      const ticketsCount = bookings.reduce((sum, b) => sum + b.bookingSeats.length, 0);

      const dateStr = startOfDay.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        revenue,
        bookingsCount: bookings.length,
        ticketsCount,
      });
    }

    return result;
  }

  /**
   * Occupancy rate by room type
   */
  async getOccupancyChart(cinemaId?: string) {
    const auditoriums = await this.prisma.auditorium.findMany({
      where: cinemaId ? { cinemaId } : undefined,
      include: {
        seats: true,
        showtimes: {
          include: {
            showtimeSeats: {
              where: { status: 'SOLD' },
            },
          },
        },
      },
    });

    const roomTypes = ['STANDARD', 'GRAND', 'IMAX', 'LUXURY', 'PRIVATE'];
    const summaryMap: Record<string, { totalSeatsOffered: number; soldSeats: number }> = {};

    roomTypes.forEach((rt) => {
      summaryMap[rt] = { totalSeatsOffered: 0, soldSeats: 0 };
    });

    for (const aud of auditoriums) {
      const rt = aud.type.toUpperCase();
      if (!summaryMap[rt]) {
        summaryMap[rt] = { totalSeatsOffered: 0, soldSeats: 0 };
      }

      for (const st of aud.showtimes) {
        summaryMap[rt].totalSeatsOffered += aud.seats.length;
        summaryMap[rt].soldSeats += st.showtimeSeats.length;
      }
    }

    return roomTypes.map((rt) => {
      const data = summaryMap[rt];
      const rate =
        data.totalSeatsOffered > 0
          ? Math.round((data.soldSeats / data.totalSeatsOffered) * 1000) / 10
          : 0;

      return {
        roomType: rt,
        totalSeatsOffered: data.totalSeatsOffered,
        soldSeats: data.soldSeats,
        occupancyRate: rate,
      };
    });
  }

  /**
   * Top performing movies
   */
  async getTopMovies(limit: number = 5) {
    const movies = await this.prisma.movie.findMany({
      where: { deletedAt: null },
      include: {
        showtimes: {
          include: {
            bookings: {
              where: { status: 'PAID' },
              include: { bookingSeats: true },
            },
          },
        },
      },
    });

    const mapped = movies.map((m) => {
      let revenue = 0;
      let ticketsSold = 0;

      for (const st of m.showtimes) {
        for (const b of st.bookings) {
          revenue += b.finalAmount;
          ticketsSold += b.bookingSeats.length;
        }
      }

      return {
        id: m.id,
        title: m.title,
        slug: m.slug,
        posterUrl: m.posterUrl,
        ratingAvg: m.ratingAvg,
        revenue,
        ticketsSold,
      };
    });

    mapped.sort((a, b) => b.revenue - a.revenue);
    return mapped.slice(0, limit);
  }
}
