'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import { Showtime, Seat } from '../../../types';
import { SeatMap } from '../../../components/SeatMap';
import { useAuth } from '../../../context/AuthContext';
import {
  Clock,
  Ticket,
  ChevronLeft,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function SeatSelectionPage() {
  const params = useParams();
  const router = useRouter();
  const showtimeId = params.showtimeId as string;
  const { user } = useAuth();

  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(600); // 10 minutes default
  const [isHolding, setIsHolding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch showtime details and seats
  useEffect(() => {
    if (!showtimeId) return;
    async function loadShowtime() {
      try {
        setLoading(true);
        const data = await api.getShowtimeById(showtimeId);
        setShowtime(data);
        if (data.seats) {
          setSeats(data.seats);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Không thể tải thông tin suất chiếu');
      } finally {
        setLoading(false);
      }
    }
    loadShowtime();
  }, [showtimeId]);

  // WebSocket for Realtime Seat Hold Updates
  useEffect(() => {
    if (!showtimeId) return;
    const socket = getSocket();

    socket.emit('join_showtime', { showtimeId });

    socket.on(
      'seats_status_updated',
      (payload: { showtimeId: string; updates: Array<{ seatId: string; status: string; holdExpiresAt?: string }> }) => {
        if (payload?.showtimeId === showtimeId && Array.isArray(payload.updates)) {
          setSeats((prevSeats) => {
            const updateMap = new Map(payload.updates.map((u) => [u.seatId, u]));
            return prevSeats.map((s) => {
              const u = updateMap.get(s.id);
              if (u) {
                return {
                  ...s,
                  status: u.status as any,
                  holdExpiresAt: u.holdExpiresAt || null,
                };
              }
              return s;
            });
          });
        }
      },
    );

    return () => {
      socket.emit('leave_showtime', { showtimeId });
      socket.off('seats_status_updated');
    };
  }, [showtimeId]);

  // Hold countdown ticker (if holding)
  useEffect(() => {
    if (!isHolding || holdSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setHoldSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsHolding(false);
          setSelectedSeatIds([]);
          setErrorMessage('Thời gian giữ chỗ đã hết hạn! Vui lòng chọn lại ghế.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isHolding, holdSecondsLeft]);

  // Toggle Seat selection
  const handleToggleSeat = (seat: Seat) => {
    setErrorMessage(null);

    // Private Lab whole room hold logic
    if (showtime?.auditorium?.type === 'PRIVATE') {
      const allAvailableIds = seats
        .filter((s) => s.status !== 'BOOKED')
        .map((s) => s.id);
      setSelectedSeatIds((prev) => (prev.length > 0 ? [] : allAvailableIds));
      return;
    }

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      } else {
        if (prev.length >= 8) {
          setErrorMessage('Mỗi giao dịch chỉ được chọn tối đa 8 ghế.');
          return prev;
        }
        return [...prev, seat.id];
      }
    });
  };

  // Estimate total price
  const calculateEstimatedTotal = () => {
    if (!showtime) return 0;
    const base = showtime.basePrice || 95000;
    const multiplier = showtime.auditorium?.priceMultiplier || 1.0;

    let total = 0;
    for (const seatId of selectedSeatIds) {
      const seat = seats.find((s) => s.id === seatId);
      if (!seat) continue;
      let seatPrice = base * multiplier;
      if (seat.seatType === 'VIP') seatPrice += 15000;
      if (seat.seatType === 'COUPLE') seatPrice = base * multiplier * 2.0;
      total += seatPrice;
    }
    return Math.round(total);
  };

  // Proceed to Combos and Checkout
  const handleProceed = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/dat-ve/${showtimeId}`);
      return;
    }

    if (selectedSeatIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 ghế để tiếp tục.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      // Perform atomic seat hold on backend
      const res = await api.holdSeats(showtimeId, selectedSeatIds);
      if (res?.success) {
        setIsHolding(true);
        setHoldSecondsLeft(res.expiresInSeconds || 600);
        // Save held seats to sessionStorage
        sessionStorage.setItem('hustcine_held_showtime_id', showtimeId);
        sessionStorage.setItem('hustcine_held_seat_ids', JSON.stringify(selectedSeatIds));

        // Navigate to Combos step
        router.push(`/dat-ve/${showtimeId}/combo`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Không thể giữ ghế. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading && !showtime) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-[#c8102e] border-t-transparent rounded-full mx-auto mb-4" />
        Đang tải sơ đồ phòng chiếu...
      </div>
    );
  }

  if (!showtime) return null;

  const isPrivateLab = showtime.auditorium?.type === 'PRIVATE';
  const selectedSeatLabels = seats
    .filter((s) => selectedSeatIds.includes(s.id))
    .map((s) => s.seatLabel)
    .join(', ');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* 1. Header Bar: Movie & Showtime Summary */}
      <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/phim/${showtime.movie?.slug || ''}`}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
            title="Quay lại chi tiết phim"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#c8102e] text-white text-[10px] font-black px-2 py-0.5 rounded">
                {showtime.movie?.ageRating || 'P'}
              </span>
              <span className="text-xs font-bold text-gray-500">
                {showtime.cinema?.name} • Phòng {showtime.auditorium?.name} ({showtime.format})
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
              {showtime.movie?.title}
            </h1>
          </div>
        </div>

        {/* Hold Countdown Badge */}
        {isHolding && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-800 px-4 py-2 rounded-2xl shadow-sm">
            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
            <div className="text-xs">
              <span className="font-semibold block text-[10px] uppercase text-amber-600">
                Thời Gian Giữ Ghế
              </span>
              <span className="font-mono font-bold text-base">{formatCountdown(holdSecondsLeft)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Error / Alert Banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-[#c8102e] px-5 py-3.5 rounded-2xl flex items-center gap-3 text-sm font-semibold animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Interactive Seat Map */}
      <SeatMap
        seats={seats}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={handleToggleSeat}
        roomType={showtime.auditorium?.type}
        isPrivateLab={isPrivateLab}
      />

      {/* 3. Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md rounded-3xl border border-gray-200 shadow-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="p-3 bg-red-50 rounded-2xl text-[#c8102e] shrink-0">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">
              Ghế đang chọn: <strong>{selectedSeatLabels || 'Chưa chọn'}</strong> (
              {selectedSeatIds.length} ghế)
            </div>
            <div className="text-xl font-black text-gray-900">
              {formatVnd(calculateEstimatedTotal())}
            </div>
          </div>
        </div>

        <button
          onClick={handleProceed}
          disabled={selectedSeatIds.length === 0}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none"
        >
          <span>Tiếp Tục Chọn Bắp Nước</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
