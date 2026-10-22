import type { Metadata } from 'next';
import '../styles/globals.css';
import { ThemeProvider } from '../context/ThemeContext';
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
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var s = localStorage.getItem('hustcen_theme');
                var d = s === 'dark' || (!s && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (d) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.colorScheme = 'dark';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="bg-background text-text-primary min-h-screen flex flex-col antialiased selection:bg-red-500 selection:text-white">
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
