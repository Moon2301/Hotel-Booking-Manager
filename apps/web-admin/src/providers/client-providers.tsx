'use client';

import dynamic from 'next/dynamic';
import { QueryProvider } from './query-provider';
import { SocketProvider } from '@/contexts/socket-context';

const Toaster = dynamic(
  () => import('@/components/ui/toaster').then((mod) => mod.Toaster),
  { ssr: false },
);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <SocketProvider>
        {children}
        <Toaster />
      </SocketProvider>
    </QueryProvider>
  );
}
