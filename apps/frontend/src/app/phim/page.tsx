'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Movie, Genre } from '../../types';
import { MovieCard } from '../../components/MovieCard';
import { Search, Filter, Film } from 'lucide-react';

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedFormat, setSelectedFormat] = useState<string>('ALL');
  const [selectedAge, setSelectedAge] = useState<string>('ALL');

  useEffect(() => {
    async function fetchMovies() {
      try {
        setLoading(true);
        const res = await api.getMovies();
        if (Array.isArray(res)) {
          setMovies(res);
        } else if (Array.isArray(res?.items)) {
          setMovies(res.items);
        } else if (res?.movies) {
          setMovies(res.movies);
        }
      } catch (err) {
        console.error('Failed to fetch movies', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMovies();
  }, []);

  const filtered = movies.filter((m) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchOrig = m.originalTitle?.toLowerCase().includes(q);
      if (!matchTitle && !matchOrig) return false;
    }

    // Status
    if (selectedStatus !== 'ALL' && m.status !== selectedStatus) {
      return false;
    }

    // Age
    if (selectedAge !== 'ALL' && m.ageRating !== selectedAge) {
      return false;
    }

    // Format
    if (selectedFormat !== 'ALL') {
      try {
        const fmts: string[] = m.formats ? JSON.parse(m.formats) : [];
        if (!fmts.includes(selectedFormat)) return false;
      } catch {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Danh Mục Phim Chiếu Rạp
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Khám phá những tác phẩm điện ảnh bom tấn và đặc sắc tại cụm rạp HUST Cine
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border-subtle shadow-sm mb-8 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm phim theo tên, tác giả, diễn viên..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#c8102e] focus:ring-1 focus:ring-[#c8102e]"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-gray-500 font-semibold mb-1">Trạng Thái</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 font-medium text-gray-800 focus:outline-none focus:border-[#c8102e]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NOW_SHOWING">Đang chiếu</option>
              <option value="COMING_SOON">Sắp chiếu</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Định Dạng</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 font-medium text-gray-800 focus:outline-none focus:border-[#c8102e]"
            >
              <option value="ALL">Tất cả định dạng</option>
              <option value="2D">2D Kỹ Thuật Số</option>
              <option value="3D">3D Thực Thể</option>
              <option value="IMAX">IMAX Laser</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-500 font-semibold mb-1">Độ Tuổi</label>
            <select
              value={selectedAge}
              onChange={(e) => setSelectedAge(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 font-medium text-gray-800 focus:outline-none focus:border-[#c8102e]"
            >
              <option value="ALL">Tất cả độ tuổi</option>
              <option value="P">P - Phổ biến mọi lứa tuổi</option>
              <option value="K">K - Dưới 13 tuổi có người lớn</option>
              <option value="T13">T13 - Khán giả từ 13 tuổi</option>
              <option value="T16">T16 - Khán giả từ 16 tuổi</option>
              <option value="T18">T18 - Khán giả từ 18 tuổi</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearch('');
                setSelectedStatus('ALL');
                setSelectedFormat('ALL');
                setSelectedAge('ALL');
              }}
              className="w-full py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
            >
              Đặt Lại Bộ Lọc
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-gray-500 font-medium mb-6">
        Tìm thấy <strong>{filtered.length}</strong> bộ phim phù hợp
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-200 aspect-[2/3] rounded-2xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filtered.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center text-gray-400 bg-white rounded-3xl border border-gray-100">
          <Film className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#c8102e]" />
          <p className="text-base font-semibold text-gray-700">Không có bộ phim nào phù hợp</p>
          <p className="text-xs text-gray-400 mt-1">Thử thay đổi từ khóa hoặc bộ lọc tìm kiếm.</p>
        </div>
      )}
    </div>
  );
}
