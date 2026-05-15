import { useMemo } from 'react';
import {
  formatInTimezone,
  formatDateInTimezone,
  formatTimeInTimezone,
  getTimezoneAbbreviation,
} from '@/lib/timezone';

/**
 * Hook that provides timezone-aware formatting helpers for a given property timezone.
 *
 * @param timezone - IANA timezone string from property data (e.g., 'Asia/Ho_Chi_Minh')
 * @returns Object with formatting functions and timezone info
 */
export function useTimezone(timezone: string) {
  const helpers = useMemo(() => {
    const abbreviation = getTimezoneAbbreviation(timezone);

    return {
      /** The IANA timezone string */
      timezone,
      /** Timezone abbreviation (e.g., 'ICT', 'UTC') */
      abbreviation,
      /**
       * Format a UTC timestamp with full date-time and timezone abbreviation.
       * Default format: 'dd/MM/yyyy HH:mm (TZ)'
       */
      format: (utcTimestamp: string | Date, formatStr?: string) =>
        formatInTimezone(utcTimestamp, timezone, formatStr),
      /**
       * Format a UTC timestamp as date only: 'dd/MM/yyyy'
       */
      formatDate: (utcTimestamp: string | Date) =>
        formatDateInTimezone(utcTimestamp, timezone),
      /**
       * Format a UTC timestamp as time only: 'HH:mm'
       */
      formatTime: (utcTimestamp: string | Date) =>
        formatTimeInTimezone(utcTimestamp, timezone),
    };
  }, [timezone]);

  return helpers;
}
