'use client';

import React from 'react';
import { Seat } from '../types';
import { Armchair, Accessibility } from 'lucide-react';

interface SeatMapProps {
  seats: Seat[];
  selectedSeatIds: string[];
  onToggleSeat: (seat: Seat) => void;
  roomType?: string;
  isPrivateLab?: boolean;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  onToggleSeat,
  roomType = 'STANDARD',
  isPrivateLab = false,
}) => {
  // Group seats by rowCode
  const rowMap = new Map<string, Seat[]>();
  for (const s of seats) {
    if (!rowMap.has(s.rowCode)) {
      rowMap.set(s.rowCode, []);
    }
    rowMap.get(s.rowCode)!.push(s);
  }

  // Sort rows alphabetically
  const sortedRows = Array.from(rowMap.keys()).sort();

  return (
    <div className="w-full flex flex-col items-center bg-white rounded-3xl p-6 sm:p-8 border border-border-subtle shadow-sm">
      {/* Screen Curved Header */}
      <div className="w-full max-w-2xl text-center mb-10">
        <div className="cinema-screen-curve" />
        <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mt-2 block">
          MÀN HÌNH CHIẾU
        </span>
      </div>

      {isPrivateLab && (
        <div className="mb-6 bg-red-50 border border-red-200 text-[#c8102e] px-4 py-2.5 rounded-xl text-xs font-semibold text-center max-w-lg">
          🏢 <strong>Phòng Chiếu Private Lab Toàn Phòng</strong>: Chọn 1 ghế bất kỳ để giữ toàn bộ 10 ghế trong phòng!
        </div>
      )}

      {/* Seat Grid */}
      <div className="w-full overflow-x-auto pb-4 flex justify-center">
        <div className="flex flex-col gap-2 min-w-fit px-4">
          {sortedRows.map((rowCode) => {
            const rowSeats = rowMap.get(rowCode)!.sort((a, b) => a.seatNumber - b.seatNumber);

            return (
              <div key={rowCode} className="flex items-center gap-2 justify-center">
                {/* Row Label Left */}
                <span className="w-6 text-center font-bold text-xs text-gray-400 select-none">
                  {rowCode}
                </span>

                {/* Seats in Row */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {rowSeats.map((seat) => {
                    const isSelected = selectedSeatIds.includes(seat.id);
                    const isBooked = seat.status === 'BOOKED';
                    const isHeld = seat.status === 'HELD' && !isSelected;
                    const isVip = seat.seatType === 'VIP';
                    const isCouple = seat.seatType === 'COUPLE';
                    const isWheelchair = seat.isWheelchair || seat.seatType === 'WHEELCHAIR';

                    // Styling based on state and type
                    let btnStyle = 'bg-white border-2 border-gray-300 text-gray-700 hover:border-[#c8102e]';
                    let widthStyle = 'w-7 sm:w-8 h-7 sm:h-8';

                    if (isCouple) {
                      widthStyle = 'w-16 sm:w-20 h-7 sm:h-8';
                    }

                    if (isBooked) {
                      btnStyle = 'bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed';
                    } else if (isHeld) {
                      btnStyle = 'bg-amber-100 border-amber-400 text-amber-700 cursor-not-allowed';
                    } else if (isSelected) {
                      btnStyle = 'bg-[#c8102e] border-[#c8102e] text-white shadow-md shadow-red-900/30 font-bold';
                    } else if (isVip) {
                      btnStyle = 'bg-white border-2 border-amber-500 text-amber-800 hover:bg-amber-50 shadow-sm';
                    } else if (isCouple) {
                      btnStyle = 'bg-pink-50 border-2 border-pink-400 text-pink-700 hover:bg-pink-100';
                    } else if (isWheelchair) {
                      btnStyle = 'bg-blue-50 border-2 border-blue-400 text-blue-700 hover:bg-blue-100';
                    }

                    return (
                      <button
                        key={seat.id}
                        disabled={isBooked || isHeld}
                        onClick={() => onToggleSeat(seat)}
                        className={`rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all duration-150 select-none ${widthStyle} ${btnStyle}`}
                        title={`Ghế ${seat.seatLabel} (${seat.seatType}) - ${
                          isBooked ? 'Đã bán' : isHeld ? 'Đang có người giữ' : isSelected ? 'Đã chọn' : 'Còn trống'
                        }`}
                      >
                        {isWheelchair ? (
                          <Accessibility className="w-3.5 h-3.5" />
                        ) : isCouple ? (
                          <span>{seat.seatLabel} (Đôi)</span>
                        ) : (
                          seat.seatNumber
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Row Label Right */}
                <span className="w-6 text-center font-bold text-xs text-gray-400 select-none">
                  {rowCode}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Seat Status Legend */}
      <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-gray-300 bg-white" />
          <span>Thường</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-amber-500 bg-white" />
          <span className="text-amber-800 font-semibold">VIP</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-4 rounded border-2 border-pink-400 bg-pink-50" />
          <span className="text-pink-700 font-semibold">Ghế Đôi (Couple)</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[#c8102e]" />
          <span className="text-[#c8102e] font-bold">Đang Chọn</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-100 border border-amber-400" />
          <span>Đang Giữ</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-200" />
          <span className="text-gray-400">Đã Bán</span>
        </div>
      </div>
    </div>
  );
};
