'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Movie, Showtime, Seat, Combo } from '../../../types';
import { SeatMap } from '../../../components/SeatMap';
import {
  Receipt,
  CreditCard,
  DollarSign,
  UserCheck,
  Clock,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export default function StaffPosPage() {
  const { user, quickLoginDemo } = useAuth();

  const [activeShift, setActiveShift] = useState<any>(null);
  const [openingCash, setOpeningCash] = useState<number>(1000000);
  const [closingCash, setClosingCash] = useState<number>(1500000);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboQuantities, setComboQuantities] = useState<Record<string, number>>({});
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');

  const [loading, setLoading] = useState(false);
  const [lastSoldBooking, setLastSoldBooking] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check active shift
  useEffect(() => {
    if (!user) return;
    async function checkShift() {
      try {
        const shift = await api.getActiveShift();
        setActiveShift(shift);
      } catch (err) {
        setActiveShift(null);
      }
    }
    checkShift();
  }, [user]);

  // Fetch movies and combos
  useEffect(() => {
    async function initPos() {
      try {
        const [moviesRes, combosRes] = await Promise.all([api.getMovies(), api.getCombos()]);
        const all: Movie[] = Array.isArray(moviesRes) ? moviesRes : moviesRes?.items || [];
        const mList = all.filter((m) => m.status === 'NOW_SHOWING');
        setMovies(mList);
        if (mList.length > 0) setSelectedMovie(mList[0]);
        if (Array.isArray(combosRes)) setCombos(combosRes);
      } catch (err) {
        console.error('Failed to init POS', err);
      }
    }
    initPos();
  }, []);

  // Fetch showtimes for selected movie
  useEffect(() => {
    if (!selectedMovie) return;
    const movieSlug = selectedMovie.slug;
    async function fetchShowtimes() {
      try {
        const res = await api.getShowtimes({ movie: movieSlug });
        const list: Showtime[] = [];
        if (res?.cinemas) {
          for (const cin of res.cinemas) {
            for (const rt of cin.roomTypes) {
              for (const st of rt.showtimes) {
                list.push({ ...st, cinema: cin.cinema });
              }
            }
          }
        }
        setShowtimes(list);
        if (list.length > 0) {
          handleSelectShowtime(list[0]);
        } else {
          setSelectedShowtime(null);
          setSeats([]);
        }
      } catch (err) {
        setShowtimes([]);
      }
    }
    fetchShowtimes();
  }, [selectedMovie]);

  const handleSelectShowtime = async (st: Showtime) => {
    try {
      setLoading(true);
      const data = await api.getShowtimeById(st.id);
      setSelectedShowtime(data);
      if (data?.seats) setSeats(data.seats);
      setSelectedSeatIds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async () => {
    try {
      setLoading(true);
      const res = await api.openShift(openingCash);
      setActiveShift(res);
      setMessage({ type: 'success', text: 'Mở ca làm việc thu ngân thành công!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi mở ca' });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    try {
      setLoading(true);
      await api.closeShift(closingCash);
      setActiveShift(null);
      setMessage({ type: 'success', text: 'Đã kết ca và chốt sổ tiền mặt thành công!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi kết ca' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSeat = (seat: Seat) => {
    setSelectedSeatIds((prev) =>
      prev.includes(seat.id) ? prev.filter((id) => id !== seat.id) : [...prev, seat.id],
    );
  };

  const handleSellTickets = async () => {
    if (!selectedShowtime || selectedSeatIds.length === 0) {
      setMessage({ type: 'error', text: 'Vui lòng chọn ghế trước khi bán vé.' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      const comboItems = Object.entries(comboQuantities)
        .filter(([_, q]) => q > 0)
        .map(([comboId, quantity]) => ({ comboId, quantity }));

      const res = await api.staffSell({
        showtimeId: selectedShowtime.id,
        seatIds: selectedSeatIds,
        combos: comboItems,
        paymentMethod,
        customerPhone: customerPhone.trim() || undefined,
      });

      setLastSoldBooking(res);
      setMessage({ type: 'success', text: `Xuất vé thành công! Mã đơn: ${res.bookingCode}` });

      // Refresh showtime seats
      handleSelectShowtime(selectedShowtime);
      setComboQuantities({});
      setCustomerPhone('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi xuất vé POS' });
    } finally {
      setLoading(false);
    }
  };

  const formatVnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

  return (
    <div className="min-h-screen bg-surface-alt/70 p-4 sm:p-6 space-y-6">
      {/* POS Top Header */}
      <div className="bg-white rounded-3xl p-5 border border-border-subtle shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#c8102e] text-white rounded-2xl shadow-md">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">
              Quầy Bán Vé Box Office POS
            </h1>
            <p className="text-xs text-gray-500">
              Thu ngân: <strong>{user?.fullName || 'Nhân viên POS'}</strong> ({user?.role || 'STAFF'})
            </p>
          </div>
        </div>

        {/* Shift Controls */}
        <div className="flex items-center gap-3">
          {!user && (
            <button
              onClick={() => quickLoginDemo('STAFF')}
              className="px-3 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Đăng Nhập Quyền Staff
            </button>
          )}

          {activeShift ? (
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Ca Đang Mở (#{activeShift.id?.substring(0, 8)})
              </span>
              <button
                onClick={handleCloseShift}
                className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs transition-colors"
              >
                Chốt Ca & Đóng Sổ
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value))}
                placeholder="Tiền đầu ca"
                className="w-28 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-semibold"
              />
              <button
                onClick={handleOpenShift}
                className="px-4 py-1.5 rounded-xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-xs shadow-sm transition-colors"
              >
                Mở Ca Thu Ngân
              </button>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2 text-xs font-bold ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* POS Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Movie & Showtime Selector + Seat Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Movie Horizontal Scroller */}
          <div className="bg-white p-4 rounded-3xl border border-border-subtle shadow-sm space-y-3">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              1. Chọn Phim Chiếu
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {movies.map((m) => {
                const isSelected = selectedMovie?.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMovie(m)}
                    className={`flex items-center gap-2.5 p-2 rounded-2xl border min-w-[200px] text-left transition-all shrink-0 ${
                      isSelected
                        ? 'border-[#c8102e] bg-red-50/50 ring-2 ring-[#c8102e]/30'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {m.posterUrl && (
                      <img
                        src={m.posterUrl}
                        alt={m.title}
                        className="w-10 h-14 object-cover rounded-lg shrink-0"
                      />
                    )}
                    <div className="truncate">
                      <div className="font-bold text-xs text-gray-900 truncate">{m.title}</div>
                      <div className="text-[10px] text-gray-500">{m.durationMinutes}p • {m.ageRating}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Showtime Selector */}
          {showtimes.length > 0 && (
            <div className="bg-white p-4 rounded-3xl border border-border-subtle shadow-sm space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                2. Chọn Suất Chiếu
              </div>
              <div className="flex flex-wrap gap-2">
                {showtimes.map((st) => {
                  const isSelected = selectedShowtime?.id === st.id;
                  const time = st.timeDisplay ? st.timeDisplay.split(' – ')[0] : '';
                  return (
                    <button
                      key={st.id}
                      onClick={() => handleSelectShowtime(st)}
                      className={`px-4 py-2 rounded-2xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#c8102e] text-white border-[#c8102e] shadow-md'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div>{time}</div>
                      <div className="text-[10px] opacity-80">{st.cinema?.name?.replace('HUST Cine ', '')}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Seat Map */}
          {selectedShowtime && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
                3. Chọn Ghế Trên Sơ Đồ
              </div>
              <SeatMap
                seats={seats}
                selectedSeatIds={selectedSeatIds}
                onToggleSeat={handleToggleSeat}
                roomType={selectedShowtime.auditorium?.type}
              />
            </div>
          )}
        </div>

        {/* Right Col: POS Counter Checkout Cart */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-6 sticky top-20">
            <h3 className="font-black text-base text-gray-900 border-b border-gray-100 pb-3">
              Hóa Đơn Bán Lẻ Tại Quầy
            </h3>

            {/* Quick Combos Add-on */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-700">Combo Bắp Nước</div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {combos.map((c) => {
                  const q = comboQuantities[c.id] || 0;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                    >
                      <div className="truncate mr-2">
                        <div className="font-semibold text-gray-900 truncate">{c.name}</div>
                        <div className="text-[10px] text-[#c8102e] font-bold">{formatVnd(c.price)}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() =>
                            setComboQuantities((p) => ({ ...p, [c.id]: Math.max(0, (p[c.id] || 0) - 1) }))
                          }
                          className="w-6 h-6 rounded bg-gray-200 text-gray-700 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="font-bold w-4 text-center">{q}</span>
                        <button
                          onClick={() =>
                            setComboQuantities((p) => ({ ...p, [c.id]: (p[c.id] || 0) + 1 }))
                          }
                          className="w-6 h-6 rounded bg-[#c8102e] text-white flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer Phone (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                SĐT Khách Hàng (Tích điểm hội viên)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09xx xxx xxx"
                className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-700">Hình Thức Thanh Toán</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['CASH', 'CARD', 'TRANSFER'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 rounded-xl border font-bold transition-all ${
                      paymentMethod === method
                        ? 'bg-[#c8102e] text-white border-[#c8102e]'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {method === 'CASH' ? 'Tiền Mặt' : method === 'CARD' ? 'Thẻ POS' : 'Chuyển Khoản'}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Sell Button */}
            <button
              onClick={handleSellTickets}
              disabled={loading || selectedSeatIds.length === 0}
              className="w-full py-4 rounded-2xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-black text-sm shadow-xl shadow-red-900/30 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              <Printer className="w-5 h-5" />
              <span>In Vé & Thu Tiền ({selectedSeatIds.length} ghế)</span>
            </button>
          </div>

          {/* Last Sold Receipt Preview */}
          {lastSoldBooking && (
            <div className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-sm space-y-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Vé vừa xuất: {lastSoldBooking.bookingCode}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl space-y-1 font-mono text-[11px]">
                <div>Phim: {lastSoldBooking.movieTitle}</div>
                <div>Phòng: {lastSoldBooking.auditoriumName}</div>
                <div>Ghế: {(lastSoldBooking.seats || []).join(', ')}</div>
                <div className="font-bold text-[#c8102e]">
                  Tổng tiền: {formatVnd(lastSoldBooking.finalAmount ?? lastSoldBooking.totalAmount ?? 0)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
