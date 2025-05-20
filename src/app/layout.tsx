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
  title: '식당청소 뺑뺑이',
  description: '사다리 억까는 이제 그만!',
  authors: [{ name: '원식K' }],
  keywords: ['식당청소', '식청', '사다리타기', '랜덤', '뽑기', '원식K'],
  metadataBase: new URL('https://sandbox.mystwiz.net/'),
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
