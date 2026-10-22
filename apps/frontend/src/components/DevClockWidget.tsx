'use client';

import React, { useState } from 'react';
import { useClock } from '../context/ClockContext';
import { Clock, FastForward, RotateCcw, Calendar, ChevronUp, ChevronDown, Check } from 'lucide-react';

export const DevClockWidget: React.FC = () => {
  const { status, displayHeader, isSimulated, offsetMinutes, fastForward, setToDateTime, resetClock } = useClock();
  const [isOpen, setIsOpen] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async (fn: () => Promise<void>) => {
    try {
      setLoading(true);
      await fn();
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside aria-label="Dev Clock Time Travel Widget" className="fixed bottom-5 right-5 z-50">
      {/* Collapsed Button */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-2xl font-semibold text-xs transition-transform hover:scale-105 ${
            isSimulated
              ? 'bg-amber-500 text-gray-900 border-2 border-amber-300 shadow-amber-500/30'
              : 'bg-[#1A1A1F] text-white border border-gray-700 shadow-black/40'
          }`}
        >
          <Clock className={`w-4 h-4 ${isSimulated ? 'animate-spin' : 'text-red-400'}`} />
          <span className="font-mono">
            {isSimulated ? `SIM: ${offsetMinutes >= 0 ? `+${offsetMinutes}m` : `${offsetMinutes}m`}` : 'Dev Clock'}
          </span>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      ) : (
        /* Expanded Floating Toolbar */
        <div className="bg-[#1A1A1F] text-white rounded-2xl shadow-2xl border border-gray-700 w-80 p-4 text-xs animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
            <div className="flex items-center gap-1.5 font-bold text-white text-sm">
              <Clock className="w-4 h-4 text-red-500" />
              <span>Dev Clock Time Travel</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Current Display Time */}
          <div className="bg-gray-900/80 rounded-xl p-2.5 mb-3 border border-gray-800">
            <div className="text-[10px] text-gray-400 uppercase font-semibold mb-0.5">Giờ Ảo Hiện Tại</div>
            <div className="font-mono text-amber-300 font-bold text-xs">{displayHeader}</div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
              <span>Độ lệch: {offsetMinutes} phút</span>
              {isSimulated ? (
                <span className="text-amber-400 font-semibold">● Đang mô phỏng</span>
              ) : (
                <span className="text-emerald-400 font-semibold">● Giờ thực</span>
              )}
            </div>
          </div>

          {/* Quick Fast Forward Buttons */}
          <div className="space-y-1.5 mb-3">
            <div className="text-[10px] font-semibold text-gray-400 uppercase">Tua Nhanh Thời Gian</div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                disabled={loading}
                onClick={() => handleAction(() => fastForward(15))}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 py-1.5 px-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 hover:text-red-400 disabled:opacity-50"
              >
                <FastForward className="w-3 h-3 text-red-400" /> +15m
              </button>
              <button
                disabled={loading}
                onClick={() => handleAction(() => fastForward(60))}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 py-1.5 px-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 hover:text-red-400 disabled:opacity-50"
              >
                <FastForward className="w-3 h-3 text-red-400" /> +1h
              </button>
              <button
                disabled={loading}
                onClick={() => handleAction(() => fastForward(1440))}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 py-1.5 px-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-1 hover:text-red-400 disabled:opacity-50"
              >
                <FastForward className="w-3 h-3 text-red-400" /> +1 ngày
              </button>
            </div>
          </div>

          {/* Custom Date Time Setter */}
          <div className="space-y-1.5 mb-3">
            <div className="text-[10px] font-semibold text-gray-400 uppercase">Đặt Giờ Cụ Thể</div>
            <div className="flex gap-1.5">
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white flex-1 focus:outline-none focus:border-red-500"
              />
              <button
                disabled={loading || !customDate}
                onClick={() => handleAction(() => setToDateTime(customDate))}
                className="bg-[#c8102e] hover:bg-[#8e0b1f] text-white px-2.5 py-1 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Reset Real Time */}
          <button
            disabled={loading || !isSimulated}
            onClick={() => handleAction(resetClock)}
            className="w-full bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Khôi Phục Giờ Thực
          </button>
        </div>
      )}
    </aside>
  );
};
