// Domain Enums and Interfaces for HUST Cine

export enum Role {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export enum RoomType {
  STANDARD = 'STANDARD',
  GRAND = 'GRAND',
  IMAX = 'IMAX',
  LUXURY = 'LUXURY',
  PRIVATE = 'PRIVATE',
}

export enum BookingMode {
  PER_SEAT = 'PER_SEAT',
  WHOLE_ROOM = 'WHOLE_ROOM',
}

export enum SeatType {
  STANDARD = 'STANDARD',
  VIP = 'VIP',
  COUPLE = 'COUPLE',
  RECLINER = 'RECLINER',
  SOFA = 'SOFA',
  WHEELCHAIR = 'WHEELCHAIR',
}

export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  SOLD = 'SOLD',
}

export enum AgeRating {
  P = 'P',
  K = 'K',
  T13 = 'T13',
  T16 = 'T16',
  T18 = 'T18',
}

export enum MovieFormat {
  TWO_D = '2D',
  THREE_D = '3D',
  IMAX = 'IMAX',
}

export enum MovieStatus {
  DRAFT = 'DRAFT',
  COMING_SOON = 'COMING_SOON',
  NOW_SHOWING = 'NOW_SHOWING',
  ENDED = 'ENDED',
  HIDDEN = 'HIDDEN',
}

export enum ShowtimeStatus {
  CANCELLED = 'CANCELLED',
  ENDED = 'ENDED',
  ONGOING = 'ONGOING',
  CLOSED = 'CLOSED',
  CLOSING_SOON = 'CLOSING_SOON',
  SOLD_OUT = 'SOLD_OUT',
  OPEN = 'OPEN',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  MOCK_GATEWAY = 'MOCK_GATEWAY',
  VNPAY_STUB = 'VNPAY_STUB',
  MOMO_STUB = 'MOMO_STUB',
  CASH_COUNTER = 'CASH_COUNTER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path?: string;
}
