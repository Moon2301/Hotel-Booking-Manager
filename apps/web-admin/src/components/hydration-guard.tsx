'use client';

import { useMounted } from '@/hooks/use-mounted';

/**
 * Renders children only after the browser has mounted.
 * Server and the first client paint share the same fallback — avoids hydration mismatch
 * from localStorage, Date.now(), Radix IDs, locale formatting, etc.
 */
export function HydrationGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const mounted = useMounted();

  if (!mounted) {
    return (
      fallback ?? (
        <div
          className="min-h-[50vh] animate-pulse rounded-xl bg-muted/30"
          aria-busy="true"
          aria-label="Đang tải giao diện"
        />
      )
    );
  }

  return <>{children}</>;
}
