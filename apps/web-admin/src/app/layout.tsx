import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClientProviders } from '@/providers/client-providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hotel Admin Panel',
  description: 'Web Admin Panel for Hotel Booking Manager',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen font-sans antialiased`}
        suppressHydrationWarning
      >
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
