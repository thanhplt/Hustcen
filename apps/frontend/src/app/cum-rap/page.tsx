'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Cinema, MovieShowtimesGroup, ShowtimeSlot, ShowtimeFormatGroup } from '../../types';
import { useClock } from '../../context/ClockContext';
import { useAuth } from '../../context/AuthContext';
import {
  MapPin,
  Phone,
  Calendar,
  Ticket,
  Search,
  Filter,
  CheckCircle2,
  Film,
  Sparkles,
  Info,
  Clock,
  ChevronRight,
} from 'lucide-react';

function CinemasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCinemaSlug = searchParams.get('cinema') || '';
  const { currentDate } = useClock();
  const { user } = useAuth();

  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinema, setSelectedCinema] = useState<Cinema | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<Array<{ date: string; label: string; dayName: string }>>([]);
  const [moviesGrouped, setMoviesGrouped] = useState<MovieShowtimesGroup[]>([]);
  const [loadingCinemas, setLoadingCinemas] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NOW_SHOWING' | 'COMING_SOON'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Generate 7 upcoming dates based on server/dev clock
  useEffect(() => {
    const dates: Array<{ date: string; label: string; dayName: string }> = [];
    const base = currentDate || new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dayName = i === 0 ? 'Hôm Nay' : daysOfWeek[d.getDay()];
      dates.push({
        date: dateStr,
        label: `${day}/${m}`,
        dayName,
      });
    }
    setAvailableDates(dates);
    setSelectedDate((prev) => (prev && dates.some((dt) => dt.date === prev) ? prev : dates[0]?.date || ''));
  }, [currentDate?.toDateString()]);

  // 2. Fetch list of Cinemas
  useEffect(() => {
    async function loadCinemas() {
      try {
        setLoadingCinemas(true);
        const res = await api.getCinemas();
        if (Array.isArray(res) && res.length > 0) {
          setCinemas(res);
          // Match initial slug or default to first cinema
          const match = initialCinemaSlug ? res.find((c) => c.slug === initialCinemaSlug) : null;
          setSelectedCinema(match || res[0]);
        }
      } catch (err) {
        console.error('Failed to load cinemas', err);
      } finally {
        setLoadingCinemas(false);
      }
    }
    loadCinemas();
  }, [initialCinemaSlug]);

  // 3. Fetch Showtimes for Selected Cinema & Selected Date
  useEffect(() => {
    if (!selectedCinema || !selectedDate) return;
    async function loadSchedule() {
      try {
        setLoadingSchedule(true);
        const res = await api.getShowtimes({
          cinema: selectedCinema.slug,
          date: selectedDate,
          includePast: false,
        });

        if (res?.moviesGrouped && Array.isArray(res.moviesGrouped)) {
          setMoviesGrouped(res.moviesGrouped);
        } else if (res?.cinemas && Array.isArray(res.cinemas) && res.cinemas.length > 0) {
          // Fallback: Group client-side if needed
          const fallbackGroups: Record<string, any> = {};
          for (const cin of res.cinemas) {
            for (const rt of cin.roomTypes || []) {
              for (const st of rt.showtimes || []) {
                const m = st.movie;
                if (!m) continue;
                if (!fallbackGroups[m.id]) {
                  fallbackGroups[m.id] = {
                    movie: m,
                    cinema: cin.cinema,
                    formatGroups: {},
                  };
                }
                const label = `${st.format} ${m.subtitleInfo || 'Phụ Đề'}${
                  rt.roomName && !rt.roomName.includes('Tiêu Chuẩn') ? ` | Rạp ${rt.roomName}` : ''
                }`;
                if (!fallbackGroups[m.id].formatGroups[label]) {
                  fallbackGroups[m.id].formatGroups[label] = {
                    formatLabel: label,
                    format: st.format,
                    auditoriumName: rt.roomName,
                    auditoriumType: rt.roomType,
                    showtimes: [],
                  };
                }
                fallbackGroups[m.id].formatGroups[label].showtimes.push(st);
              }
            }
          }
          const formatted = Object.values(fallbackGroups).map((fg: any) => ({
            movie: fg.movie,
            cinema: fg.cinema,
            formatGroups: Object.values(fg.formatGroups),
          }));
          setMoviesGrouped(formatted as MovieShowtimesGroup[]);
        } else {
          setMoviesGrouped([]);
        }
      } catch (err) {
        console.error('Failed to load schedule', err);
        setMoviesGrouped([]);
      } finally {
        setLoadingSchedule(false);
      }
    }
    loadSchedule();
  }, [selectedCinema?.slug, selectedDate]);

  // Handle switching Cinema
  const handleSelectCinema = (cinema: Cinema) => {
    setSelectedCinema(cinema);
    const newUrl = `/cum-rap?cinema=${cinema.slug}`;
    window.history.replaceState(null, '', newUrl);
  };

  // Filter movies
  const filteredMovies = useMemo(() => {
    return moviesGrouped.filter((item) => {
      const m = item.movie;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchOrig = m.originalTitle?.toLowerCase().includes(q);
        if (!matchTitle && !matchOrig) return false;
      }

      // Filter Tab
      if (activeFilter === 'NOW_SHOWING') {
        return m.status === 'NOW_SHOWING';
      }
      if (activeFilter === 'COMING_SOON') {
        return m.status === 'COMING_SOON';
      }
      return true;
    });
  }, [moviesGrouped, searchQuery, activeFilter]);

  // Age badge style helper
  const renderAgeBadge = (rating: string) => {
    let bg = 'bg-gray-600';
    if (rating === 'T18') bg = 'bg-[#c8102e]';
    else if (rating === 'T16') bg = 'bg-[#e65100]';
    else if (rating === 'T13') bg = 'bg-[#f57c00]';
    else if (rating === 'K') bg = 'bg-[#1976d2]';
    else if (rating === 'P') bg = 'bg-[#388e3c]';

    return (
      <span
        className={`${bg} text-white text-[11px] font-black px-1.5 py-0.5 rounded tracking-wide inline-flex items-center justify-center`}
      >
        {rating}
      </span>
    );
  };

  const formatVnd = (amount?: number) => {
    if (!amount) return '';
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  return (
    <div className="min-h-screen bg-[#fcfcfa] text-gray-900 pb-20">
      {/* 1. Header Bar */}
      <div className="bg-white border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="hover:text-[#c8102e]">
              Trang Chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-800">Lịch Chiếu Theo Cụm Rạp</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Lịch Chiếu Phim Tại Cụm Rạp HUST Cine
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Chọn cụm rạp để theo dõi danh sách phim đang chiếu và sắp chiếu cùng toàn bộ các suất chiếu trong ngày.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* 2. Cinema Switcher Tabs */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#c8102e]" />
            <span>Chọn Cụm Rạp:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {cinemas.map((cin) => {
              const isSelected = selectedCinema?.id === cin.id;
              return (
                <button
                  key={cin.id}
                  onClick={() => handleSelectCinema(cin)}
                  className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between space-y-1.5 ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-[#c8102e] shadow-md ring-2 ring-[#c8102e]/20 scale-[1.02]'
                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{cin.city}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#c8102e] animate-ping" />
                    )}
                  </div>
                  <div
                    className={`font-black text-xs sm:text-sm leading-snug line-clamp-2 ${
                      isSelected ? 'text-[#c8102e] dark:text-red-400' : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {cin.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Selected Cinema Details Card */}
        {selectedCinema && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-border-subtle dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                    {selectedCinema.name}
                  </h2>
                  <span className="bg-red-50 dark:bg-red-950/60 text-[#c8102e] dark:text-red-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    Đang Hoạt Động
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <MapPin className="w-3.5 h-3.5 text-[#c8102e] shrink-0" />
                  <span>{selectedCinema.address}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs shrink-0">
                <div className="text-gray-500 dark:text-gray-400">
                  Hotline: <strong className="text-gray-900 dark:text-white font-bold">{selectedCinema.phone || '1900 2026'}</strong>
                </div>
              </div>
            </div>

            {/* Room Features */}
            {selectedCinema.auditoriums && selectedCinema.auditoriums.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-gray-400 font-bold mr-1">Phòng chiếu:</span>
                {selectedCinema.auditoriums.map((aud) => (
                  <span
                    key={aud.id}
                    className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-xl font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-[#B8902A]" />
                    {aud.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Date Picker Tabs */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-border-subtle dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-[#c8102e]" />
            <span>Chọn Ngày Chiếu:</span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {availableDates.map((item) => {
              const isSelected = selectedDate === item.date;
              return (
                <button
                  key={item.date}
                  onClick={() => setSelectedDate(item.date)}
                  className={`flex flex-col items-center min-w-[76px] px-3 py-2.5 rounded-2xl transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#c8102e] text-white shadow-md shadow-red-900/30 scale-105'
                      : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
                    {item.dayName}
                  </span>
                  <span className="text-sm font-black mt-0.5">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-200/60 dark:bg-slate-800/80 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1 sm:flex-none ${
                activeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Tất Cả Phim ({moviesGrouped.length})
            </button>
            <button
              onClick={() => setActiveFilter('NOW_SHOWING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1 sm:flex-none ${
                activeFilter === 'NOW_SHOWING'
                  ? 'bg-white dark:bg-slate-900 text-[#c8102e] dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Phim Đang Chiếu
            </button>
            <button
              onClick={() => setActiveFilter('COMING_SOON')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex-1 sm:flex-none ${
                activeFilter === 'COMING_SOON'
                  ? 'bg-white dark:bg-slate-900 text-[#c8102e] dark:text-red-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Phim Sắp Chiếu / Suất Sớm
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm phim theo tên..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 text-xs focus:outline-none focus:border-[#c8102e] focus:ring-1 focus:ring-[#c8102e]"
            />
          </div>
        </div>

        {/* 6. Movies & Showtimes Schedule (Matches Reference Image) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-border-subtle dark:border-slate-800 shadow-sm">
          {loadingSchedule ? (
            <div className="py-20 text-center text-gray-400 space-y-3">
              <div className="w-8 h-8 border-4 border-[#c8102e] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-gray-600">
                Đang tải danh sách phim và suất chiếu...
              </p>
            </div>
          ) : filteredMovies.length > 0 ? (
            <div className="space-y-10">
              {filteredMovies.map((item, index) => {
                const { movie, formatGroups } = item;
                const isComingSoon = movie.status === 'COMING_SOON';

                return (
                  <div key={movie.id} className="space-y-5">
                    {/* Movie Header: TITLE + AGE RATING */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link
                        href={`/phim/${movie.slug}`}
                        className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white hover:text-[#c8102e] dark:hover:text-red-400 transition-colors uppercase tracking-tight"
                      >
                        {movie.title}
                      </Link>
                      {renderAgeBadge(movie.ageRating)}
                      {isComingSoon && (
                        <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Suất Chiếu Sớm
                        </span>
                      )}
                      {movie.durationMinutes && (
                        <span className="text-xs text-gray-400 font-medium">
                          • {movie.durationMinutes} phút
                        </span>
                      )}
                    </div>

                    {/* Movie Row: POSTER ON LEFT, FORMATS ON RIGHT */}
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      {/* Left: Poster */}
                      <Link
                        href={`/phim/${movie.slug}`}
                        className="w-32 sm:w-36 md:w-44 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-slate-800 group block relative bg-gray-100 dark:bg-slate-800 hover:shadow-xl transition-all"
                      >
                        <img
                          src={movie.posterUrl || ''}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src =
                              'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
                          }}
                        />
                      </Link>

                      {/* Right: Format Groups & Showtimes */}
                      <div className="flex-1 space-y-6 w-full pt-1">
                        {formatGroups && formatGroups.length > 0 ? (
                          formatGroups.map((group: ShowtimeFormatGroup, gIdx: number) => (
                            <div key={gIdx} className="space-y-2">
                              {/* Format Title (e.g. "2D Phụ Đề Anh & Việt | Rạp STARIUM") */}
                              <div className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 tracking-tight flex items-center gap-2">
                                <span>{group.formatLabel}</span>
                              </div>

                              {/* Showtime Buttons Grid */}
                              <div className="flex flex-wrap gap-2.5">
                                {group.showtimes.map((st: ShowtimeSlot) => {
                                  const canBook = st.canBook;
                                  const targetUrl = user
                                    ? `/dat-ve/${st.id}`
                                    : `/auth/login?redirect=/dat-ve/${st.id}`;

                                  return canBook ? (
                                    <Link
                                      key={st.id}
                                      href={targetUrl}
                                      title={`${st.timeDisplay} • ${formatVnd(st.priceFrom)} • Còn ${st.seatsLeft} ghế`}
                                      className="px-3.5 py-1.5 rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#c8102e] dark:hover:border-red-500 hover:text-[#c8102e] dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/30 text-gray-800 dark:text-gray-200 text-sm font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center group"
                                    >
                                      <span>{st.startTime}</span>
                                    </Link>
                                  ) : (
                                    <div
                                      key={st.id}
                                      title="Suất chiếu đã bắt đầu hoặc đã đóng"
                                      className="px-3.5 py-1.5 rounded-md border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 text-gray-400 dark:text-slate-600 text-sm font-semibold cursor-not-allowed opacity-50"
                                    >
                                      <span>{st.startTime}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-400 italic py-2">
                            Chưa có suất chiếu mở bán cho định dạng này.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divider between movies */}
                    {index < filteredMovies.length - 1 && (
                      <div className="border-b border-gray-200/80 dark:border-slate-800 pt-6" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-gray-400 space-y-3">
              <Film className="w-12 h-12 text-[#c8102e] opacity-30 mx-auto" />
              <p className="text-base font-bold text-gray-700 dark:text-gray-300">
                Không có suất chiếu nào phù hợp
              </p>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Cụm rạp {selectedCinema?.name} hiện chưa có lịch chiếu cho các phim đã chọn vào ngày này. Vui lòng chọn một ngày khác hoặc đổi cụm rạp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CinemasPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
          <div className="w-8 h-8 border-4 border-[#c8102e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Đang tải thông tin rạp chiếu...
        </div>
      }
    >
      <CinemasContent />
    </Suspense>
  );
}
