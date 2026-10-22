'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Building,
} from 'lucide-react';

function MockPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const transactionRef = searchParams.get('ref') || `MOCK_${Date.now()}`;
  const bookingId = searchParams.get('bookingId') || '';
  const rawCode = searchParams.get('code') || '';
  const bookingCode = rawCode
    ? (rawCode.startsWith('#') ? rawCode : `#${rawCode}`)
    : (bookingId || '#HUST-DEMO-001');
  const amountStr = searchParams.get('amount') || '0';
  const amount = parseInt(amountStr, 10);

  const [loading, setLoading] = useState(false);
  const [resultState, setResultState] = useState<'IDLE' | 'SUCCESS' | 'FAILED' | 'CANCELLED'>('IDLE');
  const [secondsLeft, setSecondsLeft] = useState(900); // 15 minutes timer

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (status: 'SUCCESS' | 'FAILED' | 'CANCELLED') => {
    try {
      setLoading(true);
      await api.mockPaymentProcess({
        transactionRef,
        status,
      });

      setResultState(status);

      if (status === 'SUCCESS') {
        setTimeout(() => {
          const target = bookingId || bookingCode.replace('#', '');
          router.push(`/ve-dien-tu/${target}`);
        }, 1200);
      }
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi gửi webhook thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const formatVnd = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
  };

  const formatTimer = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-surface-alt/70 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-border-subtle overflow-hidden">
        {/* Gateway Brand Header */}
        <div className="bg-[#121216] text-white p-6 text-center relative">
          <div className="w-12 h-12 bg-red-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-red-900/50 mb-3">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">HUST Pay Sandbox</h1>
          <p className="text-xs text-gray-400 mt-1">Cổng thanh toán giả lập dành cho phát triển & thử nghiệm</p>

          {/* Timer Pill */}
          <div className="mt-4 inline-flex items-center gap-1.5 bg-gray-800/80 border border-gray-700 px-3 py-1 rounded-full text-xs text-amber-300 font-mono font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span>Hết hạn sau: {formatTimer(secondsLeft)}</span>
          </div>
        </div>

        {/* Transaction Info Box */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Mã đơn hàng:</span>
              <span className="font-mono font-bold text-gray-900">{bookingCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Mã tham chiếu GD:</span>
              <span className="font-mono text-gray-700 truncate max-w-[180px]">{transactionRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Đơn vị thụ hưởng:</span>
              <span className="font-semibold text-gray-900">HUST Cine Hà Nội</span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
              <span className="font-bold text-gray-700">Số tiền thanh toán:</span>
              <span className="text-xl font-black text-[#c8102e]">{formatVnd(amount)}</span>
            </div>
          </div>

          {/* Action Results */}
          {resultState === 'SUCCESS' && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <div className="font-bold text-sm">Thanh toán thành công!</div>
              <div className="text-xs text-emerald-600">Đang chuyển đến trang vé điện tử...</div>
            </div>
          )}

          {resultState === 'FAILED' && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-2xl text-center space-y-1">
              <XCircle className="w-8 h-8 text-red-600 mx-auto" />
              <div className="font-bold text-sm">Giao dịch thanh toán thất bại</div>
              <div className="text-xs text-red-600">Thẻ hoặc tài khoản bị từ chối. Vui lòng thử lại.</div>
            </div>
          )}

          {resultState === 'CANCELLED' && (
            <div className="bg-gray-100 border border-gray-200 text-gray-700 p-4 rounded-2xl text-center space-y-1">
              <AlertTriangle className="w-8 h-8 text-gray-500 mx-auto" />
              <div className="font-bold text-sm">Bạn đã hủy giao dịch</div>
              <div className="text-xs text-gray-500">Ghế đã được tự động mở lại cho khán giả khác.</div>
            </div>
          )}

          {/* Simulation Trigger Buttons */}
          {resultState === 'IDLE' && (
            <div className="space-y-3 pt-2">
              <button
                disabled={loading}
                onClick={() => handleAction('SUCCESS')}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Xác Nhận Thanh Toán Thành Công</span>
              </button>

              <button
                disabled={loading}
                onClick={() => handleAction('FAILED')}
                className="w-full py-3 rounded-2xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs transition-colors disabled:opacity-50"
              >
                Giả Lập Thanh Toán Thất Bại
              </button>

              <button
                disabled={loading}
                onClick={() => handleAction('CANCELLED')}
                className="w-full py-2.5 rounded-2xl text-gray-500 hover:text-gray-800 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                Hủy Bỏ Giao Dịch
              </button>
            </div>
          )}

          {resultState !== 'IDLE' && resultState !== 'SUCCESS' && (
            <button
              onClick={() => router.push('/')}
              className="w-full py-3 rounded-2xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 transition-colors"
            >
              Quay Về Trang Chủ
            </button>
          )}
        </div>

        <div className="bg-gray-50 p-4 border-t border-gray-100 text-center text-[11px] text-gray-400">
          Giao dịch được bảo mật với chữ ký HMAC-SHA256 theo chuẩn bảo mật HUST Cine
        </div>
      </div>
    </div>
  );
}

export default function MockPaymentPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-surface-alt/70 flex items-center justify-center p-4">
          <div className="p-8 bg-white rounded-3xl text-center text-xs text-gray-500 font-semibold shadow-md">
            Đang tải cổng thanh toán HUST Pay...
          </div>
        </div>
      }
    >
      <MockPaymentContent />
    </React.Suspense>
  );
}
