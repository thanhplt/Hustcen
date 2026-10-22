'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Camera,
  Film,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function TicketScannerPage() {
  const { user, quickLoginDemo } = useAuth();

  const [inputToken, setInputToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const loadHistory = async () => {
    try {
      const res = await api.getScanHistory();
      if (Array.isArray(res)) setScanHistory(res);
      else if (Array.isArray(res?.items)) setScanHistory(res.items);
    } catch {}
  };

  const handleScan = async (tokenToScan?: string) => {
    const target = tokenToScan || inputToken.trim();
    if (!target) return;

    try {
      setLoading(true);
      const res = await api.scanTicket(target);
      setScanResult({
        success: true,
        data: res,
      });
      setInputToken('');
      loadHistory();
    } catch (err: any) {
      setScanResult({
        success: false,
        error: err?.message || 'Không thể xác thực mã vé',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt/70 p-4 sm:p-8 space-y-8 max-w-4xl mx-auto">
      {/* Scanner Header */}
      <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#c8102e] text-white rounded-2xl shadow-md">
            <ScanLine className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">
              Hệ Thống Soát Vé QR Cửa Phòng Chiếu
            </h1>
            <p className="text-xs text-gray-500">
              Nhân viên soát vé: <strong>{user?.fullName || 'Soát vé viên'}</strong>
            </p>
          </div>
        </div>

        {!user && (
          <button
            onClick={() => quickLoginDemo('STAFF')}
            className="px-3 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" /> Đăng Nhập Quyền Staff
          </button>
        )}
      </div>

      {/* Main Scanner Input Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-sm space-y-6">
        <div className="text-center max-w-md mx-auto space-y-2">
          <div className="w-16 h-16 bg-red-50 text-[#c8102e] rounded-3xl flex items-center justify-center mx-auto mb-3">
            <Camera className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Quét Mã QR Vé Điện Tử</h2>
          <p className="text-xs text-gray-500">
            Sử dụng máy quét mã vạch 2D hoặc dán trực tiếp token / mã vé từ khách hàng
          </p>
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
          className="max-w-lg mx-auto flex gap-2"
        >
          <input
            type="text"
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            placeholder="Dán mã QR Token hoặc Mã đơn (#HUST-XXXX)"
            autoFocus
            className="flex-1 border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#c8102e]"
          />
          <button
            type="submit"
            disabled={loading || !inputToken.trim()}
            className="px-6 py-3 rounded-2xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span>Soát Vé</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Scan Result Feedback Card */}
        {scanResult && (
          <div
            className={`max-w-lg mx-auto p-6 rounded-3xl border-2 text-center space-y-4 animate-in fade-in duration-200 ${
              scanResult.success
                ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                : 'bg-red-50 border-red-400 text-red-900'
            }`}
          >
            {scanResult.success ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                    HỢP LỆ - XÁC NHẬN VÀO PHÒNG CHIẾU
                  </div>
                  <h3 className="text-lg font-black text-emerald-950 mt-1">
                    {scanResult.data?.movieTitle || 'Vé HUST Cine'}
                  </h3>
                </div>

                <div className="bg-white/80 rounded-2xl p-4 border border-emerald-200 text-xs text-left space-y-1.5 font-medium">
                  <div>
                    <span className="text-gray-500">Mã đơn hàng:</span>{' '}
                    <strong className="text-emerald-900">{scanResult.data?.bookingCode}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Phòng chiếu:</span>{' '}
                    <strong>
                      {scanResult.data?.cinemaName} • {scanResult.data?.auditoriumName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Khách hàng:</span>{' '}
                    <strong>{scanResult.data?.customerName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Ghế:</span>{' '}
                    <strong className="text-red-700 text-base">
                      {Array.isArray(scanResult.data?.seats)
                        ? scanResult.data.seats.join(', ')
                        : scanResult.data?.seats}
                    </strong>
                  </div>
                  {scanResult.data?.combos && scanResult.data.combos.length > 0 && (
                    <div className="text-amber-700 font-semibold pt-1 border-t border-emerald-100">
                      🍿 Nhận bắp nước: {scanResult.data.combos.join(', ')}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-12 h-12 text-red-600 mx-auto" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-red-600">
                    CẢNH BÁO - VÉ KHÔNG HỢP LỆ
                  </div>
                  <h3 className="text-base font-extrabold text-red-950 mt-1">
                    {scanResult.error}
                  </h3>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recent Scan History */}
      <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
          <History className="w-4 h-4 text-[#c8102e]" />
          <span>Lịch Sử Soát Vé Gần Đây</span>
        </div>

        {scanHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase">
                  <th className="py-2.5">Thời Gian</th>
                  <th>Mã Đơn</th>
                  <th>Phim</th>
                  <th>Ghế</th>
                  <th>Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {scanHistory.map((h, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 font-mono text-gray-500">
                      {new Date(h.scannedAt || Date.now()).toLocaleTimeString('vi-VN')}
                    </td>
                    <td className="font-mono font-bold text-gray-900">{h.bookingCode}</td>
                    <td className="font-semibold line-clamp-1">{h.movieTitle}</td>
                    <td className="font-bold text-[#c8102e]">
                      {Array.isArray(h.seats) ? h.seats.join(', ') : h.seats}
                    </td>
                    <td>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        ĐÃ VÀO PHÒNG
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-gray-400">
            Chưa có lượt soát vé nào trong ca làm việc này.
          </div>
        )}
      </div>
    </div>
  );
}
