'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import {
  Film,
  Lock,
  Mail,
  User,
  Phone,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const { login, register, quickLoginDemo } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (mode === 'REGISTER') {
      if (!fullName.trim()) {
        setErrorMsg('Vui lòng nhập họ và tên');
        return;
      }
      if (!email.trim() && !phone.trim()) {
        setErrorMsg('Vui lòng nhập email hoặc số điện thoại để đăng ký');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại!');
        return;
      }
    }

    try {
      setLoading(true);
      if (mode === 'LOGIN') {
        await login(email, password);
      } else {
        await register({
          email: email.trim() || `${phone.trim()}@user.hustcine.edu.vn`,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
          password,
        });
      }
      router.push(redirectUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || (mode === 'LOGIN' ? 'Đăng nhập không thành công' : 'Đăng ký không thành công'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER') => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await quickLoginDemo(role);
      if (role === 'ADMIN') router.push(redirectUrl !== '/' ? redirectUrl : '/admin');
      else if (role === 'STAFF') router.push(redirectUrl !== '/' ? redirectUrl : '/staff/pos');
      else router.push(redirectUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Đăng nhập demo thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt/70 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-border-subtle overflow-hidden space-y-6 p-6 sm:p-8">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#c8102e] to-[#8e0b1f] flex items-center justify-center text-white mx-auto shadow-lg shadow-red-900/30">
            <Film className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">HUST Cine</h1>
          <p className="text-xs text-gray-500">
            {mode === 'LOGIN' ? 'Đăng nhập vào tài khoản của bạn' : 'Tạo tài khoản hội viên HUST Club'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-[#c8102e] p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Switch */}
        <div className="flex border border-gray-200 rounded-2xl p-1 bg-gray-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === 'LOGIN' ? 'bg-white shadow text-[#c8102e]' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 rounded-xl transition-all ${
              mode === 'REGISTER' ? 'bg-white shadow text-[#c8102e]' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Đăng Ký Mới
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'REGISTER' && (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Họ và tên</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Nguyễn Văn A"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              {mode === 'LOGIN' ? 'Email hoặc Số điện thoại' : 'Địa chỉ Email'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={mode === 'LOGIN' ? 'text' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={mode === 'LOGIN' || !phone}
                placeholder={mode === 'LOGIN' ? 'email@hust.edu.vn hoặc 0988...' : 'email@hust.edu.vn'}
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
              />
            </div>
          </div>

          {mode === 'REGISTER' && (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Số điện thoại <span className="text-gray-400 font-normal">(nhận mã vé SMS)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0988776655"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Mật khẩu {mode === 'REGISTER' && <span className="text-gray-400 font-normal">(tối thiểu 6 ký tự)</span>}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
              />
            </div>
          </div>

          {mode === 'REGISTER' && (
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Xác nhận mật khẩu</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-extrabold text-sm shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 hover:scale-[1.02] transition-all disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Đang xử lý...' : mode === 'LOGIN' ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* 1-Click Demo Accounts Box */}
        <div className="pt-4 border-t border-gray-100 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>1-Click Đăng Nhập Tài Khoản Demo</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickLogin('ADMIN')}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-[#c8102e] hover:bg-red-50/50 text-left transition-colors font-medium text-gray-800"
            >
              <div className="font-bold text-red-700">👑 Admin</div>
              <div className="text-[10px] text-gray-400 truncate">admin@hustcine.edu.vn</div>
            </button>

            <button
              onClick={() => handleQuickLogin('STAFF')}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-[#c8102e] hover:bg-red-50/50 text-left transition-colors font-medium text-gray-800"
            >
              <div className="font-bold text-blue-700">🎫 Staff POS</div>
              <div className="text-[10px] text-gray-400 truncate">staff@hustcine.edu.vn</div>
            </button>

            <button
              onClick={() => handleQuickLogin('CUSTOMER')}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-[#c8102e] hover:bg-red-50/50 text-left transition-colors font-medium text-gray-800"
            >
              <div className="font-bold text-emerald-700">👤 Customer</div>
              <div className="text-[10px] text-gray-400 truncate">customer@hust.edu.vn</div>
            </button>

            <button
              onClick={() => handleQuickLogin('MANAGER')}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-[#c8102e] hover:bg-red-50/50 text-left transition-colors font-medium text-gray-800"
            >
              <div className="font-bold text-amber-700">🏢 Manager</div>
              <div className="text-[10px] text-gray-400 truncate">manager@hustcine.edu.vn</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-alt/70 flex items-center justify-center p-4 text-xs text-gray-500">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}
