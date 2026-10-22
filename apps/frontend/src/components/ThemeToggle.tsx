'use client';

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Sparkles } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'icon' | 'pill' | 'button';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'icon',
  className = '',
  showLabel = false,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();

  if (variant === 'pill') {
    return (
      <button
        onClick={toggleTheme}
        className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#c8102e] focus:ring-offset-2 ${
          isDark
            ? 'bg-slate-800 border border-slate-700 shadow-inner'
            : 'bg-red-50 border border-red-200 shadow-sm'
        } ${className}`}
        aria-label={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
        title={isDark ? 'Chuyển sang chế độ Sáng (Light Mode)' : 'Chuyển sang chế độ Tối (Dark Mode)'}
      >
        <span
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-transform duration-300 transform shadow-md ${
            isDark
              ? 'translate-x-9 bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900'
              : 'translate-x-1 bg-white text-slate-700'
          }`}
        >
          {isDark ? (
            <Sun className="w-3.5 h-3.5 fill-current animate-spin-slow" />
          ) : (
            <Moon className="w-3.5 h-3.5 fill-slate-700" />
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`relative group p-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 active:scale-95 border ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border-slate-700 shadow-md shadow-black/20 hover:border-amber-400/40 hover:shadow-amber-400/10'
          : 'bg-white hover:bg-red-50/80 text-gray-700 hover:text-[#c8102e] border-gray-200 shadow-sm hover:border-red-300'
      } ${className}`}
      aria-label={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
      title={isDark ? 'Chuyển sang chế độ Sáng (Light Mode)' : 'Chuyển sang chế độ Tối (Dark Mode)'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-500 rotate-0 group-hover:rotate-90 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700 group-hover:text-[#c8102e] transition-transform duration-500 rotate-0 group-hover:-rotate-12 group-hover:scale-110" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-semibold select-none hidden sm:inline">
          {isDark ? 'Chế Độ Tối' : 'Chế Độ Sáng'}
        </span>
      )}
    </button>
  );
};
