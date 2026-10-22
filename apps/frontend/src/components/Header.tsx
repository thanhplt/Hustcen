'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { useClock } from '../context/ClockContext';
import {
  Film,
  Clock,
  Globe,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  ScanLine,
  Receipt,
  Ticket,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { user, logout, quickLoginDemo, isAdmin, isStaff } = useAuth();
  const { lang, toggleLang, t } = useLang();
  const { displayHeader, isSimulated } = useClock();
  const [userDropdown, setUserDropdown] = useState(false);

  const navLinks = [
    { href: '/', label: t('nav_home') },
    { href: '/phim', label: t('nav_movies') },
    { href: '/cum-rap', label: t('nav_cinemas') },
    { href: '/gia-ve', label: t('nav_prices') },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border-subtle shadow-sm">
      {/* Top Utility Bar: Clock & Dev Quick Links */}
      <div className="bg-[#1A1A1F] text-white text-xs py-1.5 px-4 sm:px-8 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Clock className={`w-3.5 h-3.5 ${isSimulated ? 'text-amber-400 animate-pulse' : 'text-red-400'}`} />
          <span className="font-mono text-gray-200">{displayHeader}</span>
          {isSimulated && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded text-[10px] font-semibold">
              SIMULATED CLOCK
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 hover:text-red-300 font-semibold transition-colors"
            title="Đổi ngôn ngữ VI / EN"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang}</span>
          </button>

          {isStaff && (
            <Link
              href="/staff/pos"
              className="text-gray-300 hover:text-white flex items-center gap-1 font-medium hover:underline"
            >
              <Receipt className="w-3 h-3 text-red-400" /> POS
            </Link>
          )}

          {isStaff && (
            <Link
              href="/staff/scanner"
              className="text-gray-300 hover:text-white flex items-center gap-1 font-medium hover:underline"
            >
              <ScanLine className="w-3 h-3 text-red-400" /> Soát Vé
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/admin"
              className="text-amber-300 hover:text-amber-200 flex items-center gap-1 font-semibold hover:underline"
            >
              <LayoutDashboard className="w-3 h-3" /> Admin
            </Link>
          )}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Brand Wordmark */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#c8102e] to-[#8e0b1f] flex items-center justify-center text-white shadow-md shadow-red-900/20 group-hover:scale-105 transition-transform">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-[#c8102e]">HUST</span>
              <span className="font-bold text-xl tracking-tight text-gray-900">Cine</span>
            </div>
            <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">
              {t('brand_sub')}
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 font-medium text-sm">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors py-1 border-b-2 ${
                  active
                    ? 'text-[#c8102e] border-[#c8102e] font-semibold'
                    : 'text-gray-700 border-transparent hover:text-[#c8102e]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User / Auth Menu */}
        <div className="relative">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border-subtle hover:bg-surface-alt transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-red-100 text-[#c8102e] font-bold text-xs flex items-center justify-center">
                  {user.fullName.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-gray-900 line-clamp-1">{user.fullName}</div>
                  <div className="text-[10px] text-gray-500">{user.role}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              {userDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 text-sm">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="font-semibold text-gray-900">{user.fullName}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>

                  <Link
                    href="/tai-khoan"
                    onClick={() => setUserDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-gray-700 hover:text-[#c8102e]"
                  >
                    <UserIcon className="w-4 h-4" /> Tài Khoản & Điểm Thưởng
                  </Link>

                  <Link
                    href="/tai-khoan"
                    onClick={() => setUserDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-gray-700 hover:text-[#c8102e]"
                  >
                    <Ticket className="w-4 h-4" /> Vé Phim Của Tôi
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setUserDropdown(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-gray-700 hover:text-[#c8102e]"
                    >
                      <LayoutDashboard className="w-4 h-4" /> Bảng Điều Khiển Admin
                    </Link>
                  )}

                  {isStaff && (
                    <>
                      <Link
                        href="/staff/pos"
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-gray-700 hover:text-[#c8102e]"
                      >
                        <Receipt className="w-4 h-4" /> Bán Vé POS
                      </Link>
                      <Link
                        href="/staff/scanner"
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-gray-700 hover:text-[#c8102e]"
                      >
                        <ScanLine className="w-4 h-4" /> Soát Vé QR
                      </Link>
                    </>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      setUserDropdown(false);
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1"
                  >
                    <LogOut className="w-4 h-4" /> {t('logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-4 py-2 rounded-lg bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-semibold text-sm shadow-sm transition-all hover:shadow"
              >
                {t('login')}
              </Link>

              {/* Quick Demo Accounts Switcher */}
              <div className="relative group">
                <button
                  className="p-2 rounded-lg border border-border-subtle hover:bg-surface-alt text-gray-600 hover:text-[#c8102e] transition-colors"
                  title="Đăng nhập tài khoản demo nhanh"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-2 hidden group-hover:block z-50">
                  <div className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">
                    Đăng Nhập Nhanh Demo
                  </div>
                  <button
                    onClick={() => quickLoginDemo('ADMIN')}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-red-50 rounded text-gray-800 font-medium hover:text-[#c8102e]"
                  >
                    👑 Quản Trị Viên (Admin)
                  </button>
                  <button
                    onClick={() => quickLoginDemo('STAFF')}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-red-50 rounded text-gray-800 font-medium hover:text-[#c8102e]"
                  >
                    🎫 Nhân Viên POS (Staff)
                  </button>
                  <button
                    onClick={() => quickLoginDemo('CUSTOMER')}
                    className="w-full text-left px-2 py-1.5 text-xs hover:bg-red-50 rounded text-gray-800 font-medium hover:text-[#c8102e]"
                  >
                    👤 Khách Hàng (Customer)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
