'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Movie, Showtime } from '../../../types';
import { TrailerModal } from '../../../components/TrailerModal';
import { useClock } from '../../../context/ClockContext';
import { useAuth } from '../../../context/AuthContext';
import {
  Play,
  Calendar,
  Clock,
  MapPin,
  Star,
  Users,
  Video,
  Ticket,
  ChevronLeft,
  AlertCircle,
} from 'lucide-react';

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { currentDate } = useClock();
  const { user } = useAuth();

  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimesGrouped, setShowtimesGrouped] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<Array<{ date: string; label: string; dayName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);

  // Generate 7 upcoming dates based on server/dev clock
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

  // Fetch movie details
  useEffect(() => {
    if (!slug) return;
    async function loadMovie() {
      try {
        setLoading(true);
        const data = await api.getMovieBySlug(slug);
        setMovie(data);
      } catch (err) {
        console.error('Failed to load movie', err);
      } finally {
        setLoading(false);
      }
    }
    loadMovie();
  }, [slug]);

  // Fetch showtimes for movie and selectedDate
  useEffect(() => {
    if (!slug || !selectedDate) return;
    async function loadShowtimes() {
      try {
        const res = await api.getShowtimes({ movie: slug, date: selectedDate });
        if (res?.cinemas) {
          setShowtimesGrouped(res.cinemas);
        } else {
          setShowtimesGrouped([]);
        }
      } catch (err) {
        console.error('Failed to load showtimes', err);
        setShowtimesGrouped([]);
      }
    }
    loadShowtimes();
  }, [slug, selectedDate]);

  if (loading || !movie) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">
        <div className="animate-spin w-8 h-8 border-4 border-[#c8102e] border-t-transparent rounded-full mx-auto mb-4" />
        Đang tải thông tin phim và lịch chiếu...
      </div>
    );
  }

  const castNames: string[] = (() => {
    try {
      return movie.castList ? JSON.parse(movie.castList) : [];
    } catch {
      return [];
    }
  })();

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Backdrop Hero Header */}
      <section className="relative w-full min-h-[420px] bg-[#121216] text-white overflow-hidden flex items-end">
        {/* Backdrop Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={movie.backdropUrl || movie.posterUrl || ''}
            alt={movie.title}
            className="w-full h-full object-cover object-center opacity-35 filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121216] via-[#121216]/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-10 w-full flex flex-col md:flex-row items-end gap-8">
          {/* Poster Card */}
          <div className="w-48 sm:w-56 shrink-0 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-gray-900 -mb-16 hidden md:block">
            <img
              src={movie.posterUrl || ''}
              alt={movie.title}
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Details */}
          <div className="flex-1 space-y-3">
            <Link
              href="/phim"
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors mb-2"
            >
              <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#c8102e] text-white px-2.5 py-0.5 rounded text-xs font-black">
                {movie.ageRating}
              </span>
              <span className="bg-white/10 backdrop-blur text-gray-200 px-2.5 py-0.5 rounded text-xs font-semibold">
                {movie.durationMinutes} Phút
              </span>
              <span className="bg-white/10 backdrop-blur text-gray-200 px-2.5 py-0.5 rounded text-xs font-semibold">
                {movie.country}
              </span>
              {movie.ratingAvg ? (
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  {movie.ratingAvg.toFixed(1)} / 10 ({movie.ratingCount} đánh giá)
                </span>
              ) : null}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">{movie.title}</h1>
            {movie.originalTitle && (
              <p className="text-gray-400 italic text-sm">{movie.originalTitle}</p>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {movie.trailer?.embedUrl && (
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold text-xs border border-white/20 flex items-center gap-1.5 transition-all hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-white" /> Xem Trailer
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Body: Synopsis & Showtimes Selector */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-20 pb-16 w-full grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Synopsis & Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-border-subtle shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
              Tóm Tắt Nội Dung
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{movie.synopsis}</p>

            <div className="space-y-2 text-xs pt-2 border-t border-gray-100 text-gray-600">
              {movie.director && (
                <div>
                  <strong className="text-gray-900">Đạo diễn:</strong> {movie.director}
                </div>
              )}
              {castNames.length > 0 && (
                <div>
                  <strong className="text-gray-900">Diễn viên:</strong> {castNames.join(', ')}
                </div>
              )}
              {movie.genres && movie.genres.length > 0 && (
                <div>
                  <strong className="text-gray-900">Thể loại:</strong>{' '}
                  {movie.genres.map((g) => g.name).join(', ')}
                </div>
              )}
              {movie.subtitleInfo && (
                <div>
                  <strong className="text-gray-900">Ngôn ngữ:</strong> {movie.languages} -{' '}
                  {movie.subtitleInfo}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Showtime Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {/* Date Selector Tabs */}
          <div className="bg-white p-4 rounded-3xl border border-border-subtle shadow-sm">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-500 uppercase">
              <Calendar className="w-4 h-4 text-[#c8102e]" />
              <span>Chọn Ngày Chiếu</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {availableDates.map((item) => {
                const isSelected = selectedDate === item.date;
                return (
                  <button
                    key={item.date}
                    onClick={() => setSelectedDate(item.date)}
                    className={`flex flex-col items-center min-w-[72px] px-3 py-2.5 rounded-2xl transition-all ${
                      isSelected
                        ? 'bg-[#c8102e] text-white shadow-md shadow-red-900/30 scale-105'
                        : 'bg-surface-alt hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="text-[10px] font-semibold uppercase">{item.dayName}</span>
                    <span className="text-sm font-extrabold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Showtimes by Cinema */}
          <div className="space-y-6">
            {showtimesGrouped.length > 0 ? (
              showtimesGrouped.map((cinGroup: any) => (
                <div
                  key={cinGroup.cinema.id}
                  className="bg-white rounded-3xl p-6 border border-border-subtle shadow-sm space-y-5"
                >
                  {/* Cinema Header */}
                  <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#c8102e]" />
                        {cinGroup.cinema.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">{cinGroup.cinema.address}</p>
                    </div>
                    <Link
                      href={`/cum-rap?cinema=${cinGroup.cinema.slug}`}
                      className="text-xs font-bold text-[#c8102e] hover:underline flex items-center gap-1 shrink-0"
                    >
                      Xem lịch chiếu rạp &rarr;
                    </Link>
                  </div>

                  {/* Room Types & Showtimes */}
                  <div className="space-y-4">
                    {cinGroup.roomTypes.map((rt: any) => (
                      <div key={rt.roomType} className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800">
                            Phòng {rt.roomType} ({rt.capacity} ghế)
                          </span>
                        </div>

                        {/* Showtimes Grid */}
                        <div className="flex flex-wrap gap-2.5">
                          {rt.showtimes.map((st: any) => {
                            const isClosingSoon = st.status === 'CLOSING_SOON';
                            const isOpen = st.status === 'OPEN';
                            const isClosed = st.status === 'CLOSED';
                            const isOngoing = st.status === 'ONGOING';
                            const isEnded = st.status === 'ENDED';
                            const isSoldOut = st.status === 'SOLD_OUT';

                            const canBook = isOpen || isClosingSoon;

                            return canBook ? (
                              <Link
                                key={st.id}
                                href={user ? `/dat-ve/${st.id}` : `/auth/login?redirect=/dat-ve/${st.id}`}
                                className={`px-4 py-2.5 rounded-2xl border text-center transition-all hover:scale-105 ${
                                  isClosingSoon
                                    ? 'border-amber-400 bg-amber-50 hover:bg-amber-100 ring-2 ring-amber-300'
                                    : 'border-border-subtle bg-white hover:border-[#c8102e] hover:bg-red-50/50'
                                }`}
                              >
                                <div className="text-sm font-black text-gray-900">
                                  {st.timeDisplay.split(' – ')[0]}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  {formatVnd(st.priceFrom)}
                                </div>

                                {isClosingSoon && (
                                  <div className="text-[9px] font-bold text-amber-700 animate-pulse mt-0.5">
                                    Đóng sau {Math.floor(st.secondsUntilClose / 60)}p
                                  </div>
                                )}
                              </Link>
                            ) : (
                              <div
                                key={st.id}
                                className="px-4 py-2.5 rounded-2xl border border-gray-200 bg-gray-50 text-center opacity-60 cursor-not-allowed"
                                title={`Trạng thái: ${st.status}`}
                              >
                                <div className="text-sm font-bold text-gray-500 line-through">
                                  {st.timeDisplay.split(' – ')[0]}
                                </div>
                                <div className="text-[10px] font-semibold text-gray-400">
                                  {isClosed
                                    ? 'Đã Khóa'
                                    : isOngoing
                                    ? 'Đang Chiếu'
                                    : isEnded
                                    ? 'Đã Kết Thúc'
                                    : isSoldOut
                                    ? 'Hết Vé'
                                    : st.status}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 text-gray-400">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-500" />
                <p className="text-sm font-semibold text-gray-700">Chưa có suất chiếu vào ngày này</p>
                <p className="text-xs text-gray-400 mt-1">Vui lòng chọn ngày khác trong tuần.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        title={movie.title}
        youtubeId={movie.trailer?.youtubeId}
        embedUrl={movie.trailer?.embedUrl}
      />
    </div>
  );
}
