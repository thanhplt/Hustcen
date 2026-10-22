import type { Metadata } from 'next';
import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ClockProvider } from '../context/ClockContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { DevClockWidget } from '../components/DevClockWidget';

export const metadata: Metadata = {
  title: 'HUST Cine - Hệ Thống Đặt Vé Phim Bách Khoa',
  description:
    'Hệ thống rạp chiếu phim hiện đại chuẩn công nghệ, phục vụ cộng đồng sinh viên, giảng viên và khán giả yêu điện ảnh tại Hà Nội.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-background text-text-primary min-h-screen flex flex-col antialiased selection:bg-red-500 selection:text-white">
        <AuthProvider>
          <LanguageProvider>
            <ClockProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <DevClockWidget />
            </ClockProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
