'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Sliders,
  Grid,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const { user, isAdmin, quickLoginDemo } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({
    bookingCutoffMinutes: '5',
    closingSoonMinutes: '15',
    cleaningBufferMinutes: '15',
    seatHoldMinutes: '10',
  });

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const res = await api.getSettings();
        if (res && typeof res === 'object') {
          const map: Record<string, string> = {};
          Object.entries(res).forEach(([k, v]) => {
            map[k] = String(v);
          });
          setSettings((prev) => ({ ...prev, ...map }));
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [user]);

  const handleUpdate = async (key: string, value: string) => {
    try {
      setSavingKey(key);
      setMessage(null);
      await api.updateSetting(key, value);
      setSettings((prev) => ({ ...prev, [key]: value }));
      setMessage({ type: 'success', text: `Đã lưu cài đặt [${key}] = ${value} thành công!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || `Lỗi khi lưu cài đặt ${key}` });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt/70 p-4 sm:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm flex items-center gap-3">
        <Link
          href="/admin"
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Cài Đặt Hệ Thống & Tham Số Vận Hành
          </h1>
          <p className="text-xs text-gray-500">
            Điều chỉnh thời gian khóa vé (cutoff), cảnh báo đóng vé và thời gian giữ chỗ
          </p>
        </div>

        {!isAdmin && (
          <button
            onClick={() => quickLoginDemo('ADMIN')}
            className="ml-auto px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-900/20"
          >
            <Sparkles className="w-4 h-4" /> Đăng Nhập Admin
          </button>
        )}
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

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Setting 1: Cutoff */}
        <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
            <Sliders className="w-4 h-4 text-[#c8102e]" />
            <h3>Khóa Đặt Vé Trước Giờ Chiếu (bookingCutoffMinutes)</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Số phút hệ thống sẽ tự động khóa tính năng đặt vé online trước khi phim bắt đầu chiếu.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <input
              type="number"
              min={0}
              max={60}
              value={settings.bookingCutoffMinutes || '5'}
              onChange={(e) => setSettings({ ...settings, bookingCutoffMinutes: e.target.value })}
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono font-bold"
            />
            <span className="text-xs font-semibold text-gray-500">phút</span>
            <button
              disabled={savingKey === 'bookingCutoffMinutes'}
              onClick={() => handleUpdate('bookingCutoffMinutes', settings.bookingCutoffMinutes)}
              className="ml-auto px-4 py-2 rounded-xl bg-[#c8102e] text-white font-bold text-xs hover:bg-[#8e0b1f] shadow-sm disabled:opacity-50"
            >
              Lưu
            </button>
          </div>
        </div>

        {/* Setting 2: Closing Soon */}
        <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
            <Sliders className="w-4 h-4 text-amber-500" />
            <h3>Cảnh Báo Sắp Đóng Đặt Vé (closingSoonMinutes)</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Khoảng thời gian kích hoạt đếm ngược khẩn cấp màu cam trước thời điểm cutoff.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <input
              type="number"
              min={1}
              max={60}
              value={settings.closingSoonMinutes || '15'}
              onChange={(e) => setSettings({ ...settings, closingSoonMinutes: e.target.value })}
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono font-bold"
            />
            <span className="text-xs font-semibold text-gray-500">phút</span>
            <button
              disabled={savingKey === 'closingSoonMinutes'}
              onClick={() => handleUpdate('closingSoonMinutes', settings.closingSoonMinutes)}
              className="ml-auto px-4 py-2 rounded-xl bg-[#c8102e] text-white font-bold text-xs hover:bg-[#8e0b1f] shadow-sm disabled:opacity-50"
            >
              Lưu
            </button>
          </div>
        </div>

        {/* Setting 3: Cleaning Buffer */}
        <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h3>Thời Gian Dọn Phòng (cleaningBufferMinutes)</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Khoảng nghỉ bắt buộc giữa 2 suất chiếu liên tiếp trong cùng một phòng chiếu.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <input
              type="number"
              min={5}
              max={60}
              value={settings.cleaningBufferMinutes || '15'}
              onChange={(e) => setSettings({ ...settings, cleaningBufferMinutes: e.target.value })}
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono font-bold"
            />
            <span className="text-xs font-semibold text-gray-500">phút</span>
            <button
              disabled={savingKey === 'cleaningBufferMinutes'}
              onClick={() => handleUpdate('cleaningBufferMinutes', settings.cleaningBufferMinutes)}
              className="ml-auto px-4 py-2 rounded-xl bg-[#c8102e] text-white font-bold text-xs hover:bg-[#8e0b1f] shadow-sm disabled:opacity-50"
            >
              Lưu
            </button>
          </div>
        </div>

        {/* Setting 4: Seat Hold */}
        <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
            <Sliders className="w-4 h-4 text-emerald-500" />
            <h3>Thời Gian Tạm Giữ Ghế (seatHoldMinutes)</h3>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed">
            Thời hạn tối đa khóa ghế tạm thời cho một giao dịch trước khi tự động giải phóng.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <input
              type="number"
              min={1}
              max={30}
              value={settings.seatHoldMinutes || '10'}
              onChange={(e) => setSettings({ ...settings, seatHoldMinutes: e.target.value })}
              className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono font-bold"
            />
            <span className="text-xs font-semibold text-gray-500">phút</span>
            <button
              disabled={savingKey === 'seatHoldMinutes'}
              onClick={() => handleUpdate('seatHoldMinutes', settings.seatHoldMinutes)}
              className="ml-auto px-4 py-2 rounded-xl bg-[#c8102e] text-white font-bold text-xs hover:bg-[#8e0b1f] shadow-sm disabled:opacity-50"
            >
              Lưu
            </button>
          </div>
        </div>
      </div>

      {/* Visual Seat Map Layout Architecture */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
          <Grid className="w-4 h-4 text-[#c8102e]" />
          <h3>Cấu Trúc Sơ Đồ Ghế Chuẩn HUST Cine</h3>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Sơ đồ phòng chiếu tiêu chuẩn 120 ghế bao gồm 108 ghế Standard + VIP, 6 ghế đôi Couple (tương đương 12 chỗ ngồi) và 2 vị trí ưu tiên cho người đi xe lăn.
        </p>

        <div className="bg-surface-alt/70 p-4 rounded-2xl flex flex-wrap items-center justify-around gap-4 text-xs font-semibold">
          <div className="text-center">
            <div className="text-base font-black text-gray-900">120</div>
            <div className="text-[11px] text-gray-400">Sức Chứa Chuẩn</div>
          </div>
          <div className="text-center">
            <div className="text-base font-black text-amber-600">40</div>
            <div className="text-[11px] text-gray-400">Ghế VIP Vàng</div>
          </div>
          <div className="text-center">
            <div className="text-base font-black text-pink-600">6 Cặp</div>
            <div className="text-[11px] text-gray-400">Ghế Đôi Sweetbox</div>
          </div>
          <div className="text-center">
            <div className="text-base font-black text-blue-600">2</div>
            <div className="text-[11px] text-gray-400">Xe Lăn Hỗ Trợ</div>
          </div>
        </div>
      </div>
    </div>
  );
}
