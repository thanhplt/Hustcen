'use client';

import React from 'react';
import Link from 'next/link';
import { Tag, Sparkles, Award, Users, CheckCircle2, ArrowRight } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tight">
          Bảng Giá Vé & Chính Sách Ưu Đãi
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Hệ thống giá vé minh bạch, áp dụng phụ thu phòng chiếu và đặc quyền ưu đãi dành cho sinh viên
        </p>
      </div>

      {/* Student Highlight Banner */}
      <div className="bg-gradient-to-r from-[#8e0b1f] to-[#c8102e] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="bg-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Chương Trình Thứ 4 Bách Khoa
          </span>
          <h2 className="text-2xl font-black">Vé Sinh Viên Đồng Giá 45.000đ</h2>
          <p className="text-xs sm:text-sm text-red-100 max-w-xl">
            Áp dụng cho mọi suất chiếu 2D Tiêu Chuẩn vào thứ 4 hàng tuần. Chỉ cần xuất trình thẻ sinh viên hợp lệ khi nhận vé hoặc quét vào phòng chiếu.
          </p>
        </div>
        <Link
          href="/phim"
          className="px-6 py-3.5 rounded-2xl bg-white text-[#c8102e] font-extrabold text-xs shadow-lg hover:scale-105 transition-transform shrink-0"
        >
          Đặt Vé Hôm Nay
        </Link>
      </div>

      {/* Main Pricing Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Table 1: Standard & Formats */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-border-subtle dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#c8102e] dark:text-red-400 font-extrabold text-base border-b border-gray-100 dark:border-slate-800 pb-3">
            <Tag className="w-5 h-5" />
            <span>Giá Vé Cơ Bản Theo Định Dạng (Thứ 2 - Thứ 6)</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
            <div className="py-3 flex justify-between items-center">
              <div>
                <strong className="text-gray-900 dark:text-white block text-sm">2D Tiêu Chuẩn (Standard)</strong>
                <span className="text-gray-400 dark:text-slate-400">Suất chiếu trước 17:00</span>
              </div>
              <span className="font-mono font-black text-base text-[#c8102e] dark:text-red-400">75.000đ</span>
            </div>

            <div className="py-3 flex justify-between items-center">
              <div>
                <strong className="text-gray-900 dark:text-white block text-sm">2D Tiêu Chuẩn (Standard)</strong>
                <span className="text-gray-400 dark:text-slate-400">Suất chiếu sau 17:00 & Cuối Tuần</span>
              </div>
              <span className="font-mono font-black text-base text-[#c8102e] dark:text-red-400">95.000đ</span>
            </div>

            <div className="py-3 flex justify-between items-center">
              <div>
                <strong className="text-gray-900 dark:text-white block text-sm">3D Thực Thể</strong>
                <span className="text-gray-400 dark:text-slate-400">Kèm kính 3D khử trùng cao cấp</span>
              </div>
              <span className="font-mono font-black text-base text-[#c8102e] dark:text-red-400">115.000đ</span>
            </div>

            <div className="py-3 flex justify-between items-center">
              <div>
                <strong className="text-gray-900 dark:text-white block text-sm">IMAX Laser & Dolby Atmos</strong>
                <span className="text-gray-400 dark:text-slate-400">Màn hình cong khổng lồ, âm thanh 12 kênh</span>
              </div>
              <span className="font-mono font-black text-base text-[#c8102e] dark:text-red-400">135.000đ</span>
            </div>
          </div>
        </div>

        {/* Table 2: Seat Type Surcharges */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-border-subtle dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-extrabold text-base border-b border-gray-100 dark:border-slate-800 pb-3">
            <Award className="w-5 h-5" />
            <span>Phụ Thu Theo Loại Ghế & Phòng Chiếu</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
            <div className="py-3 flex justify-between items-center">
              <div>
                <strong className="text-gray-900 dark:text-white block text-sm">Ghế Thường (Standard)</strong>
                <span className="text-gray-400 dark:text-slate-400">Các hàng ghế A, B, C, D</span>
              </div>
              <span className="font-bold text-gray-700 dark:text-gray-300">Giá gốc</span>
            </div>

            <div className="py-3 flex justify-between items-center">
              <div>
                <strong className="text-gray-900 dark:text-white block text-sm">Ghế VIP Vàng</strong>
                <span className="text-gray-400 dark:text-slate-400">Góc nhìn trung tâm hoàn hảo (Hàng E, F, G, H)</span>
              </div>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">+15.000đ / vé</span>
            </div>

            <div className="py-3 flex justify-between items-center">
              <div>
                <strong className="text-gray-900 dark:text-white block text-sm">Ghế Đôi Sweetbox (Couple)</strong>
                <span className="text-gray-400 dark:text-slate-400">Không gian riêng tư cho 2 người (Hàng cuối)</span>
              </div>
              <span className="font-mono font-bold text-pink-600 dark:text-pink-400">x 2.0 Giá vé</span>
            </div>

            <div className="py-3 flex justify-between items-center">
              <div>
                <strong className="text-gray-900 dark:text-white block text-sm">Phòng Private Lab Toàn Phòng</strong>
                <span className="text-gray-400 dark:text-slate-400">Bao trọn gói phòng 10 chỗ ngồi cho nhóm</span>
              </div>
              <span className="font-mono font-black text-[#c8102e] dark:text-red-400">1.400.000đ / suất</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
