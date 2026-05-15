import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

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
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
