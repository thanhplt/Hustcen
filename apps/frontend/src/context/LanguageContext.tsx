'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Lang = 'VI' | 'EN';

const translations = {
  VI: {
    brand_sub: 'Rạp Chiếu Phim Kỹ Thuật Bách Khoa',
    nav_home: 'Trang Chủ',
    nav_movies: 'Phim',
    nav_cinemas: 'Cụm Rạp',
    nav_prices: 'Giá Vé',
    nav_schedule: 'Lịch Chiếu',
    now_showing: 'Phim Đang Chiếu',
    coming_soon: 'Phim Sắp Chiếu',
    watch_trailer: 'Xem Trailer',
    book_now: 'Đặt Vé',
    notify_me: 'Nhận Thông Báo',
    all_genres: 'Tất Cả Thể Loại',
    all_formats: 'Tất Cả Định Dạng',
    search_placeholder: 'Tìm kiếm tên phim, diễn viên...',
    select_cinema: 'Chọn rạp',
    select_date: 'Chọn ngày',
    seats_remaining: 'ghế trống',
    sold_out: 'Hết Vé',
    closing_soon: 'Sắp Khóa Đặt Vé',
    closed: 'Đã Khóa Đặt Vé',
    ongoing: 'Đang Chiếu',
    ended: 'Đã Kết Thúc',
    standard_room: 'Tiêu Chuẩn',
    imax_room: 'IMAX Laser',
    luxury_room: 'Luxury VIP',
    private_room: 'Private Lab',
    hold_countdown: 'Thời gian giữ ghế còn lại',
    hold_expired: 'Thời gian giữ ghế đã hết!',
    continue_btn: 'Tiếp Tục',
    back_btn: 'Quay Lại',
    payment_btn: 'Thanh Toán',
    total_amount: 'Tổng Tiền',
    login: 'Đăng Nhập',
    logout: 'Đăng Xuất',
    admin_panel: 'Quản Trị',
    staff_pos: 'Thu Ngân POS',
    scanner: 'Soát Vé QR',
    dev_clock: 'Dev Clock Time Travel',
  },
  EN: {
    brand_sub: 'Hanoi Technical University Cinema',
    nav_home: 'Home',
    nav_movies: 'Movies',
    nav_cinemas: 'Cinemas',
    nav_prices: 'Pricing',
    nav_schedule: 'Schedule',
    now_showing: 'Now Showing',
    coming_soon: 'Coming Soon',
    watch_trailer: 'Watch Trailer',
    book_now: 'Book Now',
    notify_me: 'Notify Me',
    all_genres: 'All Genres',
    all_formats: 'All Formats',
    search_placeholder: 'Search movies, actors...',
    select_cinema: 'Select cinema',
    select_date: 'Select date',
    seats_remaining: 'seats left',
    sold_out: 'Sold Out',
    closing_soon: 'Closing Soon',
    closed: 'Booking Closed',
    ongoing: 'Ongoing',
    ended: 'Ended',
    standard_room: 'Standard',
    imax_room: 'IMAX Laser',
    luxury_room: 'Luxury VIP',
    private_room: 'Private Lab',
    hold_countdown: 'Seat hold countdown',
    hold_expired: 'Seat hold expired!',
    continue_btn: 'Continue',
    back_btn: 'Back',
    payment_btn: 'Pay Now',
    total_amount: 'Total Amount',
    login: 'Log In',
    logout: 'Log Out',
    admin_panel: 'Admin Portal',
    staff_pos: 'Box Office POS',
    scanner: 'QR Scanner',
    dev_clock: 'Dev Clock Time Travel',
  },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: keyof typeof translations['VI']) => string;
}

const LanguageContext = createContext<LanguageContextType>({} as any);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('VI');

  useEffect(() => {
    const saved = localStorage.getItem('hustcine_lang') as Lang;
    if (saved && (saved === 'VI' || saved === 'EN')) {
      setLang(saved);
    }
  }, []);

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('hustcine_lang', newLang);
  };

  const toggleLang = () => {
    changeLang(lang === 'VI' ? 'EN' : 'VI');
  };

  const t = (key: keyof typeof translations['VI']) => {
    return translations[lang][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);
