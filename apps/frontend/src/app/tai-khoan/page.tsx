'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Phone,
  Mail,
  Award,
  Wallet,
  Sparkles,
  Ticket,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Info,
  Edit2,
  Save,
  X,
  History,
  Film,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function CustomerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, quickLoginDemo } = useAuth();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');

  // Edit Phone Modal / State
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Cancel Ticket Modal / State
  const [ticketToCancel, setTicketToCancel] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('Tôi có việc bận đột xuất');
  const [cancelling, setCancelling] = useState(false);
  const [cancelToast, setCancelToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomerDashboard();
      setDashboardData(data);
      if (data?.profile?.phone) {
        setNewPhone(data.profile.phone);
      }
    } catch (err: any) {
      console.error('Failed to fetch customer dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchDashboard();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) {
      setPhoneMessage({ text: 'Vui lòng nhập số điện thoại', type: 'error' });
      return;
    }
    try {
      setSavingPhone(true);
      setPhoneMessage(null);
      await api.updateProfile({ phone: newPhone.trim() });
      setPhoneMessage({ text: 'Cập nhật số điện thoại thành công!', type: 'success' });
      setIsEditingPhone(false);
      fetchDashboard();
    } catch (err: any) {
      setPhoneMessage({ text: err?.message || 'Không thể cập nhật số điện thoại', type: 'error' });
    } finally {
      setSavingPhone(false);
    }
  };

  useEffect(() => {
    if (cancelToast) {
      const timer = setTimeout(() => setCancelToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [cancelToast]);

  const handleCancelBooking = async () => {
    if (!ticketToCancel) return;
    try {
      setCancelling(true);
      setCancelToast(null);
      await api.cancelBooking(ticketToCancel.id || ticketToCancel.bookingCode, cancelReason);
      setCancelToast({
        message: `Hủy vé ${ticketToCancel.bookingCode} thành công! Số tiền ${formatVnd(ticketToCancel.finalAmount)} đã được tự động hoàn lại.`,
        type: 'success',
      });
      setTicketToCancel(null);
      fetchDashboard();
    } catch (err: any) {
      setCancelToast({
        message: err?.message || 'Có lỗi xảy ra khi hủy vé. Vui lòng thử lại.',
        type: 'error',
      });
    } finally {
      setCancelling(false);
    }
  };

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${time} · ${date}`;
  };

  // If user is not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-surface-alt/70 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-border-subtle p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#c8102e] flex items-center justify-center mx-auto">
            <User className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Khu Vực Khách Hàng</h1>
            <p className="text-xs text-gray-500 mt-2">
              Vui lòng đăng nhập để xem thông tin chi tiêu, điểm thưởng tích lũy và danh sách vé phim của bạn.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/login?redirect=/tai-khoan"
              className="w-full py-3 rounded-2xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Đăng Nhập Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => quickLoginDemo('CUSTOMER')}
              className="w-full py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>1-Click Đăng Nhập Tài Khoản Customer Demo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-surface-alt/70 flex items-center justify-center p-4 text-gray-500 text-xs">
        <div className="animate-spin w-8 h-8 border-4 border-[#c8102e] border-t-transparent rounded-full mx-auto mb-2" />
        <span>Đang tải thông tin tài khoản...</span>
      </div>
    );
  }

  const profile = dashboardData?.profile || user;
  const stats = dashboardData?.stats || {
    phone: profile?.phone || 'Chưa cập nhật',
    totalSpending: 0,
    loyaltyPoints: profile?.loyaltyPoints || 0,
    pointsValueVnd: (profile?.loyaltyPoints || 0) * 1,
    upcomingCount: 0,
    pastCount: 0,
  };

  const upcomingTickets = dashboardData?.upcomingTickets || [];
  const pastTickets = dashboardData?.pastTickets || [];

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Cancellation Toast Notification */}
        {cancelToast && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between shadow-lg text-xs font-bold transition-all animate-slideDown ${
              cancelToast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {cancelToast.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{cancelToast.message}</span>
            </div>
            <button
              onClick={() => setCancelToast(null)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-gradient-to-r from-[#9e001f] via-[#c8102e] to-[#e61e38] text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white text-[#c8102e] font-black text-3xl flex items-center justify-center shadow-lg shrink-0">
                {profile?.fullName?.charAt(0) || 'H'}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile?.fullName}</h1>
                  <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md">
                    {profile?.tier?.name || 'Hội viên HUST Club'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-red-100">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-red-200" />
                    <span>{profile?.email || 'Chưa có email'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-xl">
                    <Phone className="w-3.5 h-3.5 text-red-200" />
                    <span>{profile?.phone || 'Chưa cập nhật SĐT'}</span>
                    <button
                      onClick={() => setIsEditingPhone(true)}
                      className="ml-1 hover:text-white underline text-[11px] font-bold"
                      title="Chỉnh sửa số điện thoại"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty Quick Badge */}
            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center min-w-[200px]">
              <div className="flex items-center justify-center gap-1 text-xs text-amber-200 font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Điểm Thưởng Khả Dụng</span>
              </div>
              <div className="text-3xl font-black text-white mt-1">
                {stats.loyaltyPoints.toLocaleString('vi-VN')}
              </div>
              <div className="text-[11px] text-red-100 mt-0.5">
                ≈ {formatVnd(stats.pointsValueVnd)} giá trị quy đổi
              </div>
            </div>
          </div>
        </div>

        {/* Edit Phone Modal */}
        {isEditingPhone && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#c8102e]" />
                  <span>Cập Nhật Số Điện Thoại</span>
                </h3>
                <button onClick={() => setIsEditingPhone(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdatePhone} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Số điện thoại nhận vé & tích điểm
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                    placeholder="VD: 0988776655"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#c8102e]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingPhone(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={savingPhone}
                    className="flex-1 py-2.5 rounded-xl bg-[#c8102e] text-white font-bold hover:bg-[#8e0b1f] disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingPhone ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Ticket Confirmation Modal */}
        {ticketToCancel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-red-600 font-black text-base">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span>Xác Nhận Hủy Đơn Đặt Vé</span>
                </div>
                <button
                  disabled={cancelling}
                  onClick={() => setTicketToCancel(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Movie Brief */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs">
                <div className="font-mono font-bold text-[#c8102e] text-sm">
                  {ticketToCancel.bookingCode}
                </div>
                <div className="font-bold text-gray-900 text-sm">
                  {ticketToCancel.showtime?.movie?.title}
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>{formatDateTime(ticketToCancel.showtime?.startAt)}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{ticketToCancel.showtime?.cinema?.name} ({ticketToCancel.showtime?.auditorium?.name})</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Ghế đã chọn:</span>
                  <span className="font-black text-gray-900">{ticketToCancel.seatLabels}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-gray-500 font-semibold">Số tiền hoàn lại 100%:</span>
                  <span className="font-black text-lg text-emerald-600">
                    {formatVnd(ticketToCancel.finalAmount)}
                  </span>
                </div>
              </div>

              {/* Policy alert */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Quy định hủy vé:</strong> Vé xem phim được phép hủy trước giờ chiếu tối thiểu <strong>10 phút</strong>. Khi hủy thành công, các ghế đã chọn sẽ được mở lại cho khách khác và số tiền sẽ được tự động hoàn trả.
                </div>
              </div>

              {/* Reason input */}
              <div className="space-y-1.5 text-xs">
                <label className="block font-semibold text-gray-700">Lý do hủy vé (tùy chọn):</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-800 text-xs focus:outline-none focus:border-[#c8102e]"
                >
                  <option value="Tôi có việc bận đột xuất">Tôi có việc bận đột xuất</option>
                  <option value="Đặt nhầm suất chiếu hoặc ngày chiếu">Đặt nhầm suất chiếu hoặc ngày chiếu</option>
                  <option value="Đặt nhầm cụm rạp">Đặt nhầm cụm rạp</option>
                  <option value="Muốn đổi số lượng hoặc vị trí ghế">Muốn đổi số lượng hoặc vị trí ghế</option>
                  <option value="Lý do cá nhân khác">Lý do cá nhân khác</option>
                </select>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => setTicketToCancel(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold text-xs hover:bg-gray-100 transition-colors"
                >
                  Giữ Lại Vé
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancelBooking}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {cancelling ? (
                    <>
                      <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Xác Nhận Hủy Vé</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3 Core KPI Cards + Loyalty Policy Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Số Điện Thoại */}
          <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Số Điện Thoại</span>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-[#c8102e] flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-gray-900">
                {profile?.phone || 'Chưa cập nhật'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Dùng để tra cứu vé tại rạp và nhận SMS xác nhận
              </p>
            </div>
            <button
              onClick={() => setIsEditingPhone(true)}
              className="mt-4 pt-3 border-t border-gray-100 text-xs font-bold text-[#c8102e] hover:underline flex items-center gap-1 text-left"
            >
              <span>{profile?.phone ? 'Thay đổi số điện thoại' : 'Cập nhật ngay'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 2: Tổng Chi Tiêu */}
          <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tổng Chi Tiêu</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-blue-700">
                {formatVnd(stats.totalSpending)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tích lũy từ {stats.totalBookings} đơn vé đã thanh toán
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Hạng hiện tại:</span>
              <strong className="text-gray-800 font-bold">{profile?.tier?.name || 'HUST Silver'}</strong>
            </div>
          </div>

          {/* Card 3: Điểm Thưởng Tích Lũy */}
          <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Điểm Thưởng HUST</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-black text-amber-600">
                {stats.loyaltyPoints.toLocaleString('vi-VN')} <span className="text-sm font-bold text-gray-500">Điểm</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tương đương <strong className="text-emerald-600 font-bold">{formatVnd(stats.pointsValueVnd)}</strong> tiền mặt
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Điểm thưởng không thời hạn</span>
            </div>
          </div>
        </div>

        {/* Loyalty Reward Exchange Rules Banner (Quy Định Tích Điểm) */}
        <div className="bg-gradient-to-r from-amber-500/10 via-red-500/10 to-orange-500/10 border-2 border-amber-300/60 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-[#9e001f] font-black text-base">
            <Award className="w-6 h-6 text-amber-600" />
            <span>Quy Định Tích Lũy & Đổi Điểm Thưởng HUST Cine</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Rule 1: Tích Điểm */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/60 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                  1
                </span>
                <span className="text-sm text-red-700">1.000 đồng chi tiêu = 10 điểm thưởng</span>
              </div>
              <p className="text-gray-600 leading-relaxed pl-8">
                Mỗi khi bạn thanh toán thành công vé xem phim hoặc combo bắp nước online/tại quầy, hệ thống tự động cộng <strong>10 điểm thưởng cho mỗi 1.000đ</strong> chi tiêu thực tế.
              </p>
            </div>

            {/* Rule 2: Đổi Điểm */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-amber-200/60 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-gray-900">
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px] font-black shrink-0">
                  2
                </span>
                <span className="text-sm text-emerald-700">1 điểm thưởng đổi = 1 đồng tiền</span>
              </div>
              <p className="text-gray-600 leading-relaxed pl-8">
                Bạn có thể sử dụng điểm thưởng đã tích lũy để trừ trực tiếp vào giá vé khi đặt hàng (ví dụ: <strong>50.000 điểm = 50.000đ</strong> tiền mặt) hoặc đổi các voucher bắp nước độc quyền.
              </p>
            </div>
          </div>
        </div>

        {/* Ticket Management Center (Vé Sắp Chiếu & Vé Đã Xem) */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Vé Phim Của Bạn
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Quản lý vé xem phim sắp chiếu và tra cứu lịch sử các bộ phim đã xem
              </p>
            </div>

            {/* Tab Buttons */}
            <div className="flex bg-gray-100 p-1 rounded-2xl text-xs font-bold self-start">
              <button
                onClick={() => setActiveTab('UPCOMING')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'UPCOMING'
                    ? 'bg-white text-[#c8102e] shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>Vé Sắp Chiếu ({upcomingTickets.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('PAST')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'PAST'
                    ? 'bg-white text-[#c8102e] shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Vé Đã Xem ({pastTickets.length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: UPCOMING TICKETS */}
          {activeTab === 'UPCOMING' && (
            <div>
              {upcomingTickets.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-border-subtle space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <Ticket className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Bạn chưa có vé phim nào sắp chiếu</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      Hãy chọn bộ phim bạn yêu thích và đặt vé ngay để thưởng thức những suất chiếu đỉnh cao tại HUST Cine!
                    </p>
                  </div>
                  <Link
                    href="/phim"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-extrabold text-xs shadow-md transition-all hover:scale-105"
                  >
                    <Film className="w-4 h-4" />
                    <span>Khám Phá Phim Đang Chiếu</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {upcomingTickets.map((t: any) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
                    >
                      {/* Ticket Header Banner */}
                      <div className="bg-gradient-to-r from-[#9e001f] to-[#c8102e] text-white p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm tracking-wider">{t.bookingCode}</span>
                          <span className="bg-emerald-400 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                            Sắp Chiếu
                          </span>
                        </div>
                        <span className="text-xs text-red-100 font-semibold">{t.showtime.format}</span>
                      </div>

                      {/* Ticket Body */}
                      <div className="p-5 space-y-4">
                        <div className="flex gap-4">
                          {t.showtime.movie?.posterUrl ? (
                            <img
                              src={t.showtime.movie.posterUrl}
                              alt={t.showtime.movie.title}
                              className="w-20 h-28 object-cover rounded-xl shadow-sm shrink-0 bg-gray-100"
                            />
                          ) : (
                            <div className="w-20 h-28 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                              <Film className="w-6 h-6" />
                            </div>
                          )}
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <span className="bg-[#c8102e] text-white text-[10px] font-black px-2 py-0.5 rounded">
                              {t.showtime.movie?.ageRating || 'P'}
                            </span>
                            <h3 className="font-black text-base text-gray-900 line-clamp-2 leading-snug">
                              {t.showtime.movie?.title}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Clock className="w-3.5 h-3.5 text-[#c8102e]" />
                              <span className="font-bold text-gray-900">
                                {formatDateTime(t.showtime.startAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">{t.showtime.cinema?.name}</span>
                            </div>
                          </div>
                        </div>

                        {/* Details Pill */}
                        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 space-y-1.5 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Phòng chiếu:</span>
                            <span className="font-semibold text-gray-800">
                              {t.showtime.auditorium?.name} ({t.showtime.auditorium?.type})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ghế đã chọn:</span>
                            <span className="font-black text-[#c8102e] text-sm">{t.seatLabels}</span>
                          </div>
                          {t.combos && t.combos.length > 0 && (
                            <div className="flex justify-between pt-1 border-t border-gray-200">
                              <span className="text-gray-400">Combo bắp nước:</span>
                              <span className="font-semibold text-gray-800 text-right truncate max-w-[180px]">
                                {t.combos.map((c: any) => `${c.name} (x${c.quantity})`).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Ticket Footer Action */}
                      <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] text-gray-400 block uppercase">Tổng tiền</span>
                          <span className="font-black text-base text-gray-900">{formatVnd(t.finalAmount)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {t.canCancel ? (
                            <button
                              onClick={() => setTicketToCancel(t)}
                              className="px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
                              title="Hủy vé và hoàn lại 100% tiền (tối đa trước giờ chiếu 10 phút)"
                            >
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span>Hủy Vé</span>
                            </button>
                          ) : (
                            <span
                              className="px-2.5 py-1.5 rounded-xl bg-gray-100 text-gray-400 text-[11px] font-semibold flex items-center gap-1 border border-gray-200"
                              title="Quy định chỉ cho phép hủy vé trước giờ chiếu tối thiểu 10 phút"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              <span>Sát giờ (&lt;10p)</span>
                            </span>
                          )}

                          <Link
                            href={`/ve-dien-tu/${t.bookingCode.replace('#', '')}`}
                            className="px-4 py-2 rounded-xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all hover:scale-105"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>Mở Vé & QR</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAST TICKETS (VÉ ĐÃ XEM / ĐÃ HỦY) */}
          {activeTab === 'PAST' && (
            <div>
              {pastTickets.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-border-subtle space-y-3 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                    <History className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Chưa có lịch sử vé đã xem hoặc đã hủy</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Các vé xem phim sau khi qua giờ chiếu, đã soát vé tại rạp hoặc vé đã hủy sẽ được lưu lại ở đây.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pastTickets.map((t: any) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm flex flex-col justify-between opacity-90 hover:opacity-100 transition-opacity"
                    >
                      {/* Ticket Header Banner */}
                      <div className={`p-4 flex items-center justify-between text-white ${t.isCancelled ? 'bg-rose-950/90' : 'bg-gray-800'}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-gray-200">{t.bookingCode}</span>
                          {t.isCancelled ? (
                            <span className="bg-red-500/30 text-rose-300 border border-red-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-400" /> Đã Hủy & Hoàn Tiền
                            </span>
                          ) : (
                            <span className="bg-gray-700 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Đã Xem
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{t.showtime.format}</span>
                      </div>

                      {/* Ticket Body */}
                      <div className="p-5 space-y-4">
                        <div className="flex gap-4">
                          {t.showtime.movie?.posterUrl ? (
                            <img
                              src={t.showtime.movie.posterUrl}
                              alt={t.showtime.movie.title}
                              className="w-16 h-24 object-cover rounded-xl shrink-0 grayscale hover:grayscale-0 transition-all bg-gray-100"
                            />
                          ) : (
                            <div className="w-16 h-24 bg-gray-200 rounded-xl flex items-center justify-center text-gray-400 shrink-0">
                              <Film className="w-5 h-5" />
                            </div>
                          )}
                          <div className="space-y-1 flex-1 min-w-0">
                            <h3 className="font-bold text-sm text-gray-900 line-clamp-1">
                              {t.showtime.movie?.title}
                            </h3>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>{formatDateTime(t.showtime.startAt)}</span>
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {t.showtime.cinema?.name}
                            </div>
                            <div className="text-xs font-bold text-gray-700">
                              Ghế: {t.seatLabels}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ticket Footer Action */}
                      <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          <span>Chi tiêu: </span>
                          <strong className="text-gray-900">{formatVnd(t.finalAmount)}</strong>
                        </div>
                        <Link
                          href={`/ve-dien-tu/${t.bookingCode.replace('#', '')}`}
                          className="px-3.5 py-1.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-xs flex items-center gap-1 transition-colors"
                        >
                          <span>Xem lại vé</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
