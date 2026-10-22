'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Movie } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { TrailerModal } from '../../../components/TrailerModal';
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
  Link as LinkIcon,
  Video,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  RefreshCw,
} from 'lucide-react';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  return match ? match[1] : null;
}

export default function AdminMoviesPage() {
  const { user, isAdmin, quickLoginDemo } = useAuth();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [previewTrailer, setPreviewTrailer] = useState<{ title: string; embedUrl?: string; youtubeId?: string } | null>(null);

  // Quick Inline Trailer Modal
  const [quickTrailerMovie, setQuickTrailerMovie] = useState<Movie | null>(null);
  const [quickTrailerUrl, setQuickTrailerUrl] = useState('');
  const [savingQuickTrailer, setSavingQuickTrailer] = useState(false);

  // Quick Poster Upload Tracker
  const [uploadingMovieId, setUploadingMovieId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Add Movie Form State
  const [addTitle, setAddTitle] = useState('');
  const [addOriginalTitle, setAddOriginalTitle] = useState('');
  const [addSynopsis, setAddSynopsis] = useState('');
  const [addDurationMinutes, setAddDurationMinutes] = useState(120);
  const [addAgeRating, setAddAgeRating] = useState('P');
  const [addFormats, setAddFormats] = useState<string[]>(['2D']);
  const [addStatus, setAddStatus] = useState<'NOW_SHOWING' | 'COMING_SOON'>('NOW_SHOWING');
  const [addTrailerUrl, setAddTrailerUrl] = useState('');
  const [addPosterUrl, setAddPosterUrl] = useState('');
  const [uploadingAddPoster, setUploadingAddPoster] = useState(false);

  // Edit Movie Form State
  const [editTitle, setEditTitle] = useState('');
  const [editOriginalTitle, setEditOriginalTitle] = useState('');
  const [editSynopsis, setEditSynopsis] = useState('');
  const [editDurationMinutes, setEditDurationMinutes] = useState(120);
  const [editAgeRating, setEditAgeRating] = useState('P');
  const [editFormats, setEditFormats] = useState<string[]>(['2D']);
  const [editStatus, setEditStatus] = useState<'NOW_SHOWING' | 'COMING_SOON'>('NOW_SHOWING');
  const [editTrailerUrl, setEditTrailerUrl] = useState('');
  const [editPosterUrl, setEditPosterUrl] = useState('');
  const [uploadingEditPoster, setUploadingEditPoster] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

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

  // Upload poster from computer for Add Modal
  const handleAddFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAddPoster(true);
      setMessage(null);
      const res = await api.uploadPoster(file);
      const url = res.large || res.original || res.url;
      if (url) {
        setAddPosterUrl(url);
        setMessage({ type: 'success', text: 'Tải poster thành công! Đã nén sang định dạng WebP.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi tải ảnh poster' });
    } finally {
      setUploadingAddPoster(false);
    }
  };

  // Upload poster from computer for Edit Modal
  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingEditPoster(true);
      setMessage(null);
      const res = await api.uploadPoster(file);
      const url = res.large || res.original || res.url;
      if (url) {
        setEditPosterUrl(url);
        setMessage({ type: 'success', text: 'Đã tải ảnh mới! Bấm "Lưu Thay Đổi" để hoàn tất cập nhật.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi tải ảnh poster' });
    } finally {
      setUploadingEditPoster(false);
    }
  };

  // Quick 1-click poster upload directly from Table row
  const handleQuickRowFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, movie: Movie) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingMovieId(movie.id);
      setMessage(null);
      const uploadRes = await api.uploadPoster(file);
      const newPosterUrl = uploadRes.large || uploadRes.original || uploadRes.url;

      if (!newPosterUrl) {
        throw new Error('Không nhận được đường dẫn ảnh sau khi tải');
      }

      await api.updateMovie(movie.id, { posterUrl: newPosterUrl });
      setMessage({
        type: 'success',
        text: `Đã thay đổi poster phim "${movie.title}" từ máy tính thành công!`,
      });
      loadMovies();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi thay poster cho phim' });
    } finally {
      setUploadingMovieId(null);
    }
  };

  // Create new movie
  const handleCreateMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim() || !addSynopsis.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập tên phim và tóm tắt nội dung.' });
      return;
    }

    try {
      setLoading(true);
      await api.createMovie({
        title: addTitle.trim(),
        originalTitle: addOriginalTitle.trim() || undefined,
        synopsis: addSynopsis.trim(),
        durationMinutes: Number(addDurationMinutes),
        ageRating: addAgeRating,
        formats: addFormats,
        status: addStatus,
        posterUrl: addPosterUrl.trim() || undefined,
        trailerUrlOriginal: addTrailerUrl.trim() || undefined,
        releaseDate: new Date().toISOString(),
      });

      setMessage({ type: 'success', text: 'Tạo phim mới thành công!' });
      setShowAddModal(false);
      resetAddForm();
      loadMovies();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi tạo phim mới' });
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal for a movie
  const openEditModal = (movie: Movie, initialFocusSection?: 'poster' | 'trailer') => {
    setEditingMovie(movie);
    setEditTitle(movie.title || '');
    setEditOriginalTitle(movie.originalTitle || '');
    setEditSynopsis(movie.synopsis || '');
    setEditDurationMinutes(movie.durationMinutes || 120);
    setEditAgeRating(movie.ageRating || 'P');
    setEditStatus(movie.status === 'COMING_SOON' ? 'COMING_SOON' : 'NOW_SHOWING');
    setEditPosterUrl(movie.posterUrl || '');
    setEditTrailerUrl(
      movie.trailer?.youtubeId ? `https://www.youtube.com/watch?v=${movie.trailer.youtubeId}` : '',
    );

    let parsedFormats = ['2D'];
    try {
      if (movie.formats) parsedFormats = JSON.parse(movie.formats);
    } catch {}
    setEditFormats(parsedFormats);
  };

  // Submit Edit Movie
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovie) return;

    try {
      setSavingEdit(true);
      setMessage(null);

      const updatePayload: any = {
        title: editTitle.trim(),
        originalTitle: editOriginalTitle.trim() || null,
        synopsis: editSynopsis.trim(),
        durationMinutes: Number(editDurationMinutes),
        ageRating: editAgeRating,
        status: editStatus,
        formats: editFormats,
        posterUrl: editPosterUrl.trim() || undefined,
        trailerUrl: editTrailerUrl.trim() || '',
      };

      await api.updateMovie(editingMovie.id, updatePayload);

      setMessage({
        type: 'success',
        text: `Cập nhật poster, trailer và thông tin phim "${editTitle}" thành công!`,
      });
      setEditingMovie(null);
      loadMovies();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi cập nhật phim' });
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick Trailer Save (Direct from quick modal)
  const handleSaveQuickTrailer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTrailerMovie) return;

    try {
      setSavingQuickTrailer(true);
      setMessage(null);
      await api.updateMovie(quickTrailerMovie.id, {
        trailerUrl: quickTrailerUrl.trim() || '',
      });

      setMessage({
        type: 'success',
        text: `Đã cập nhật trailer YouTube cho phim "${quickTrailerMovie.title}" thành công!`,
      });
      setQuickTrailerMovie(null);
      loadMovies();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Lỗi khi gắn link YouTube trailer' });
    } finally {
      setSavingQuickTrailer(false);
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

  const resetAddForm = () => {
    setAddTitle('');
    setAddOriginalTitle('');
    setAddSynopsis('');
    setAddDurationMinutes(120);
    setAddAgeRating('P');
    setAddFormats(['2D']);
    setAddStatus('NOW_SHOWING');
    setAddTrailerUrl('');
    setAddPosterUrl('');
  };

  const toggleAddFormat = (fmt: string) => {
    setAddFormats((prev) => (prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]));
  };

  const toggleEditFormat = (fmt: string) => {
    setEditFormats((prev) => (prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]));
  };

  const addYoutubeId = extractYouTubeId(addTrailerUrl);
  const editYoutubeId = extractYouTubeId(editTrailerUrl);
  const quickYoutubeId = extractYouTubeId(quickTrailerUrl);

  return (
    <div className="min-h-screen bg-surface-alt/70 p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header */}
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
            <p className="text-xs text-gray-500">
              Quản trị kho phim, tải ảnh poster WebP từ máy tính và duyệt gắn trailer YouTube
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
            onClick={() => {
              resetAddForm();
              setShowAddModal(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-xs shadow-md shadow-red-900/20 flex items-center gap-2 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" /> Thêm Phim Mới
          </button>
        </div>
      </div>

      {/* 2. Notification Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all shadow-sm ${
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
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Movies Table */}
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
                <th>Trailer YouTube</th>
                <th className="text-right py-3 px-6">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {movies.map((m) => {
                const hasTrailer = !!(m.trailer?.embedUrl || m.trailer?.youtubeId);
                const isUploadingThis = uploadingMovieId === m.id;

                return (
                  <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group">
                    {/* Movie Info & Poster */}
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3.5">
                        {/* Poster with 1-Click Upload Overlay */}
                        <div className="relative w-12 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 border border-gray-200 shadow-sm group/poster">
                          <img
                            src={m.posterUrl || ''}
                            alt={m.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src =
                                'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
                            }}
                          />

                          {/* Hidden file input for 1-click upload */}
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            ref={(el) => {
                              fileInputRefs.current[m.id] = el;
                            }}
                            onChange={(e) => handleQuickRowFileUpload(e, m)}
                            className="hidden"
                          />

                          {/* Hover Upload Button */}
                          <button
                            onClick={() => fileInputRefs.current[m.id]?.click()}
                            disabled={isUploadingThis}
                            title="Tải ảnh từ máy tính để thay poster"
                            className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover/poster:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold"
                          >
                            {isUploadingThis ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                <span>Đổi</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Title & Quick Actions */}
                        <div className="space-y-1">
                          <button
                            onClick={() => openEditModal(m)}
                            className="font-bold text-sm text-gray-900 line-clamp-1 hover:text-[#c8102e] text-left transition-colors"
                          >
                            {m.title}
                          </button>
                          {m.originalTitle && (
                            <div className="text-[11px] text-gray-400 italic line-clamp-1">
                              {m.originalTitle}
                            </div>
                          )}
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              onClick={() => fileInputRefs.current[m.id]?.click()}
                              disabled={isUploadingThis}
                              className="text-[11px] font-semibold text-[#c8102e] hover:underline flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" /> Thay Poster
                            </button>
                            <span className="text-gray-300">•</span>
                            <button
                              onClick={() => openEditModal(m)}
                              className="text-[11px] font-semibold text-gray-500 hover:text-gray-900"
                            >
                              Chi tiết
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Age Rating */}
                    <td>
                      <span className="bg-[#c8102e] text-white font-black px-2 py-0.5 rounded text-[10px]">
                        {m.ageRating}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="font-semibold text-gray-600">{m.durationMinutes} phút</td>

                    {/* Formats */}
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

                    {/* Status */}
                    <td>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          m.status === 'NOW_SHOWING'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {m.status === 'NOW_SHOWING' ? 'Đang Chiếu' : 'Sắp Chiếu'}
                      </span>
                    </td>

                    {/* Trailer YouTube */}
                    <td>
                      {hasTrailer ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setPreviewTrailer({
                                title: m.title,
                                embedUrl: m.trailer?.embedUrl,
                                youtubeId: m.trailer?.youtubeId,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1.5 transition-colors"
                            title="Bấm để phát trailer"
                          >
                            <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                            <span>Xem thử</span>
                          </button>
                          <button
                            onClick={() => {
                              setQuickTrailerMovie(m);
                              setQuickTrailerUrl(
                                m.trailer?.youtubeId
                                  ? `https://www.youtube.com/watch?v=${m.trailer.youtubeId}`
                                  : '',
                              );
                            }}
                            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                            title="Gắn link YouTube khác"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setQuickTrailerMovie(m);
                            setQuickTrailerUrl('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3 text-amber-600" />
                          <span>Gắn link YouTube</span>
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(m)}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:border-[#c8102e] hover:text-[#c8102e] hover:bg-red-50/50 font-bold transition-all flex items-center gap-1 shadow-sm"
                          title="Sửa poster, trailer và thông tin phim"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Sửa & Media</span>
                        </button>

                        <button
                          onClick={() => handleDelete(m.id, m.title)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                          title="Xóa phim"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Comprehensive Edit Movie & Media Modal */}
      {editingMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-[#c8102e]" /> Cập Nhật Poster, Trailer & Phim
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Đang chỉnh sửa: <strong className="text-gray-900 font-bold">{editingMovie.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setEditingMovie(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Media Section: Poster & Trailer Side-by-side */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-5">
                <div className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#c8102e]" />
                  <span>1. Quản Trị Media (Poster & Trailer YouTube)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Poster Uploader */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-bold text-gray-800 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-[#c8102e]" /> Ảnh Poster Phim
                        </label>
                        <span className="text-[10px] text-gray-400">WebP 600x900</span>
                      </div>

                      {/* Poster Preview */}
                      <div className="relative aspect-[2/3] max-w-[150px] mx-auto rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm mb-3">
                        <img
                          src={editPosterUrl || editingMovie.posterUrl || ''}
                          alt="Poster preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block w-full">
                        <span className="sr-only">Tải ảnh poster từ máy</span>
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          onChange={handleEditFileUpload}
                          className="w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-[#c8102e] hover:file:bg-red-100 file:cursor-pointer cursor-pointer"
                        />
                      </label>

                      {uploadingEditPoster && (
                        <div className="text-[11px] text-amber-600 font-bold animate-pulse flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang nén và chuyển sang Sharp WebP...</span>
                        </div>
                      )}

                      {/* Or URL input */}
                      <div>
                        <input
                          type="url"
                          value={editPosterUrl}
                          onChange={(e) => setEditPosterUrl(e.target.value)}
                          placeholder="Hoặc dán link ảnh poster..."
                          className="w-full border border-gray-200 rounded-lg p-2 text-[11px] focus:outline-none focus:border-[#c8102e]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* YouTube Trailer Input & Live Preview */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-bold text-gray-800 flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-red-600" /> Trailer YouTube
                        </label>
                        {editYoutubeId && (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Video ID: {editYoutubeId}
                          </span>
                        )}
                      </div>

                      {/* YouTube Player Preview */}
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-gray-200 bg-black shadow-sm mb-3">
                        {editYoutubeId ? (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${editYoutubeId}?rel=0`}
                            title="Trailer preview"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center space-y-1">
                            <Video className="w-8 h-8 opacity-40 text-red-500" />
                            <span className="text-[11px] font-medium">Chưa có video trailer</span>
                            <span className="text-[10px] text-gray-500">
                              Dán link YouTube bên dưới để xem thử
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="relative">
                        <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="url"
                          value={editTrailerUrl}
                          onChange={(e) => setEditTrailerUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#c8102e]"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400">
                        Hỗ trợ link YouTube chuẩn, youtu.be, hoặc shorts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Movie Info */}
              <div className="space-y-4">
                <div className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-gray-600" />
                  <span>2. Thông Tin Phim</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Tên phim tiếng Việt <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Tên gốc tiếng Anh</label>
                    <input
                      type="text"
                      value={editOriginalTitle}
                      onChange={(e) => setEditOriginalTitle(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tóm tắt nội dung</label>
                  <textarea
                    rows={3}
                    value={editSynopsis}
                    onChange={(e) => setEditSynopsis(e.target.value)}
                    required
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Thời lượng (phút)</label>
                    <input
                      type="number"
                      value={editDurationMinutes}
                      onChange={(e) => setEditDurationMinutes(Number(e.target.value))}
                      min={30}
                      max={360}
                      className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Độ tuổi</label>
                    <select
                      value={editAgeRating}
                      onChange={(e) => setEditAgeRating(e.target.value)}
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
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
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
                        onClick={() => toggleEditFormat(fmt)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          editFormats.includes(fmt)
                            ? 'bg-[#c8102e] text-white border-[#c8102e]'
                            : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMovie(null)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || uploadingEditPoster}
                  className="px-7 py-2.5 rounded-xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu Thay Đổi Media & Phim</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Quick Trailer URL Modal */}
      {quickTrailerMovie && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-red-600" /> Gắn Trailer YouTube: {quickTrailerMovie.title}
              </h3>
              <button
                onClick={() => setQuickTrailerMovie(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickTrailer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Đường dẫn video YouTube
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={quickTrailerUrl}
                    onChange={(e) => setQuickTrailerUrl(e.target.value)}
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#c8102e]"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Nhập link YouTube để hệ thống tự động kiểm tra và nhúng phát trực tiếp.
                </p>
              </div>

              {/* Live Preview */}
              {quickYoutubeId && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Link YouTube hợp lệ (ID: {quickYoutubeId})
                  </div>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-sm">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${quickYoutubeId}?rel=0`}
                      title="Quick preview"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setQuickTrailerMovie(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingQuickTrailer}
                  className="px-6 py-2 rounded-xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {savingQuickTrailer ? 'Đang lưu...' : 'Lưu Trailer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Add Movie Modal */}
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
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    required
                    placeholder="VD: Chiến Binh Công Nghệ"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tên gốc tiếng Anh</label>
                  <input
                    type="text"
                    value={addOriginalTitle}
                    onChange={(e) => setAddOriginalTitle(e.target.value)}
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
                  value={addSynopsis}
                  onChange={(e) => setAddSynopsis(e.target.value)}
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
                    value={addDurationMinutes}
                    onChange={(e) => setAddDurationMinutes(Number(e.target.value))}
                    min={30}
                    max={360}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Độ tuổi</label>
                  <select
                    value={addAgeRating}
                    onChange={(e) => setAddAgeRating(e.target.value)}
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
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as any)}
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
                      onClick={() => toggleAddFormat(fmt)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        addFormats.includes(fmt)
                          ? 'bg-[#c8102e] text-white border-[#c8102e]'
                          : 'bg-white border-gray-200 text-gray-700'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Poster File Upload from PC */}
              <div className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <label className="block font-bold text-gray-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#c8102e]" />
                  Tải Ảnh Poster từ Máy Tính (Tự động nén WebP)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleAddFileUpload}
                    className="text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-[#c8102e] hover:file:bg-red-100 file:cursor-pointer cursor-pointer"
                  />
                  {uploadingAddPoster && (
                    <span className="text-xs text-amber-600 font-semibold animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang xử lý ảnh...
                    </span>
                  )}
                </div>

                {addPosterUrl && (
                  <div className="flex items-center gap-3 pt-2">
                    <img
                      src={addPosterUrl}
                      alt="Preview"
                      className="w-12 h-16 object-cover rounded-lg border border-gray-200 shadow-sm"
                    />
                    <div className="text-[11px] text-emerald-600 font-semibold line-clamp-1">
                      ✓ Đã tải: {addPosterUrl}
                    </div>
                  </div>
                )}
              </div>

              {/* YouTube Trailer Link */}
              <div className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <label className="block font-bold text-gray-800 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-600" />
                  Đường dẫn Trailer YouTube
                </label>
                <input
                  type="url"
                  value={addTrailerUrl}
                  onChange={(e) => setAddTrailerUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=Way9Dexny3w"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#c8102e]"
                />

                {addYoutubeId && (
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-sm mt-2">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${addYoutubeId}?rel=0`}
                      title="Add preview"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
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
                  disabled={loading || uploadingAddPoster}
                  className="px-6 py-2.5 rounded-xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  Lưu & Đăng Phim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Trailer Video Preview Modal */}
      {previewTrailer && (
        <TrailerModal
          isOpen={true}
          onClose={() => setPreviewTrailer(null)}
          title={previewTrailer.title}
          embedUrl={previewTrailer.embedUrl}
          youtubeId={previewTrailer.youtubeId}
        />
      )}
    </div>
  );
}
