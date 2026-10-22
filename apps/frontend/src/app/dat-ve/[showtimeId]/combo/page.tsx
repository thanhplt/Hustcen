'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { Combo, Showtime, PriceBreakdown } from '../../../../types';
import {
  Coffee,
  Ticket,
  ChevronLeft,
  Plus,
  Minus,
  Tag,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  QrCode,
} from 'lucide-react';

export default function ComboAndCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const showtimeId = params.showtimeId as string;
  const { user } = useAuth();

  const [showtime, setShowtime] = useState<Showtime | null>(null);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboQuantities, setComboQuantities] = useState<Record<string, number>>({});
  const [voucherCode, setVoucherCode] = useState('');
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);

  // Customer Contact Info
  const [customerName, setCustomerName] = useState(user?.fullName || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<'MOCK' | 'VNPAY' | 'MOMO'>('MOCK');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Retrieve held seats from sessionStorage
  const [heldSeatIds, setHeldSeatIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('hustcine_held_seat_ids');
      if (stored) {
        try {
          setHeldSeatIds(JSON.parse(stored));
        } catch {}
      }
    }
  }, []);

  // Fetch showtime and combos
  useEffect(() => {
    if (!showtimeId) return;
    async function loadData() {
      try {
        setLoading(true);
        const [stData, combosData] = await Promise.all([
          api.getShowtimeById(showtimeId),
          api.getCombos(),
        ]);
        setShowtime(stData);
        if (Array.isArray(combosData)) {
          setCombos(combosData);
        }
      } catch (err: any) {
        setErrorMsg(err?.message || 'Không thể tải dữ liệu bắp nước');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [showtimeId]);

  // Sync user info if logged in
  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.fullName);
      if (!customerEmail) setCustomerEmail(user.email);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
    }
  }, [user]);

  // Recalculate price whenever combos or voucher changes
  useEffect(() => {
    if (!showtimeId || heldSeatIds.length === 0) return;

    const comboItems = Object.entries(comboQuantities)
      .filter(([_, q]) => q > 0)
      .map(([comboId, quantity]) => ({ comboId, quantity }));

    api
      .calculatePrice({
        showtimeId,
        seatIds: heldSeatIds,
        combos: comboItems,
        voucherCode: voucherCode.trim() || undefined,
      })
      .then((res) => {
        setPriceBreakdown(res);
        setErrorMsg(null);
      })
      .catch((err) => {
        // if voucher error, just don't apply
      });
  }, [showtimeId, heldSeatIds, comboQuantities, voucherCode]);

  const updateQuantity = (comboId: string, delta: number) => {
    setComboQuantities((prev) => {
      const cur = prev[comboId] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [comboId]: next };
    });
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/dat-ve/${showtimeId}/combo`);
      return;
    }

    if (heldSeatIds.length === 0) {
      setErrorMsg('Không tìm thấy danh sách ghế giữ. Vui lòng quay lại chọn ghế.');
      return;
    }
    if (!customerEmail.trim()) {
      setErrorMsg('Vui lòng nhập email nhận vé điện tử.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const comboItems = Object.entries(comboQuantities)
        .filter(([_, q]) => q > 0)
        .map(([comboId, quantity]) => ({ comboId, quantity }));

      // 1. Create Booking
      const bookingRes = await api.createBooking({
        showtimeId,
        seatIds: heldSeatIds,
        combos: comboItems,
        voucherCode: voucherCode.trim() || undefined,
        guestName: customerName.trim() || undefined,
        guestEmail: customerEmail.trim(),
        guestPhone: customerPhone.trim() || undefined,
      });

      if (!bookingRes?.id) {
        throw new Error('Tạo đơn đặt vé thất bại');
      }

      // 2. Create Payment Intent
      const intentRes = await api.createPaymentIntent(bookingRes.id, paymentMethod);

      // 3. Redirect to Mock Gateway
      const ref = intentRes?.transactionRef || `MOCK_${Date.now()}`;
      const amount = bookingRes.finalAmount ?? bookingRes.totalAmount;
      const cleanCode = (bookingRes.bookingCode || '').replace(/^#/, '');

      const q = new URLSearchParams({
        ref,
        code: cleanCode,
        bookingId: bookingRes.id,
        amount: String(amount || 0),
      });

      router.push(`/thanh-toan/mock?${q.toString()}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  if (loading && !showtime) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-[#c8102e] border-t-transparent rounded-full mx-auto mb-4" />
        Đang tải thông tin combo bắp nước...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-border-subtle shadow-sm">
        <Link
          href={`/dat-ve/${showtimeId}`}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <div className="text-xs font-bold text-gray-500">Bước 2/3: Combo & Thanh Toán</div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            {showtime?.movie?.title}
          </h1>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-[#c8102e] px-5 py-3.5 rounded-2xl flex items-center gap-3 text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Combo Selection & Payment Options */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Combos List */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <Coffee className="w-5 h-5 text-[#c8102e]" />
              <h2 className="text-lg font-bold text-gray-900">Chọn Combo Bắp Nước Ưu Đãi</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {combos.map((combo) => {
                const qty = comboQuantities[combo.id] || 0;
                return (
                  <div
                    key={combo.id}
                    className="flex flex-col justify-between p-4 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all bg-surface-alt/50"
                  >
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{combo.name}</div>
                      {combo.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{combo.description}</p>
                      )}
                      <div className="text-[#c8102e] font-extrabold text-sm mt-2">
                        {formatVnd(combo.price)}
                      </div>
                    </div>

                    {/* Counter Buttons */}
                    <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => updateQuantity(combo.id, -1)}
                        disabled={qty <= 0}
                        className="w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm text-gray-900 w-6 text-center">{qty}</span>
                      <button
                        onClick={() => updateQuantity(combo.id, 1)}
                        className="w-8 h-8 rounded-lg bg-[#c8102e] text-white flex items-center justify-center hover:bg-[#8e0b1f] shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Customer Contact Info */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">
              Thông Tin Nhận Vé Điện Tử
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#c8102e]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Email nhận vé <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="student@hust.edu.vn"
                  required
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#c8102e]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-gray-700 mb-1.5">Số điện thoại</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#c8102e]"
                />
              </div>
            </div>
          </div>

          {/* 3. Payment Method Selection */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
              <CreditCard className="w-5 h-5 text-[#c8102e]" />
              <h2 className="text-lg font-bold text-gray-900">Phương Thức Thanh Toán</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('MOCK')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  paymentMethod === 'MOCK'
                    ? 'border-[#c8102e] bg-red-50/50 ring-2 ring-[#c8102e]/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-sm text-gray-900">Mock Gateway</div>
                <div className="text-[11px] text-gray-500 mt-1">Cổng thanh toán thử nghiệm (Instant)</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('VNPAY')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  paymentMethod === 'VNPAY'
                    ? 'border-[#c8102e] bg-red-50/50 ring-2 ring-[#c8102e]/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-sm text-gray-900">VNPAY QR</div>
                <div className="text-[11px] text-gray-500 mt-1">Quét mã VNPAY qua app ngân hàng</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('MOMO')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  paymentMethod === 'MOMO'
                    ? 'border-[#c8102e] bg-red-50/50 ring-2 ring-[#c8102e]/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-sm text-gray-900">Ví MoMo</div>
                <div className="text-[11px] text-gray-500 mt-1">Thanh toán tức thời qua MoMo</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Price Breakdown & Checkout Action */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-6 sticky top-24">
            <h3 className="font-extrabold text-base text-gray-900 border-b border-gray-100 pb-3">
              Tóm Tắt Đơn Vé
            </h3>

            {/* Voucher Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-red-500" /> Mã Giảm Giá / Voucher
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="VD: HUST50"
                  className="flex-1 uppercase border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold focus:outline-none focus:border-[#c8102e]"
                />
              </div>
            </div>

            {/* Price Lines */}
            <div className="space-y-2.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
              <div className="flex justify-between">
                <span>Tiền vé ({heldSeatIds.length} ghế)</span>
                <span className="font-semibold text-gray-900">
                  {formatVnd(priceBreakdown?.subtotalSeats || 0)}
                </span>
              </div>

              {priceBreakdown?.subtotalCombos ? (
                <div className="flex justify-between">
                  <span>Combo bắp nước</span>
                  <span className="font-semibold text-gray-900">
                    {formatVnd(priceBreakdown.subtotalCombos)}
                  </span>
                </div>
              ) : null}

              {priceBreakdown?.discountAmount ? (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Giảm giá ({voucherCode})</span>
                  <span>-{formatVnd(priceBreakdown.discountAmount)}</span>
                </div>
              ) : null}

              <div className="pt-3 border-t border-gray-200 flex justify-between items-end">
                <div>
                  <span className="block text-xs font-semibold text-gray-500 uppercase">
                    Tổng Thanh Toán
                  </span>
                  <span className="text-2xl font-black text-[#c8102e]">
                    {formatVnd(
                      priceBreakdown?.finalAmount ??
                      priceBreakdown?.totalAmount ??
                      Math.max(
                        0,
                        (priceBreakdown?.subtotalSeats || 0) +
                        (priceBreakdown?.subtotalCombos || 0) -
                        (priceBreakdown?.discountAmount || 0)
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Confirm Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={submitting || heldSeatIds.length === 0}
              className="w-full py-4 rounded-2xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-extrabold text-sm shadow-xl shadow-red-900/30 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50"
            >
              {submitting ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>Xác Nhận & Thanh Toán</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
