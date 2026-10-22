'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Movie } from '../types';
import { TrailerModal } from './TrailerModal';
import { useAuth } from '../context/AuthContext';
import { Play, Star, Clock } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onNotifyMe?: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onNotifyMe }) => {
  const [trailerOpen, setTrailerOpen] = useState(false);
  const { user } = useAuth();

  // Age badge colors
  const getAgeBadge = (age: string) => {
    switch (age) {
      case 'P':
        return 'bg-emerald-500 text-white';
      case 'K':
        return 'bg-blue-500 text-white';
      case 'T13':
        return 'bg-amber-500 text-white';
      case 'T16':
        return 'bg-orange-500 text-white';
      case 'T18':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const parsedFormats: string[] = (() => {
    try {
      return movie.formats ? JSON.parse(movie.formats) : ['2D'];
    } catch {
      return ['2D'];
    }
  })();

  const posterSrc =
    movie.poster?.large ||
    movie.posterUrl ||
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';

  return (
    <>
      <div className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-border-subtle shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        {/* Poster Container */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100">
          <img
            src={posterSrc}
            alt={movie.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';
            }}
          />

          {/* Age Tag */}
          <div className="absolute top-2.5 left-2.5 z-10">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wider shadow ${getAgeBadge(
                movie.ageRating,
              )}`}
            >
              {movie.ageRating}
            </span>
          </div>

          {/* Formats Tags */}
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 z-10 items-end">
            {parsedFormats.map((fmt) => (
              <span
                key={fmt}
                className="bg-black/75 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/20 shadow"
              >
                {fmt}
              </span>
            ))}
          </div>

          {/* Rating Badge */}
          {movie.ratingAvg ? (
            <div className="absolute bottom-2.5 left-2.5 bg-black/80 backdrop-blur-md text-amber-400 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{movie.ratingAvg.toFixed(1)}</span>
            </div>
          ) : null}

          {/* Hover Trailer Overlay Button */}
          {movie.trailer?.embedUrl && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setTrailerOpen(true);
                }}
                className="w-12 h-12 rounded-full bg-[#c8102e] hover:bg-[#8e0b1f] text-white flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                title="Xem Trailer"
              >
                <Play className="w-5 h-5 fill-white ml-0.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1 justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>{movie.durationMinutes} phút</span>
              {movie.genres && movie.genres.length > 0 && (
                <>
                  <span>•</span>
                  <span className="line-clamp-1">{movie.genres.map((g) => g.name).join(', ')}</span>
                </>
              )}
            </div>

            <Link href={`/phim/${movie.slug}`}>
              <h3 className="font-bold text-gray-900 text-sm hover:text-[#c8102e] transition-colors line-clamp-1">
                {movie.title}
              </h3>
            </Link>

            {movie.originalTitle && (
              <p className="text-xs text-gray-500 italic line-clamp-1 mt-0.5">{movie.originalTitle}</p>
            )}
          </div>

          {/* Action Button */}
          <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center gap-2">
            {movie.trailer?.embedUrl && (
              <button
                onClick={() => setTrailerOpen(true)}
                className="px-2.5 py-2 rounded-xl border border-border-subtle hover:bg-surface-highlight text-gray-700 hover:text-[#c8102e] text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Trailer"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}

            {movie.bookingCta === 'BOOK' || movie.status === 'NOW_SHOWING' ? (
              <Link
                href={user ? `/phim/${movie.slug}` : `/auth/login?redirect=/phim/${movie.slug}`}
                className="flex-1 py-2 text-center rounded-xl bg-[#c8102e] hover:bg-[#8e0b1f] text-white font-bold text-xs shadow-sm hover:shadow transition-all"
              >
                Đặt Vé
              </Link>
            ) : movie.bookingCta === 'NOTIFY_ME' || movie.status === 'COMING_SOON' ? (
              <button
                onClick={() => onNotifyMe && onNotifyMe(movie)}
                className="flex-1 py-2 text-center rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs transition-colors"
              >
                Nhận Thông Báo
              </button>
            ) : (
              <Link
                href={`/phim/${movie.slug}`}
                className="flex-1 py-2 text-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs transition-colors"
              >
                Chi Tiết
              </Link>
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
    </>
  );
};
