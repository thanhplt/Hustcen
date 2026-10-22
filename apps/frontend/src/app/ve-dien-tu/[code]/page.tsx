'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import {
  Ticket,
  Printer,
  Share2,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  X,
  Film,
  ArrowLeft,
} from 'lucide-react';

export default function ETicketPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Tôi có việc bận đột xuất');
  const [cancelling, setCancelling] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!code) return;
    async function fetchTicket() {
      try {
        setLoading(true);
        const data = await api.getBookingById(code);
        setBooking(data);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Không tìm thấy vé điện tử');
      } finally {
        setLoading(false);
      }
    }
    fetchTicket();
  }, [code]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-[#c8102e] border-t-transparent rounded-full mx-auto mb-4" />
        Đang tải thông tin vé điện tử...
      </div>
    );
  }

  if (errorMsg || !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Không tìm thấy vé điện tử</h2>
        <p className="text-xs text-gray-500">{errorMsg || 'Mã vé không tồn tại hoặc đã bị hủy'}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>
      </div>
    );
  }

  const { showtime, bookingSeats, bookingCombos } = booking;
  const movie = showtime?.movie;
  const cinema = showtime?.cinema;
  const auditorium = showtime?.auditorium;

  const seatLabels = (bookingSeats || [])
    .map((bs: any) => bs.showtimeSeat?.seat?.seatLabel)
    .filter(Boolean)
    .join(', ');

  const qrData = booking.qrTokenSigned || booking.bookingCode;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    qrData,
  )}&color=9e001f`;

  const formatVnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const dateStr = d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${timeStr} - ${dateStr}`;
  };

  const isCancelled = booking.status === 'CANCELLED' || booking.status === 'REFUNDED';
  const showtimeStart = booking.showtime?.startAt ? new Date(booking.showtime.startAt).getTime() : 0;
  const now = Date.now();
  const canCancel =
    !isCancelled &&
    (booking.status === 'PAID' || booking.status === 'CONFIRMED') &&
    !booking.qrScannedAt &&
    now <= showtimeStart - 10 * 60 * 1000;

  const handleCancelBooking = async () => {
    try {
      setCancelling(true);
      await api.cancelBooking(booking.id || booking.bookingCode, cancelReason);
      setToastMessage({
        text: 'Hủy vé thành công! Toàn bộ số tiền vé đã được hoàn trả.',
        type: 'success',
      });
      setShowCancelModal(false);
      const updated = await api.getBookingById(code);
      setBooking(updated);
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi hủy vé.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt/70 py-10 px-4 flex flex-col items-center justify-center print:bg-white print:p-0">
      {/* Toast message */}
      {toastMessage && (
        <div className="max-w-md w-full mb-4 p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top action bar (hidden in print) */}
      <div className="max-w-md w-full flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>

        <div className="flex items-center gap-2">
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-3 py-1.5 rounded-xl bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <XCircle className="w-3.5 h-3.5 text-red-500" /> Hủy Vé
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" /> In Vé
          </button>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 text-red-600">
                <XCircle className="w-4 h-4" />
                <span>Xác Nhận Hủy Vé</span>
              </h3>
              <button disabled={cancelling} onClick={() => setShowCancelModal(false)}>
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-900 space-y-1">
              <div className="font-bold">Chính sách hủy vé:</div>
              <div>Bạn chỉ có thể hủy vé trước giờ chiếu tối thiểu 10 phút. Số tiền {formatVnd(booking.finalAmount || booking.totalAmount)} sẽ được hoàn trả đầy đủ.</div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block font-semibold text-gray-700">Lý do hủy:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2 text-xs focus:outline-none focus:border-[#c8102e]"
              >
                <option value="Tôi có việc bận đột xuất">Tôi có việc bận đột xuất</option>
                <option value="Đặt nhầm suất chiếu hoặc ngày chiếu">Đặt nhầm suất chiếu hoặc ngày chiếu</option>
                <option value="Đặt nhầm cụm rạp">Đặt nhầm cụm rạp</option>
                <option value="Lý do cá nhân khác">Lý do cá nhân khác</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Không, giữ vé
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelBooking}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Đang hủy...' : 'Hủy Vé Ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main E-Ticket Card */}
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden relative print:shadow-none print:border-none">
        {/* Cancelled Top Warning Banner */}
        {isCancelled && (
          <div className="bg-red-600 text-white p-3 text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
            <XCircle className="w-4 h-4" />
            <span>Đơn Đặt Vé Này Đã Bị Hủy - Đã Hoàn Tiền 100%</span>
          </div>
        )}

        {/* Top Header */}
        <div className={`text-white p-6 relative ${isCancelled ? 'bg-zinc-800' : 'bg-gradient-to-r from-[#9e001f] to-[#c8102e]'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-lg tracking-tight">HUST Cine</span>
            </div>
            {isCancelled ? (
              <span className="bg-red-500 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Đã Hủy
              </span>
            ) : (
              <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Vé Điện Tử
              </span>
            )}
          </div>

          <div className="mt-4">
            <div className="text-xs text-red-200 uppercase font-semibold">Mã Đặt Vé</div>
            <div className="font-mono text-2xl font-black tracking-wider text-white">
              {booking.bookingCode}
            </div>
          </div>
        </div>

        {/* Movie Info */}
        <div className="p-6 space-y-4">
          <div className="flex gap-4 items-start">
            {movie?.posterUrl && (
              <img
                src={movie.posterUrl}
                alt={movie?.title}
                className="w-20 h-28 object-cover rounded-xl shadow-md shrink-0 bg-gray-100"
              />
            )}
            <div className="space-y-1">
              <span className="bg-[#c8102e] text-white text-[10px] font-black px-2 py-0.5 rounded">
                {movie?.ageRating || 'P'}
              </span>
              <h2 className="font-black text-base text-gray-900 line-clamp-2 leading-snug">
                {movie?.title}
              </h2>
              <p className="text-xs text-gray-500">{movie?.durationMinutes} phút • Định dạng {showtime?.format}</p>
            </div>
          </div>

          {/* Details Table */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2.5 text-xs text-gray-600">
            <div className="flex justify-between items-start">
              <span className="text-gray-400">Rạp chiếu:</span>
              <span className="font-bold text-gray-900 text-right">{cinema?.name}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-400">Phòng chiếu:</span>
              <span className="font-bold text-gray-900 text-right">
                {auditorium?.name} ({auditorium?.type})
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-400">Suất chiếu:</span>
              <span className="font-bold text-gray-900 text-right">
                {showtime?.startAt ? formatDateTime(showtime.startAt) : ''}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-400">Ghế đã chọn:</span>
              <span className="font-black text-lg text-[#c8102e] text-right">{seatLabels}</span>
            </div>

            {bookingCombos && bookingCombos.length > 0 && (
              <div className="flex justify-between items-start pt-1 border-t border-gray-200">
                <span className="text-gray-400">Combo bắp nước:</span>
                <span className="font-semibold text-gray-800 text-right">
                  {bookingCombos.map((bc: any) => `${bc.combo?.name} (x${bc.quantity})`).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Perforated Tear Line */}
        <div className="relative flex items-center my-1">
          <div className="w-5 h-10 bg-surface-alt/70 rounded-r-full -ml-2 border-r border-gray-200" />
          <div className="flex-1 border-b-2 border-dashed border-gray-300 mx-2" />
          <div className="w-5 h-10 bg-surface-alt/70 rounded-l-full -mr-2 border-l border-gray-200" />
        </div>

        {/* QR Section for Scanner */}
        <div className="p-6 flex flex-col items-center text-center space-y-3">
          <div className="relative p-3 bg-white border-2 border-gray-200 rounded-2xl shadow-sm inline-block">
            <img
              src={qrUrl}
              alt="QR Check-in"
              className={`w-40 h-40 object-contain mx-auto transition-all ${isCancelled ? 'opacity-20 blur-[1px]' : ''}`}
            />
            {isCancelled && (
              <div className="absolute inset-0 flex items-center justify-center p-2">
                <span className="bg-red-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-lg transform -rotate-12 border-2 border-white">
                  Vé Đã Hủy
                </span>
              </div>
            )}
          </div>

          {isCancelled ? (
            <div className="text-xs text-red-600 font-bold bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
              Vé này đã bị hủy & hoàn tiền. Không thể sử dụng để soát vé vào rạp.
            </div>
          ) : booking.qrScannedAt ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Đã Soát Vé Lúc{' '}
              {new Date(booking.qrScannedAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500">
              Vui lòng đưa mã QR này cho nhân viên soát vé tại cửa phòng chiếu.
            </div>
          )}

          <div className="text-[10px] text-gray-400 font-mono truncate max-w-xs">
            Token: {qrData.substring(0, 32)}...
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
          <span>Tổng thanh toán:</span>
          <span className="font-black text-base text-gray-900">
            {formatVnd(booking.finalAmount || booking.totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
