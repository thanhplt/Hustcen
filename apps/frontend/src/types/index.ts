export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Movie {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  synopsis: string;
  durationMinutes: number;
  releaseDate?: string;
  ageRating: string; // P, K, T13, T16, T18
  languages?: string;
  subtitleInfo?: string;
  country?: string;
  director?: string;
  castList?: string;
  formats?: string; // e.g. "[\"2D\",\"3D\",\"IMAX\"]"
  status: 'DRAFT' | 'COMING_SOON' | 'NOW_SHOWING' | 'ENDED' | 'HIDDEN';
  posterUrl?: string;
  backdropUrl?: string;
  ratingAvg?: number;
  ratingCount?: number;
  trailer?: {
    youtubeId: string;
    embedUrl: string;
    thumbnailUrl: string;
    embeddable: boolean;
  } | null;
  bookingCta?: 'BOOK' | 'NOTIFY_ME' | 'NONE';
  nextAvailableShowtimeDate?: string | null;
  genres?: Genre[];
  poster?: {
    original?: string;
    large?: string;
    medium?: string;
    thumb?: string;
    blurhash?: string;
    width?: number;
    height?: number;
  };
}

export interface Cinema {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  mapEmbedUrl?: string;
  amenities?: string[];
  auditoriums?: Auditorium[];
}

export interface Auditorium {
  id: string;
  name: string;
  code: string;
  type: 'STANDARD' | 'GRAND' | 'IMAX' | 'LUXURY' | 'PRIVATE';
  capacity: number;
  priceMultiplier: number;
  seats?: Seat[];
}

export interface Seat {
  id: string;
  seatLabel: string;
  rowCode: string;
  seatNumber: number;
  seatType: 'STANDARD' | 'VIP' | 'COUPLE' | 'RECLINER' | 'SOFA' | 'WHEELCHAIR';
  isWheelchair: boolean;
  status?: 'AVAILABLE' | 'HELD' | 'BOOKED';
  holdExpiresAt?: string | null;
}

export interface Showtime {
  id: string;
  format: string;
  startAt: string;
  endAt: string;
  timeDisplay?: string;
  status: 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'ONGOING' | 'ENDED' | 'SOLD_OUT' | 'CANCELLED';
  bookingClosesAt: string;
  secondsUntilClose: number;
  priceFrom?: number;
  basePrice?: number;
  seatsLeft?: number;
  totalSeats?: number;
  movie?: Movie;
  cinema?: Cinema;
  auditorium?: Auditorium;
  seats?: Seat[];
}

export interface ShowtimeSlot {
  id: string;
  format: string;
  startAt: string;
  endAt: string;
  startTime: string; // e.g. "10:50"
  endTime: string;   // e.g. "12:50"
  timeDisplay: string;
  status: 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'ONGOING' | 'ENDED' | 'SOLD_OUT' | 'CANCELLED';
  priceFrom: number;
  seatsLeft: number;
  totalSeats: number;
  canBook: boolean;
  auditorium?: Auditorium;
}

export interface ShowtimeFormatGroup {
  formatLabel: string; // e.g. "2D Phụ Đề Anh & Việt | Rạp STARIUM"
  format: string;
  auditoriumName: string;
  auditoriumType: string;
  showtimes: ShowtimeSlot[];
}

export interface MovieShowtimesGroup {
  movie: Movie;
  cinema: Cinema;
  formatGroups: ShowtimeFormatGroup[];
}

export interface Combo {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface PriceBreakdown {
  subtotalSeats: number;
  subtotalCombos: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  finalAmount?: number;
  voucherCode?: string;
  seats: Array<{
    seatId: string;
    seatLabel: string;
    seatType: string;
    unitPrice: number;
  }>;
  combos: Array<{
    comboId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface Booking {
  id: string;
  bookingCode: string;
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'CANCELLED' | 'REFUNDED';
  totalAmount: number;
  createdAt: string;
  showtime: Showtime;
  bookingSeats: Array<{
    id: string;
    price: number;
    seat: Seat;
  }>;
  bookingCombos: Array<{
    id: string;
    quantity: number;
    price: number;
    combo: Combo;
  }>;
  tickets?: Array<{
    id: string;
    ticketCode: string;
    qrToken: string;
    qrImage?: string;
    isCheckedIn: boolean;
    checkedInAt?: string;
    seat: Seat;
  }>;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  role: 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';
  studentId?: string;
  points?: number;
  tier?: {
    name: string;
    discountPercent: number;
  };
}

export interface ClockStatus {
  serverNow: string;
  timezone: string;
  isSimulated: boolean;
  offsetMinutes: number;
  weekday: string;
  weekdayFull: string;
  displayHeader: string;
}
