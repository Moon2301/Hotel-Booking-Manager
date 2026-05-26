'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type PropertySelectionContextValue = {
  selectedPropertyId: string;
  setSelectedPropertyId: (id: string) => void;
  clearSelectedPropertyId: () => void;
};

const PropertySelectionContext = createContext<PropertySelectionContextValue | null>(
  null,
);

const STORAGE_KEY = 'hotel_admin:selected_property_id';

export function PropertySelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedPropertyId, setSelectedPropertyIdState] = useState<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSelectedPropertyIdState(saved);
    } catch {
      // ignore
    }
  }, []);

  const setSelectedPropertyId = (id: string) => {
    setSelectedPropertyIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  };

  const clearSelectedPropertyId = () => {
    setSelectedPropertyIdState('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({ selectedPropertyId, setSelectedPropertyId, clearSelectedPropertyId }),
    [selectedPropertyId],
  );

  return (
    <PropertySelectionContext.Provider value={value}>
      {children}
    </PropertySelectionContext.Provider>
  );
}

export function usePropertySelection() {
  const ctx = useContext(PropertySelectionContext);
  // In rare cases (e.g. during build-time prerendering or if a page is rendered
  // outside the dashboard shell), we prefer a safe no-op fallback over crashing.
  if (!ctx) {
    return {
      selectedPropertyId: '',
      setSelectedPropertyId: () => undefined,
      clearSelectedPropertyId: () => undefined,
    };
  }
  return ctx;
}

