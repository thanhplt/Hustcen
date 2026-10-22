'use client';

import React from 'react';
import Link from 'next/link';
import { Film, Phone, Mail, MapPin, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#121216] text-gray-300 pt-16 pb-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-gray-800">
          {/* Brand Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c8102e] to-[#8e0b1f] flex items-center justify-center text-white shadow-lg shadow-red-900/30">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight text-white">HUST</span>
                <span className="font-bold text-2xl tracking-tight text-[#fd6166]"> Cine</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Hệ thống rạp chiếu phim hiện đại chuẩn công nghệ, phục vụ cộng đồng sinh viên, giảng viên và khán giả yêu điện ảnh tại Hà Nội.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-lg w-fit">
              <ShieldCheck className="w-4 h-4" />
              Hệ thống Zero Double-Booking
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Khám Phá</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li>
                <Link href="/phim" className="hover:text-white transition-colors">
                  Phim Đang Chiếu
                </Link>
              </li>
              <li>
                <Link href="/phim?status=COMING_SOON" className="hover:text-white transition-colors">
                  Phim Sắp Chiếu
                </Link>
              </li>
              <li>
                <Link href="/cum-rap" className="hover:text-white transition-colors">
                  Hệ Thống Cụm Rạp
                </Link>
              </li>
              <li>
                <Link href="/gia-ve" className="hover:text-white transition-colors">
                  Bảng Giá Vé & Ưu Đãi Sinh Viên
                </Link>
              </li>
            </ul>
          </div>

          {/* Cinemas List */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Cụm Rạp Hà Nội</h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>HUST Cine Đại Cồ Việt (Tòa nhà C2, Bách Khoa)</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>HUST Cine Giải Phóng</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>HUST Cine Trần Đại Nghĩa</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <span>HUST Cine Tạ Quang Bửu</span>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 className="text-white font-bold text-sm tracking-wider uppercase mb-4">Chăm Sóc Khách Hàng</h4>
            <div className="space-y-3 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-400" />
                <span className="font-bold text-white text-sm">1900 1234 (1.000đ/phút)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-400" />
                <span>support@hustcine.edu.vn</span>
              </div>
              <p className="text-[11px] text-gray-500 pt-2">
                Thời gian làm việc: 08:00 - 23:00 hàng ngày (kể cả Lễ, Tết)
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 gap-4">
          <div>
            © {new Date().getFullYear()} HUST Cine. Bản quyền thuộc về Hệ thống Đặt vé Xem phim HUST Cine.
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <span>Phát triển với</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 inline" />
            <span>dành cho giảng viên và sinh viên Bách Khoa</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
