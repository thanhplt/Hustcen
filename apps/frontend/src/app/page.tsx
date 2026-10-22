'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { Movie, Cinema } from '../types';
import { MovieCard } from '../components/MovieCard';
import { TrailerModal } from '../components/TrailerModal';
import { useAuth } from '../context/AuthContext';
import {
  Film,
  Play,
  Ticket,
  Sparkles,
  MapPin,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Tv,
  Users,
  Award,
} from 'lucide-react';

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinema, setSelectedCinema] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'NOW_SHOWING' | 'COMING_SOON'>('NOW_SHOWING');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [heroTrailerOpen, setHeroTrailerOpen] = useState(false);
  const { user } = useAuth();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollStep = 270;
      scrollContainerRef.current.scrollBy({
        left: direction === 'right' ? scrollStep : -scrollStep,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 350);
    }
  };

  useEffect(() => {
    checkScroll();
    const timer = setTimeout(checkScroll, 100);
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [checkScroll, activeTab]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [moviesRes, cinemasRes] = await Promise.all([
          api.getMovies(),
          api.getCinemas(),
        ]);
        if (Array.isArray(moviesRes)) {
          setMovies(moviesRes);
        } else if (Array.isArray(moviesRes?.items)) {
          setMovies(moviesRes.items);
        } else if (moviesRes?.movies) {
          setMovies(moviesRes.movies);
        }
        if (Array.isArray(cinemasRes)) {
          setCinemas(cinemasRes);
        }
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const heroMovie = movies.find((m) => m.slug === 'chien-binh-cong-nghe-ky-nguyen-moi') || movies[0];

  const filteredMovies = movies.filter((m) => {
    const matchesTab = m.status === activeTab;
    if (!matchesTab) return false;
    if (formatFilter === 'ALL') return true;
    try {
      const formats: string[] = m.formats ? JSON.parse(m.formats) : [];
      return formats.includes(formatFilter);
    } catch {
      return true;
    }
  });

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Hero Showcase Section */}
      {heroMovie && (
        <section className="relative w-full min-h-[520px] lg:min-h-[600px] bg-[#121216] text-white flex items-center overflow-hidden">
          {/* Backdrop Image with Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src={heroMovie.backdropUrl || heroMovie.posterUrl || ''}
              alt={heroMovie.title}
              className="w-full h-full object-cover object-center opacity-40 filter blur-[1px] scale-105 transform animate-pulse duration-1000"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#121216] via-[#121216]/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121216] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 py-16 flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 space-y-5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="bg-[#c8102e] text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1 shadow-md shadow-red-900/50">
                  <Sparkles className="w-3.5 h-3.5" /> Phim Nổi Bật Bách Khoa
                </span>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  IMAX 3D Laser
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-md">
                {heroMovie.title}
              </h1>

              {heroMovie.originalTitle && (
                <p className="text-gray-400 italic text-base -mt-2">{heroMovie.originalTitle}</p>
              )}

              <p className="text-sm sm:text-base text-gray-300 line-clamp-3 leading-relaxed">
                {heroMovie.synopsis}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href={user ? `/phim/${heroMovie.slug}` : `/auth/login?redirect=/phim/${heroMovie.slug}`}
                  className="px-6 py-3.5 rounded-xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-red-900/40 hover:scale-105 transition-all"
                >
                  <Ticket className="w-4 h-4" /> Đặt Vé Ngay
                </Link>

                {heroMovie.trailer?.embedUrl && (
                  <button
                    onClick={() => setHeroTrailerOpen(true)}
                    className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white font-semibold text-sm border border-white/20 flex items-center gap-2 transition-all hover:scale-105"
                  >
                    <Play className="w-4 h-4 fill-white" /> Xem Trailer
                  </button>
                )}
              </div>
            </div>

            {/* Poster Preview */}
            <div className="hidden lg:block w-72 shrink-0">
              <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 transform rotate-1 hover:rotate-0 transition-transform duration-300">
                <img
                  src={heroMovie.posterUrl || ''}
                  alt={heroMovie.title}
                  className="w-full h-auto object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Quick Cinema Selector & Tech Highlights */}
      <section className="bg-white dark:bg-slate-900/90 border-b border-border-subtle dark:border-slate-800 py-4 shadow-sm transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-[#c8102e] dark:text-red-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Chọn cụm rạp xem lịch chiếu</div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedCinema}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCinema(val);
                    if (val) {
                      window.location.href = `/cum-rap?cinema=${val}`;
                    }
                  }}
                  className="font-bold text-sm text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
                >
                  <option value="" className="dark:bg-slate-900 dark:text-white">Chọn rạp để xem lịch chiếu ({cinemas.length} rạp)...</option>
                  {cinemas.map((c) => (
                    <option key={c.id} value={c.slug} className="dark:bg-slate-900 dark:text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
                <Link
                  href="/cum-rap"
                  className="text-xs font-bold text-[#c8102e] dark:text-red-400 hover:underline shrink-0"
                >
                  Xem tất cả rạp &rarr;
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <Tv className="w-4 h-4 text-[#c8102e] dark:text-red-400" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">IMAX Laser & Dolby Atmos</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Users className="w-4 h-4 text-[#B8902A] dark:text-amber-400" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">Phòng Private Lab 10 chỗ</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">Ưu đãi sinh viên 45.000đ</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Movie Catalog Section with Horizontal Slider & > Button */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12 flex-1 w-full">
        {/* Tab & Format Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setActiveTab('NOW_SHOWING');
                if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
              }}
              className={`text-lg sm:text-xl font-extrabold pb-2 transition-colors border-b-2 ${
                activeTab === 'NOW_SHOWING'
                  ? 'text-[#c8102e] border-[#c8102e] dark:text-red-400 dark:border-red-500'
                  : 'text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Phim Đang Chiếu
            </button>
            <button
              onClick={() => {
                setActiveTab('COMING_SOON');
                if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
              }}
              className={`text-lg sm:text-xl font-extrabold pb-2 transition-colors border-b-2 ${
                activeTab === 'COMING_SOON'
                  ? 'text-[#c8102e] border-[#c8102e] dark:text-red-400 dark:border-red-500'
                  : 'text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Phim Sắp Chiếu
            </button>
          </div>

          {/* Format Pills & Header Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['ALL', '2D', '3D', 'IMAX'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => {
                    setFormatFilter(fmt);
                    if (scrollContainerRef.current) scrollContainerRef.current.scrollLeft = 0;
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    formatFilter === fmt
                      ? 'bg-[#c8102e] text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {fmt === 'ALL' ? 'Tất Cả' : fmt}
                </button>
              ))}
            </div>

            {/* Quick Header Arrow Controls */}
            {filteredMovies.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 border-l border-gray-200 dark:border-slate-800 pl-3">
                <button
                  onClick={() => handleScroll('left')}
                  disabled={!canScrollLeft}
                  className={`p-2 rounded-xl border transition-all ${
                    canScrollLeft
                      ? 'border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:border-[#c8102e] hover:text-[#c8102e] hover:bg-red-50/50 dark:hover:bg-red-950/30 shadow-sm'
                      : 'border-gray-200 dark:border-slate-800 text-gray-300 dark:text-slate-600 cursor-not-allowed opacity-40'
                  }`}
                  aria-label="Xem phim trước"
                  title="Xem phim trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleScroll('right')}
                  disabled={!canScrollRight}
                  className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1 text-xs font-bold ${
                    canScrollRight
                      ? 'bg-[#c8102e] text-white hover:bg-[#8e0b1f] shadow-md hover:scale-105 active:scale-95'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                  aria-label="Xem thêm lần lượt các phim"
                  title="Bấm để xem thêm lần lượt các phim"
                >
                  <span>Xem thêm</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Movies Carousel with > Navigation Button */}
        {loading ? (
          <div className="flex gap-5 sm:gap-6 overflow-hidden py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-[210px] sm:w-[235px] md:w-[250px] shrink-0 animate-pulse bg-gray-200 dark:bg-slate-800 aspect-[2/3] rounded-2xl"
              />
            ))}
          </div>
        ) : filteredMovies.length > 0 ? (
          <div className="relative">
            {/* Floating Left Button (<) */}
            {canScrollLeft && (
              <button
                onClick={() => handleScroll('left')}
                className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 text-gray-800 dark:text-white border border-gray-200 dark:border-slate-700 shadow-2xl dark:shadow-black/70 flex items-center justify-center hover:bg-[#c8102e] hover:text-white hover:border-[#c8102e] hover:scale-110 active:scale-95 transition-all"
                aria-label="Xem phim trước đó"
                title="Xem phim trước đó"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
            )}

            {/* Floating Right Button (>) - The key requirement! */}
            {canScrollRight && (
              <button
                onClick={() => handleScroll('right')}
                className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-30 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white dark:bg-slate-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-slate-700 shadow-2xl dark:shadow-black/70 flex items-center justify-center hover:bg-[#c8102e] hover:text-white hover:border-[#c8102e] hover:scale-110 active:scale-95 transition-all animate-pulse hover:animate-none"
                aria-label="Xem thêm lần lượt các phim"
                title="Bấm để xem thêm lần lượt các phim"
              >
                <ChevronRight className="w-7 h-7 stroke-[3] translate-x-0.5" />
              </button>
            )}

            {/* Subtle Gradient Shadow on Right to Hint More Content */}
            {canScrollRight && (
              <div
                onClick={() => handleScroll('right')}
                className="cursor-pointer absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white/95 via-white/40 to-transparent dark:from-[#090d16]/95 dark:via-[#090d16]/40 z-10 flex items-center justify-end pr-2 opacity-80 hover:opacity-100 transition-opacity"
              />
            )}

            {/* Subtle Gradient Shadow on Left */}
            {canScrollLeft && (
              <div
                onClick={() => handleScroll('left')}
                className="cursor-pointer absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white/95 via-white/40 to-transparent dark:from-[#090d16]/95 dark:via-[#090d16]/40 z-10 flex items-center justify-start pl-2 opacity-80 hover:opacity-100 transition-opacity"
              />
            )}

            {/* Horizontal Scroll Track (Single Row) */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="flex items-stretch gap-5 sm:gap-6 overflow-x-auto scrollbar-none scroll-smooth snap-x snap-mandatory py-4 px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredMovies.map((movie) => (
                <div
                  key={movie.id}
                  className="w-[210px] sm:w-[235px] md:w-[250px] shrink-0 snap-start"
                >
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>

            {/* Subtext info */}
            <div className="flex items-center justify-between text-xs text-gray-400 mt-2 px-1">
              <span>Đang hiển thị {filteredMovies.length} bộ phim</span>
              <button
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                className="flex items-center gap-1 font-semibold text-gray-600 hover:text-[#c8102e] disabled:opacity-40 transition-colors"
              >
                <span>Bấm nút</span>
                <span className="w-5 h-5 rounded-full bg-[#c8102e] text-white inline-flex items-center justify-center text-[10px] font-bold">
                  &gt;
                </span>
                <span>để xem thêm lần lượt các phim</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-400">
            <Film className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#c8102e]" />
            <p className="text-base font-semibold text-gray-600">Không tìm thấy phim phù hợp</p>
            <p className="text-xs text-gray-400 mt-1">Vui lòng chọn định dạng khác hoặc quay lại sau.</p>
          </div>
        )}
      </section>

      {/* 4. Student & Technical University Promo Banner */}
      <section className="bg-gradient-to-r from-[#9e001f] to-[#c8102e] text-white py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Ưu Đãi Đặc Quyền Bách Khoa
            </span>
            <h2 className="text-2xl sm:text-3xl font-black">Thứ 4 Vui Vẻ - Vé Sinh Viên Chỉ 45.000đ</h2>
            <p className="text-xs sm:text-sm text-red-100 leading-relaxed">
              Áp dụng cho toàn bộ học sinh, sinh viên các trường đại học tại Hà Nội vào mỗi thứ Tư hàng tuần. Mang theo thẻ sinh viên khi nhận vé tại quầy!
            </p>
          </div>
          <Link
            href="/gia-ve"
            className="px-6 py-3.5 rounded-xl bg-white text-[#c8102e] font-extrabold text-sm hover:bg-gray-100 shadow-xl hover:scale-105 transition-transform"
          >
            Xem Bảng Giá Vé
          </Link>
        </div>
      </section>

      {/* Hero Trailer Modal */}
      {heroMovie && (
        <TrailerModal
          isOpen={heroTrailerOpen}
          onClose={() => setHeroTrailerOpen(false)}
          title={heroMovie.title}
          youtubeId={heroMovie.trailer?.youtubeId}
          embedUrl={heroMovie.trailer?.embedUrl}
        />
      )}
    </div>
  );
}
