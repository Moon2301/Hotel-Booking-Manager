import { toZonedTime, format as tzFormat } from 'date-fns-tz';

/**
 * Default date-time format (Vietnamese style)
 */
const DEFAULT_FORMAT = 'dd/MM/yyyy HH:mm';

/**
 * Get the timezone abbreviation for a given IANA timezone.
 * Returns abbreviation like 'ICT', 'UTC', 'JST', etc.
 *
 * @param timezone - IANA timezone string (e.g., 'Asia/Ho_Chi_Minh')
 * @param date - Optional date to determine the abbreviation (for DST-aware timezones)
 * @returns Timezone abbreviation string
 */
export function getTimezoneAbbreviation(
  timezone: string,
  date?: Date | string
): string {
  if (!timezone) {
    return '';
  }

  try {
    const referenceDate =
      date instanceof Date
        ? date
        : date
          ? new Date(date)
          : new Date();

    if (isNaN(referenceDate.getTime())) {
      return '';
    }

    const zonedDate = toZonedTime(referenceDate, timezone);
    // Use 'zzz' pattern to get the short timezone abbreviation
    return tzFormat(zonedDate, 'zzz', { timeZone: timezone });
  } catch {
    return '';
  }
}

/**
 * Format a UTC timestamp in a specific timezone with timezone abbreviation appended.
 *
 * @param utcTimestamp - UTC timestamp as ISO string or Date object
 * @param timezone - IANA timezone string (e.g., 'Asia/Ho_Chi_Minh')
 * @param formatStr - Optional format string (default: 'dd/MM/yyyy HH:mm')
 * @returns Formatted date string with timezone abbreviation (e.g., "10/06/2025 15:00 (ICT)")
 */
export function formatInTimezone(
  utcTimestamp: string | Date,
  timezone: string,
  formatStr: string = DEFAULT_FORMAT
): string {
  if (!utcTimestamp || !timezone) {
    return '';
  }

  try {
    const date =
      utcTimestamp instanceof Date ? utcTimestamp : new Date(utcTimestamp);

    if (isNaN(date.getTime())) {
      return '';
    }

    const zonedDate = toZonedTime(date, timezone);
    const formatted = tzFormat(zonedDate, formatStr, { timeZone: timezone });
    const abbreviation = getTimezoneAbbreviation(timezone, date);

    return `${formatted} (${abbreviation})`;
  } catch {
    return '';
  }
}

/**
 * Format a UTC timestamp as date only in a specific timezone.
 * Format: 'dd/MM/yyyy'
 *
 * @param utcTimestamp - UTC timestamp as ISO string or Date object
 * @param timezone - IANA timezone string
 * @returns Formatted date string (e.g., "10/06/2025")
 */
export function formatDateInTimezone(
  utcTimestamp: string | Date,
  timezone: string
): string {
  if (!utcTimestamp || !timezone) {
    return '';
  }

  try {
    const date =
      utcTimestamp instanceof Date ? utcTimestamp : new Date(utcTimestamp);

    if (isNaN(date.getTime())) {
      return '';
    }

    const zonedDate = toZonedTime(date, timezone);
    return tzFormat(zonedDate, 'dd/MM/yyyy', { timeZone: timezone });
  } catch {
    return '';
  }
}

/**
 * Format a UTC timestamp as time only in a specific timezone.
 * Format: 'HH:mm'
 *
 * @param utcTimestamp - UTC timestamp as ISO string or Date object
 * @param timezone - IANA timezone string
 * @returns Formatted time string (e.g., "15:00")
 */
export function formatTimeInTimezone(
  utcTimestamp: string | Date,
  timezone: string
): string {
  if (!utcTimestamp || !timezone) {
    return '';
  }

  try {
    const date =
      utcTimestamp instanceof Date ? utcTimestamp : new Date(utcTimestamp);

    if (isNaN(date.getTime())) {
      return '';
    }

    const zonedDate = toZonedTime(date, timezone);
    return tzFormat(zonedDate, 'HH:mm', { timeZone: timezone });
  } catch {
    return '';
  }
}
