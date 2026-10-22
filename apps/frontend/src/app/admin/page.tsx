'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Film,
  Calendar,
  Settings,
  DollarSign,
  Ticket,
  TrendingUp,
  Users,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  MapPin,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, quickLoginDemo, isAdmin } = useAuth();

  const [kpis, setKpis] = useState<any>(null);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [occupancyChart, setOccupancyChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [kpiRes, revRes, occRes] = await Promise.all([
          api.getDashboardKpis().catch(() => null),
          api.getRevenueChart().catch(() => []),
          api.getOccupancyChart().catch(() => []),
        ]);
        if (kpiRes) setKpis(kpiRes);
        if (Array.isArray(revRes)) setRevenueChart(revRes);
        else if (revRes?.chart) setRevenueChart(revRes.chart);
        if (Array.isArray(occRes)) setOccupancyChart(occRes);
        else if (occRes?.occupancy) setOccupancyChart(occRes.occupancy);
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [user]);

  const formatVnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
  const formatShortVnd = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;
  const growth: number = kpis?.comparisons?.revenueGrowthPct ?? 0;
  const maxRevenue = Math.max(1, ...revenueChart.map((r) => r.revenue || 0));
  const roomTypeLabel: Record<string, string> = {
    STANDARD: 'Tiêu Chuẩn',
    GRAND: 'Grand Hall',
    IMAX: 'IMAX Laser',
    LUXURY: 'Luxury Recliner',
    PRIVATE: 'Private Lab',
  };
  const roomColors = ['bg-[#c8102e]', 'bg-amber-500', 'bg-red-500', 'bg-indigo-600', 'bg-gray-500'];

  return (
    <div className="min-h-screen bg-surface-alt/70 p-4 sm:p-8 space-y-8">
      {/* Admin Top Header & Nav */}
      <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#c8102e]" /> Cổng Quản Trị Hệ Thống HUST Cine
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Bảng Điều Khiển Tổng Quan
          </h1>
        </div>

        {/* Quick Demo Switcher if not admin */}
        {!isAdmin && (
          <button
            onClick={() => quickLoginDemo('ADMIN')}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-900/20"
          >
            <Sparkles className="w-4 h-4" /> Đăng Nhập Quyền Quản Trị Viên (Admin)
          </button>
        )}
      </div>

      {/* Admin Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Link
          href="/admin"
          className="px-5 py-2.5 rounded-2xl bg-[#c8102e] text-white font-bold text-xs shadow-md shadow-red-900/20 flex items-center gap-2 shrink-0"
        >
          <LayoutDashboard className="w-4 h-4" /> Tổng Quan
        </Link>
        <Link
          href="/admin/phim"
          className="px-5 py-2.5 rounded-2xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center gap-2 shrink-0"
        >
          <Film className="w-4 h-4" /> Quản Lý Phim & Media
        </Link>
        <Link
          href="/admin/suat-chieu"
          className="px-5 py-2.5 rounded-2xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center gap-2 shrink-0"
        >
          <Calendar className="w-4 h-4" /> Lịch Chiếu & Xung Đột
        </Link>
        <Link
          href="/admin/cai-dat"
          className="px-5 py-2.5 rounded-2xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center gap-2 shrink-0"
        >
          <Settings className="w-4 h-4" /> Cài Đặt Hệ Thống
        </Link>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Doanh Thu */}
        <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Doanh Thu Hôm Nay</span>
            <div className="p-2.5 rounded-2xl bg-red-50 text-[#c8102e]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {formatVnd(kpis?.todayRevenue ?? 0)}
          </div>
          <div
            className={`flex items-center gap-1 text-xs font-bold ${
              growth >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>
              {growth >= 0 ? '+' : ''}
              {growth.toFixed(1)}% so với hôm qua
            </span>
          </div>
        </div>

        {/* KPI 2: Vé Bán */}
        <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Số Lượng Vé Bán</span>
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
              <Ticket className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {kpis?.todayTicketsSold ?? 0} vé
          </div>
          <div className="text-xs text-gray-500 font-medium">
            {kpis?.activeMoviesCount ?? 0} phim đang chiếu • {kpis?.cinemasCount ?? 0} cụm rạp
          </div>
        </div>

        {/* KPI 3: Đơn Hàng */}
        <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Đơn Hàng Thành Công</span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {kpis?.todayBookingsCount ?? 0} đơn
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Hôm qua: {kpis?.comparisons?.yesterdayBookingsCount ?? 0} đơn
          </div>
        </div>

        {/* KPI 4: Tỷ lệ lấp đầy */}
        <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Tỷ Lệ Lấp Đầy (Occupancy)</span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900">
            {(kpis?.occupancyRate ?? 0).toFixed(1)}%
          </div>
          <div className="text-xs text-amber-600 font-bold">Trên tổng ghế các suất hôm nay</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 7-Day Revenue Trend */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-gray-900">Biểu Đồ Doanh Thu 7 Ngày</h3>
              <p className="text-xs text-gray-500">Doanh thu bán vé và combo bắp nước</p>
            </div>
            <span className="text-xs font-bold text-[#c8102e] bg-red-50 px-3 py-1 rounded-full">
              Tuần Hiện Tại
            </span>
          </div>

          {/* Bar Chart Simulation */}
          <div className="h-64 flex items-end gap-3 pt-6 border-b border-gray-100 pb-2">
            {revenueChart.length === 0 && !loading && (
              <div className="w-full text-center text-xs text-gray-400 self-center">Chưa có dữ liệu doanh thu</div>
            )}
            {revenueChart.map((r) => {
              const d = new Date(r.date);
              const label = isNaN(d.getTime())
                ? String(r.date)
                : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
              const pct = Math.max(2, Math.round(((r.revenue || 0) / maxRevenue) * 100));
              return (
                <div key={String(r.date)} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[10px] font-bold text-gray-400 group-hover:text-red-600 transition-colors">
                    {formatShortVnd(r.revenue || 0)}
                  </div>
                  <div
                    style={{ height: `${pct}%` }}
                    title={`${formatVnd(r.revenue || 0)} • ${r.ticketsCount ?? 0} vé`}
                    className="w-full bg-gradient-to-t from-[#8e0b1f] to-[#c8102e] rounded-t-xl group-hover:brightness-110 transition-all shadow-sm"
                  />
                  <div className="text-xs font-semibold text-gray-600 truncate">{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Occupancy by Room Type */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-gray-900">Tỷ Lệ Lấp Đầy Theo Phòng Chiếu</h3>
              <p className="text-xs text-gray-500">Phân bố hiệu suất 5 loại phòng chiếu</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {occupancyChart.length === 0 && !loading && (
              <div className="text-center text-xs text-gray-400 py-6">Chưa có dữ liệu lấp đầy</div>
            )}
            {occupancyChart.map((o, idx) => {
              const rate = Math.min(100, Math.max(0, Number(o.occupancyRate) || 0));
              return (
                <div key={o.roomType} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-800">
                      {roomTypeLabel[o.roomType] || o.roomType}{' '}
                      <span className="text-gray-400 font-normal">
                        ({o.soldSeats ?? 0}/{o.totalSeatsOffered ?? 0} ghế)
                      </span>
                    </span>
                    <span className="font-bold text-gray-900">{rate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${rate}%` }}
                      className={`h-full ${roomColors[idx % roomColors.length]} rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
