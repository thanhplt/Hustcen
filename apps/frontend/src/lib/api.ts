const API_BASE = '/api';

export class ApiError extends Error {
  statusCode: number;
  data: any;
  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('hustcine_token');
  const sessionId = localStorage.getItem('hustcine_session_id');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (sessionId) headers['x-session-id'] = sessionId;
  return headers;
}

export function getSessionId(): string {
  if (typeof window === 'undefined') return 'sess_' + Math.random().toString(36).substring(2);
  let sid = localStorage.getItem('hustcine_session_id');
  if (!sid) {
    sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    localStorage.setItem('hustcine_session_id', sid);
  }
  return sid;
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (err) {
    json = { message: text };
  }

  if (!res.ok) {
    const errorMsg = json?.error?.message || json?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new ApiError(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg, res.status, json);
  }

  return json as T;
}

export const api = {
  // Public
  getMovies: (params?: { genre?: string; format?: string; ageRating?: string; search?: string; status?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request(`/movies${q ? `?${q}` : ''}`);
  },
  getMovieBySlug: (slug: string) => request(`/movies/${slug}`),
  subscribeNotifyMe: (movieId: string, emailOrPhone: string) =>
    request(`/movies/${movieId}/notify-me`, {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone }),
    }),
  getCinemas: (city?: string) => request(`/cinemas${city ? `?city=${city}` : ''}`),
  getCinemaBySlug: (slug: string) => request(`/cinemas/${slug}`),
  getShowtimes: (params: { date?: string; cinema?: string; movie?: string; includePast?: boolean }) => {
    const q = new URLSearchParams(params as any).toString();
    return request(`/showtimes${q ? `?${q}` : ''}`);
  },
  getShowtimeById: (id: string) => request(`/showtimes/${id}`),
  getCombos: () => request('/combos'),

  // Bookings
  holdSeats: (showtimeId: string, seatIds: string[]) =>
    request('/bookings/hold', {
      method: 'POST',
      body: JSON.stringify({ showtimeId, seatIds, sessionId: getSessionId() }),
    }),
  releaseHold: (showtimeId: string, seatIds: string[]) =>
    request('/bookings/release', {
      method: 'POST',
      body: JSON.stringify({ showtimeId, seatIds, sessionId: getSessionId() }),
    }),
  calculatePrice: (dto: { showtimeId: string; seatIds: string[]; combos?: Array<{ comboId: string; quantity: number }>; voucherCode?: string }) =>
    request('/bookings/calculate-price', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  createBooking: (dto: {
    showtimeId: string;
    seatIds: string[];
    combos?: Array<{ comboId: string; quantity: number }>;
    voucherCode?: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
  }) =>
    request('/bookings', {
      method: 'POST',
      body: JSON.stringify({ ...dto, sessionId: getSessionId() }),
    }),
  getBookingById: (id: string) => request(`/bookings/${id}`),

  // Payments
  createPaymentIntent: (bookingId: string, method = 'MOCK_GATEWAY') =>
    request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ bookingId, method: method === 'MOCK' ? 'MOCK_GATEWAY' : method }),
    }),
  mockPaymentProcess: (payload: { transactionRef: string; status: 'SUCCESS' | 'FAILED' | 'CANCELLED' }) =>
    request('/payments/mock/process', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  mockPaymentWebhook: (payload: { transactionRef: string; bookingCode: string; amount: number; status: 'SUCCESS' | 'FAILED' | 'CANCELLED'; signature?: string }) =>
    request('/payments/webhook/mock', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Auth
  login: (credentials: { emailOrPhone?: string; identifier?: string; password?: string; otp?: string }) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: credentials.identifier || credentials.emailOrPhone,
        password: credentials.password,
        otp: credentials.otp,
      }),
    }),
  register: (dto: { email: string; fullName: string; phone?: string; password?: string }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  getMe: () => request('/auth/me'),
  getCustomerDashboard: () => request('/users/dashboard'),
  updateProfile: (data: { fullName?: string; phone?: string }) =>
    request('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Time & Dev Clock
  getServerTime: () => request('/time'),
  getClockStatus: () => request('/dev/clock'),
  setClock: (dto: { setTo?: string; offsetMinutes?: number }) =>
    request('/dev/clock', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  resetClock: () =>
    request('/dev/clock/reset', {
      method: 'POST',
    }),
  getMailbox: () => request('/dev/mailbox'),
  getDemoAccounts: () => request('/dev/demo-accounts'),

  // Staff POS & Scanner
  staffSell: (dto: { showtimeId: string; seatIds: string[]; combos?: Array<{ comboId: string; quantity: number }>; paymentMethod: string; customerPhone?: string }) =>
    request('/staff/pos/sell', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  scanTicket: (token: string) =>
    request('/staff/scanner/scan', {
      method: 'POST',
      body: JSON.stringify({ qrToken: token }),
    }),
  getScanHistory: () => request('/staff/scanner/history'),
  getActiveShift: async () => {
    const res = await request('/staff/shift/current');
    return res?.shift || null;
  },
  openShift: async (openingCash?: number) => {
    const res = await request('/staff/shift/start', {
      method: 'POST',
      body: JSON.stringify({ openingCash }),
    });
    return res?.shift || res;
  },
  closeShift: async (closingCash?: number, note?: string) => {
    return request('/staff/shift/end', {
      method: 'POST',
      body: JSON.stringify({ closingCash, note }),
    });
  },

  // Admin
  getDashboardKpis: (cinemaId?: string) => request(`/admin/dashboard/kpis${cinemaId ? `?cinemaId=${cinemaId}` : ''}`),
  getRevenueChart: () => request('/admin/dashboard/revenue-chart'),
  getOccupancyChart: () => request('/admin/dashboard/occupancy-chart'),
  getAdminMovies: () => request('/admin/movies'),
  createMovie: (data: any) =>
    request('/admin/movies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  uploadPoster: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('hustcine_token');
    const res = await fetch(`${API_BASE}/admin/movies/upload-poster`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const errText = await res.text();
      let errJson: any;
      try { errJson = JSON.parse(errText); } catch {}
      throw new Error(errJson?.message || 'Upload poster failed');
    }
    const data = await res.json();
    return {
      ...data,
      url: data.posterUrl || data.posterLarge,
      large: data.posterLarge,
      original: data.posterUrl,
    };
  },
  updateMovie: (id: string, data: any) =>
    request(`/admin/movies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  validateTrailer: (trailerUrl: string) =>
    request('/admin/movies/validate-trailer', {
      method: 'POST',
      body: JSON.stringify({ trailerUrl }),
    }),
  deleteMovie: (id: string) =>
    request(`/admin/movies/${id}`, {
      method: 'DELETE',
    }),
  getAdminShowtimes: (params: any) => {
    const q = new URLSearchParams(params).toString();
    return request(`/admin/showtimes${q ? `?${q}` : ''}`);
  },
  createShowtime: (dto: any) =>
    request('/admin/showtimes', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  createShowtimeSeries: (dto: any) =>
    request('/admin/showtimes/series', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  cancelShowtime: (id: string, reason: string) =>
    request(`/admin/showtimes/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  getSettings: () => request('/admin/settings'),
  updateSetting: (key: string, value: string | number) =>
    request('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ [key]: Number(value) }),
    }),
  cancelBooking: (bookingIdOrCode: string, reason?: string) =>
    request(`/bookings/${bookingIdOrCode}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};
