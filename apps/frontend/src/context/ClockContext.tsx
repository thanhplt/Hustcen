'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { ClockStatus } from '../types';

interface ClockContextType {
  status: ClockStatus | null;
  currentDate: Date;
  displayHeader: string;
  isSimulated: boolean;
  offsetMinutes: number;
  fastForward: (minutes: number) => Promise<void>;
  setToDateTime: (dateStr: string) => Promise<void>;
  resetClock: () => Promise<void>;
  refreshClock: () => Promise<void>;
}

const ClockContext = createContext<ClockContextType>({} as any);

export const ClockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ClockStatus | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getClockStatus();
      if (data) {
        setStatus(data);
        if (data.serverNow) {
          setCurrentDate(new Date(data.serverNow));
        }
      }
    } catch (err) {
      // fallback
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 20000); // 20s sync
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Local second ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setCurrentDate((prev) => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  const fastForward = async (minutes: number) => {
    const newOffset = (status?.offsetMinutes || 0) + minutes;
    await api.setClock({ offsetMinutes: newOffset });
    await fetchStatus();
  };

  const setToDateTime = async (dateStr: string) => {
    await api.setClock({ setTo: new Date(dateStr).toISOString() });
    await fetchStatus();
  };

  const resetClock = async () => {
    await api.resetClock();
    await fetchStatus();
  };

  // Format header time in Asia/Ho_Chi_Minh
  const formatHeader = () => {
    const vnTime = new Date(currentDate.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const hh = String(vnTime.getHours()).padStart(2, '0');
    const mm = String(vnTime.getMinutes()).padStart(2, '0');
    const ss = String(vnTime.getSeconds()).padStart(2, '0');
    const dd = String(vnTime.getDate()).padStart(2, '0');
    const mo = String(vnTime.getMonth() + 1).padStart(2, '0');
    const yyyy = vnTime.getFullYear();

    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[vnTime.getDay()];

    return `${dayName}, ${dd}/${mo}/${yyyy} - ${hh}:${mm}:${ss}`;
  };

  return (
    <ClockContext.Provider
      value={{
        status,
        currentDate,
        displayHeader: formatHeader(),
        isSimulated: !!status?.isSimulated,
        offsetMinutes: status?.offsetMinutes || 0,
        fastForward,
        setToDateTime,
        resetClock,
        refreshClock: fetchStatus,
      }}
    >
      {children}
    </ClockContext.Provider>
  );
};

export const useClock = () => useContext(ClockContext);
