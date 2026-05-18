import { describe, it, expect } from 'vitest';
import {
  formatInTimezone,
  formatDateInTimezone,
  formatTimeInTimezone,
  getTimezoneAbbreviation,
} from './timezone';

describe('getTimezoneAbbreviation', () => {
  it('should return ICT for Asia/Ho_Chi_Minh', () => {
    const result = getTimezoneAbbreviation('Asia/Ho_Chi_Minh');
    expect(result).toBe('GMT+7');
  });

  it('should return abbreviation for UTC', () => {
    const result = getTimezoneAbbreviation('UTC');
    expect(result).toBe('UTC');
  });

  it('should return abbreviation for Asia/Tokyo', () => {
    const result = getTimezoneAbbreviation('Asia/Tokyo');
    expect(result).toBe('GMT+9');
  });

  it('should return empty string for empty timezone', () => {
    const result = getTimezoneAbbreviation('');
    expect(result).toBe('');
  });

  it('should return empty string for invalid timezone', () => {
    const result = getTimezoneAbbreviation('Invalid/Timezone');
    expect(result).toBe('');
  });

  it('should accept a Date object as reference date', () => {
    const date = new Date('2025-06-10T08:00:00Z');
    const result = getTimezoneAbbreviation('Asia/Ho_Chi_Minh', date);
    expect(result).toBe('GMT+7');
  });

  it('should accept an ISO string as reference date', () => {
    const result = getTimezoneAbbreviation(
      'Asia/Ho_Chi_Minh',
      '2025-06-10T08:00:00Z'
    );
    expect(result).toBe('GMT+7');
  });

  it('should return empty string for invalid date', () => {
    const result = getTimezoneAbbreviation('Asia/Ho_Chi_Minh', 'not-a-date');
    expect(result).toBe('');
  });
});

describe('formatInTimezone', () => {
  it('should format UTC timestamp in Asia/Ho_Chi_Minh timezone', () => {
    // 2025-06-10T08:00:00Z = 2025-06-10 15:00 in ICT (UTC+7)
    const result = formatInTimezone(
      '2025-06-10T08:00:00Z',
      'Asia/Ho_Chi_Minh'
    );
    expect(result).toBe('10/06/2025 15:00 (GMT+7)');
  });

  it('should format with custom format string', () => {
    const result = formatInTimezone(
      '2025-06-10T08:00:00Z',
      'Asia/Ho_Chi_Minh',
      'yyyy-MM-dd HH:mm:ss'
    );
    expect(result).toBe('2025-06-10 15:00:00 (GMT+7)');
  });

  it('should format Date object input', () => {
    const date = new Date('2025-06-10T08:00:00Z');
    const result = formatInTimezone(date, 'Asia/Ho_Chi_Minh');
    expect(result).toBe('10/06/2025 15:00 (GMT+7)');
  });

  it('should format in UTC timezone', () => {
    const result = formatInTimezone('2025-06-10T08:00:00Z', 'UTC');
    expect(result).toBe('10/06/2025 08:00 (UTC)');
  });

  it('should format in Asia/Tokyo timezone (UTC+9)', () => {
    // 2025-06-10T08:00:00Z = 2025-06-10 17:00 in JST (UTC+9)
    const result = formatInTimezone('2025-06-10T08:00:00Z', 'Asia/Tokyo');
    expect(result).toBe('10/06/2025 17:00 (GMT+9)');
  });

  it('should handle date crossing midnight boundary', () => {
    // 2025-06-10T22:00:00Z = 2025-06-11 05:00 in ICT (UTC+7)
    const result = formatInTimezone(
      '2025-06-10T22:00:00Z',
      'Asia/Ho_Chi_Minh'
    );
    expect(result).toBe('11/06/2025 05:00 (GMT+7)');
  });

  it('should return empty string for empty timestamp', () => {
    const result = formatInTimezone('', 'Asia/Ho_Chi_Minh');
    expect(result).toBe('');
  });

  it('should return empty string for empty timezone', () => {
    const result = formatInTimezone('2025-06-10T08:00:00Z', '');
    expect(result).toBe('');
  });

  it('should return empty string for invalid timestamp', () => {
    const result = formatInTimezone('not-a-date', 'Asia/Ho_Chi_Minh');
    expect(result).toBe('');
  });

  it('should return empty string for invalid timezone', () => {
    const result = formatInTimezone('2025-06-10T08:00:00Z', 'Invalid/Zone');
    expect(result).toBe('');
  });
});

describe('formatDateInTimezone', () => {
  it('should format date only in Asia/Ho_Chi_Minh timezone', () => {
    const result = formatDateInTimezone(
      '2025-06-10T08:00:00Z',
      'Asia/Ho_Chi_Minh'
    );
    expect(result).toBe('10/06/2025');
  });

  it('should handle date crossing midnight boundary', () => {
    // 2025-06-10T22:00:00Z = 2025-06-11 in ICT (UTC+7)
    const result = formatDateInTimezone(
      '2025-06-10T22:00:00Z',
      'Asia/Ho_Chi_Minh'
    );
    expect(result).toBe('11/06/2025');
  });

  it('should format Date object input', () => {
    const date = new Date('2025-06-10T08:00:00Z');
    const result = formatDateInTimezone(date, 'Asia/Ho_Chi_Minh');
    expect(result).toBe('10/06/2025');
  });

  it('should return empty string for empty timestamp', () => {
    const result = formatDateInTimezone('', 'Asia/Ho_Chi_Minh');
    expect(result).toBe('');
  });

  it('should return empty string for empty timezone', () => {
    const result = formatDateInTimezone('2025-06-10T08:00:00Z', '');
    expect(result).toBe('');
  });

  it('should return empty string for invalid timestamp', () => {
    const result = formatDateInTimezone('invalid', 'Asia/Ho_Chi_Minh');
    expect(result).toBe('');
  });
});

describe('formatTimeInTimezone', () => {
  it('should format time only in Asia/Ho_Chi_Minh timezone', () => {
    // 2025-06-10T08:00:00Z = 15:00 in ICT (UTC+7)
    const result = formatTimeInTimezone(
      '2025-06-10T08:00:00Z',
      'Asia/Ho_Chi_Minh'
    );
    expect(result).toBe('15:00');
  });

  it('should format time crossing midnight', () => {
    // 2025-06-10T22:30:00Z = 05:30 next day in ICT (UTC+7)
    const result = formatTimeInTimezone(
      '2025-06-10T22:30:00Z',
      'Asia/Ho_Chi_Minh'
    );
    expect(result).toBe('05:30');
  });

  it('should format Date object input', () => {
    const date = new Date('2025-06-10T08:00:00Z');
    const result = formatTimeInTimezone(date, 'Asia/Ho_Chi_Minh');
    expect(result).toBe('15:00');
  });

  it('should format in UTC timezone', () => {
    const result = formatTimeInTimezone('2025-06-10T08:30:00Z', 'UTC');
    expect(result).toBe('08:30');
  });

  it('should return empty string for empty timestamp', () => {
    const result = formatTimeInTimezone('', 'Asia/Ho_Chi_Minh');
    expect(result).toBe('');
  });

  it('should return empty string for empty timezone', () => {
    const result = formatTimeInTimezone('2025-06-10T08:00:00Z', '');
    expect(result).toBe('');
  });

  it('should return empty string for invalid timestamp', () => {
    const result = formatTimeInTimezone('invalid', 'Asia/Ho_Chi_Minh');
    expect(result).toBe('');
  });
});
