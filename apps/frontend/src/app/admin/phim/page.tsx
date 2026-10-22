'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Movie } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import {
  Film,
  Plus,
  Upload,
  Play,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  X,
  Star,
  Sparkles,
} from 'lucide-react';

export default function AdminMoviesPage() {
  const { user, isAdmin, quickLoginDemo } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [ageRating, setAgeRating] = useState('P');
  const [formats, setFormats] = useState<string[]>(['2D']);
  const [status, setStatus] = useState<'NOW_SHOWING' | 'COMING_SOON'>('NOW_SHOWING');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [uploadedPosterUrl, setUploadedPosterUrl] = useState('');

  useEffect(() => {
    loadMovies();
  }, [user]);

  const loadMovies = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminMovies();
      if (Array.isArray(res)) setMovies(res);
      else if (Array.isArray(res?.items)) setMovies(res.items);
      else if (res?.movies) setMovies(res.movies);
    } catch (err) {
      console.error('Failed to load admin movies', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPoster(true);
      setMessage(null);
      const res = await api.uploadPoster(file);
      if (res?.large || res?.original || res?.url) {
        setUploadedPosterUrl(res.large || res.original || res.url);
        setMessage({ type: 'success', text: 'Tải poster thành công! Đã tạo WebP và blurhash.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi tải ảnh poster' });
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !synopsis.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên phim và tóm tắt.' });
      return;
    }

    try {
      setLoading(true);
      await api.createMovie({
        title,
        originalTitle: originalTitle || undefined,
        synopsis,
        durationMinutes: Number(durationMinutes),
        ageRating,
        formats,
        status,
        posterUrl: uploadedPosterUrl || undefined,
        trailerUrlOriginal: trailerUrl.trim() || undefined,
        releaseDate: new Date().toISOString(),
      });

      setMessage({ type: 'success', text: 'Tạo phim mới thành công!' });
      setShowAddModal(false);
      resetForm();
      loadMovies();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi tạo phim' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, movieTitle: string) => {
    if (!confirm(`Bạn có chắc muốn xóa phim "${movieTitle}"?`)) return;
    try {
      await api.deleteMovie(id);
      setMessage({ type: 'success', text: `Đã xóa phim "${movieTitle}" thành công.` });
      loadMovies();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Không thể xóa phim (có thể đã có suất chiếu)' });
    }
  };

  const resetForm = () => {
    setTitle('');
    setOriginalTitle('');
    setSynopsis('');
    setDurationMinutes(120);
    setAgeRating('P');
    setFormats(['2D']);
    setStatus('NOW_SHOWING');
    setTrailerUrl('');
    setUploadedPosterUrl('');
  };

  const toggleFormat = (fmt: string) => {
    setFormats((prev) => (prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]));
  };

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
              Quản Lý Phim & Media
            </h1>
            <p className="text-xs text-gray-500">Quản trị kho phim, tải poster WebP và duyệt trailer YouTube</p>
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
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-xs shadow-md shadow-red-900/20 flex items-center gap-2 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" /> Thêm Phim Mới
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

      {/* Movies Table */}
      <div className="bg-white rounded-3xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6">Phim</th>
                <th>Độ Tuổi</th>
                <th>Thời Lượng</th>
                <th>Định Dạng</th>
                <th>Trạng Thái</th>
                <th>Trailer</th>
                <th className="text-right py-3 px-6">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {movies.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      {m.posterUrl && (
                        <img
                          src={m.posterUrl}
                          alt={m.title}
                          className="w-10 h-14 object-cover rounded-lg shrink-0 shadow-sm"
                        />
                      )}
                      <div>
                        <div className="font-bold text-sm text-gray-900 line-clamp-1">{m.title}</div>
                        {m.originalTitle && (
                          <div className="text-[11px] text-gray-400 italic line-clamp-1">{m.originalTitle}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="bg-[#c8102e] text-white font-black px-2 py-0.5 rounded text-[10px]">
                      {m.ageRating}
                    </span>
                  </td>
                  <td className="font-semibold text-gray-600">{m.durationMinutes} phút</td>
                  <td>
                    <div className="flex gap-1">
                      {(() => {
                        try {
                          const fmts: string[] = m.formats ? JSON.parse(m.formats) : ['2D'];
                          return fmts.map((f) => (
                            <span
                              key={f}
                              className="bg-gray-100 border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-[10px] font-bold"
                            >
                              {f}
                            </span>
                          ));
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'NOW_SHOWING'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {m.status === 'NOW_SHOWING' ? 'Đang Chiếu' : 'Sắp Chiếu'}
                    </span>
                  </td>
                  <td>
                    {m.trailer?.embedUrl ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <Play className="w-3.5 h-3.5 fill-emerald-600" /> Sẵn sàng
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Chưa có</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-right">
                    <button
                      onClick={() => handleDelete(m.id, m.title)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Xóa phim"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Movie Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Film className="w-5 h-5 text-[#c8102e]" /> Thêm Phim Mới Vào Hệ Thống
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMovie} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Tên phim tiếng Việt <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="VD: Chiến Binh Công Nghệ"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tên gốc tiếng Anh</label>
                  <input
                    type="text"
                    value={originalTitle}
                    onChange={(e) => setOriginalTitle(e.target.value)}
                    placeholder="VD: Cyber Odyssey 2026"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Tóm tắt nội dung <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  required
                  placeholder="Mô tả cốt truyện bộ phim..."
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Thời lượng (phút)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    min={30}
                    max={360}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Độ tuổi</label>
                  <select
                    value={ageRating}
                    onChange={(e) => setAgeRating(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                  >
                    <option value="P">P (Mọi lứa tuổi)</option>
                    <option value="K">K (Dưới 13 tuổi)</option>
                    <option value="T13">T13 (Từ 13 tuổi)</option>
                    <option value="T16">T16 (Từ 16 tuổi)</option>
                    <option value="T18">T18 (Từ 18 tuổi)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Trạng thái</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                  >
                    <option value="NOW_SHOWING">Đang Chiếu</option>
                    <option value="COMING_SOON">Sắp Chiếu</option>
                  </select>
                </div>
              </div>

              {/* Formats Checkboxes */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">Định dạng chiếu</label>
                <div className="flex gap-2">
                  {['2D', '3D', 'IMAX'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => toggleFormat(fmt)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        formats.includes(fmt)
                          ? 'bg-[#c8102e] text-white border-[#c8102e]'
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* YouTube Trailer Link */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Đường dẫn Trailer YouTube (Tự động chạy video)
                </label>
                <input
                  type="url"
                  value={trailerUrl}
                  onChange={(e) => setTrailerUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=Way9Dexny3w"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                />
              </div>

              {/* Poster File Upload */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-gray-700">
                  Tải Ảnh Poster Thật (Tự động chuyển đổi WebP & Blurhash)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleFileUpload}
                    className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-[#c8102e] hover:file:bg-red-100"
                  />
                  {uploadingPoster && (
                    <span className="text-xs text-amber-600 font-semibold animate-pulse">
                      Đang xử lý ảnh Sharp WebP...
                    </span>
                  )}
                </div>
                {uploadedPosterUrl && (
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    ✓ Đã tải: {uploadedPosterUrl}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingPoster}
                  className="px-6 py-2.5 rounded-xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  Lưu & Đăng Phim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
