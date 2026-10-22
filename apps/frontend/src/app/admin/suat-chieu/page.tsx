'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Showtime, Cinema, Movie } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import {
  Calendar,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  X,
  Repeat,
  MapPin,
  Film,
  Sparkles,
} from 'lucide-react';

export default function AdminShowtimesPage() {
  const { user, isAdmin, quickLoginDemo } = useAuth();
  const [showtimes, setShowtimes] = useState<any[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Single Showtime Form
  const [movieId, setMovieId] = useState('');
  const [cinemaId, setCinemaId] = useState('');
  const [auditoriumId, setAuditoriumId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [basePrice, setBasePrice] = useState(95000);
  const [format, setFormat] = useState('2D');

  // Series Form
  const [seriesDays, setSeriesDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [seriesStartDate, setSeriesStartDate] = useState('');
  const [seriesEndDate, setSeriesEndDate] = useState('');
  const [seriesTime, setSeriesTime] = useState('10:00');

  useEffect(() => {
    loadAll();
  }, [user]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [cinRes, movRes, stRes] = await Promise.all([
        api.getCinemas(),
        api.getMovies(),
        api.getAdminShowtimes({ take: 50 }).catch(() => ({ showtimes: [] })),
      ]);

      if (Array.isArray(cinRes)) {
        setCinemas(cinRes);
        if (cinRes.length > 0) setCinemaId(cinRes[0].id);
      }
      const mList: Movie[] = Array.isArray(movRes) ? movRes : movRes?.items || movRes?.movies || [];
      setMovies(mList);
      if (mList.length > 0) setMovieId(mList[0].id);

      if (Array.isArray(stRes?.items)) setShowtimes(stRes.items);
      else if (stRes?.showtimes) setShowtimes(stRes.showtimes);
      else if (Array.isArray(stRes)) setShowtimes(stRes);
    } catch (err) {
      console.error('Failed to load showtimes', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedCinemaObj = cinemas.find((c) => c.id === cinemaId);
  const auditoriums = selectedCinemaObj?.auditoriums || [];

  useEffect(() => {
    if (auditoriums.length > 0 && !auditoriumId) {
      setAuditoriumId(auditoriums[0].id);
    }
  }, [cinemaId, auditoriums, auditoriumId]);

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      await api.createShowtime({
        movieId,
        cinemaId,
        auditoriumId,
        startAt: new Date(startAt).toISOString(),
        basePrice: Number(basePrice),
        format,
      });

      setMessage({ type: 'success', text: 'Tạo suất chiếu thành công! Đã tạo đầy đủ sơ đồ ghế.' });
      setShowCreateModal(false);
      loadAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Xung đột phòng chiếu hoặc buffer 15m' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      await api.createShowtimeSeries({
        movieId,
        cinemaId,
        auditoriumId,
        time: seriesTime,
        startDate: seriesStartDate,
        endDate: seriesEndDate,
        daysOfWeek: seriesDays,
        basePrice: Number(basePrice),
        format,
      });

      setMessage({ type: 'success', text: 'Tạo chuỗi suất chiếu định kỳ thành công!' });
      setShowSeriesModal(false);
      loadAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi tạo chuỗi suất chiếu' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelShowtime = async (id: string) => {
    const reason = prompt('Nhập lý do hủy suất chiếu (sẽ tự động hoàn tiền cho khách hàng đã mua vé):');
    if (!reason) return;

    try {
      setLoading(true);
      await api.cancelShowtime(id, reason);
      setMessage({ type: 'success', text: 'Đã hủy suất chiếu và gửi thông báo hoàn tiền!' });
      loadAll();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi hủy suất chiếu' });
    } finally {
      setLoading(false);
    }
  };

  const formatVnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

  return (
    <div className="min-h-screen bg-surface-alt/70 p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Quản Lý Lịch Chiếu & Xung Đột Phòng
            </h1>
            <p className="text-xs text-gray-500">
              Kiểm tra xung đột 15 phút dọn phòng (cleaning buffer) và hỗ trợ tạo chuỗi định kỳ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isAdmin && (
            <button
              onClick={() => quickLoginDemo('ADMIN')}
              className="px-3.5 py-2.5 rounded-2xl bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-900/20"
            >
              <Sparkles className="w-4 h-4" /> Đăng Nhập Admin
            </button>
          )}
          <button
            onClick={() => setShowSeriesModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
          >
            <Repeat className="w-4 h-4 text-amber-400" /> Tạo Chuỗi Định Kỳ
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-xs shadow-md shadow-red-900/20 flex items-center gap-2 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" /> Thêm 1 Suất Chiếu
          </button>
        </div>
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

      {/* Showtimes Table */}
      <div className="bg-white rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6">Phim</th>
                <th>Cụm Rạp</th>
                <th>Phòng Chiếu</th>
                <th>Giờ Chiếu</th>
                <th>Giá Gốc</th>
                <th>Trạng Thái</th>
                <th className="text-right py-3 px-6">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {showtimes.map((st) => (
                <tr key={st.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 px-6 font-bold text-gray-900 line-clamp-1">
                    {st.movie?.title || 'Phim'}
                  </td>
                  <td className="text-gray-600 font-medium">{st.cinema?.name}</td>
                  <td>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold">
                      {st.auditorium?.name} ({st.format})
                    </span>
                  </td>
                  <td className="font-mono text-gray-900 font-semibold">
                    {new Date(st.startAt).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="font-bold text-[#c8102e]">{formatVnd(st.basePrice)}</td>
                  <td>
                    {st.isCancelled ? (
                      <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">
                        ĐÃ HỦY
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                        HOẠT ĐỘNG
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-right">
                    {!st.isCancelled && (
                      <button
                        onClick={() => handleCancelShowtime(st.id)}
                        className="text-red-600 hover:text-red-800 font-bold hover:underline"
                        title="Hủy suất chiếu & hoàn tiền tự động"
                      >
                        Hủy Suất
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Single Showtime */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900">Tạo Suất Chiếu Mới (Check Buffer 15m)</h2>
              <button onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSingle} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Chọn Phim</label>
                <select
                  value={movieId}
                  onChange={(e) => setMovieId(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs"
                >
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.durationMinutes} phút)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Chọn Cụm Rạp</label>
                <select
                  value={cinemaId}
                  onChange={(e) => setCinemaId(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs"
                >
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Chọn Phòng Chiếu</label>
                <select
                  value={auditoriumId}
                  onChange={(e) => setAuditoriumId(e.target.value)}
                  className="w-full border rounded-xl p-2.5 text-xs"
                >
                  {auditoriums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type} - {a.capacity} ghế)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Thời Gian Bắt Đầu</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    required
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Giá Vé Gốc (VNĐ)</label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    step={5000}
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border text-gray-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-[#c8102e] text-white font-bold"
                >
                  Tạo Suất Chiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Series Showtime */}
      {showSeriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-[#c8102e]" /> Tạo Chuỗi Suất Chiếu Định Kỳ
              </h2>
              <button onClick={() => setShowSeriesModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSeries} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Chọn Phim</label>
                <select
                  value={movieId}
                  onChange={(e) => setMovieId(e.target.value)}
                  className="w-full border rounded-xl p-2 text-xs"
                >
                  {movies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Chọn Phòng Chiếu</label>
                <select
                  value={auditoriumId}
                  onChange={(e) => setAuditoriumId(e.target.value)}
                  className="w-full border rounded-xl p-2 text-xs"
                >
                  {auditoriums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Từ Ngày</label>
                  <input
                    type="date"
                    value={seriesStartDate}
                    onChange={(e) => setSeriesStartDate(e.target.value)}
                    required
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Đến Ngày</label>
                  <input
                    type="date"
                    value={seriesEndDate}
                    onChange={(e) => setSeriesEndDate(e.target.value)}
                    required
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Giờ Chiếu</label>
                  <input
                    type="time"
                    value={seriesTime}
                    onChange={(e) => setSeriesTime(e.target.value)}
                    required
                    className="w-full border rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowSeriesModal(false)}
                  className="px-4 py-2 rounded-xl border text-gray-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-[#c8102e] text-white font-bold"
                >
                  Tạo Toàn Bộ Chuỗi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
