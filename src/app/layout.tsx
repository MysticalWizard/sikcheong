import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '식당청소 뺑뺑이 - 청소 당번 랜덤 뽑기',
  description: '식당청소 당번을 랜덤으로 뽑아주는 웹 애플리케이션입니다.',
  authors: [{ name: '원식K' }],
  keywords: ['식당청소', '청소 당번', '랜덤', '뽑기', '팀 구성'],
  metadataBase: new URL('https://sandbox.mystwiz.net/sikcheong'),
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <div id="root" className="min-h-screen flex flex-col">
          <div className="flex-grow">{children}</div>
          <footer className="py-4 text-center text-xs text-muted-foreground">
            Powered by 원식K - 식뺑
          </footer>
        </div>
      </body>
    </html>
  );
}
