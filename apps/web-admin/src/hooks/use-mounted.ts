'use client';

import { useEffect, useState } from 'react';

/** True after client mount — use to skip SSR/client-only UI (clocks, locale dates). */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
