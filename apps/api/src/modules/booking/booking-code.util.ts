import * as crypto from 'crypto';

/** Crockford-like alphabet (no 0/O, 1/I/L) for readable 6-char codes */
const BOOKING_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const BOOKING_CODE_REGEX = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateBookingCode(): string {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += BOOKING_CODE_ALPHABET[bytes[i]! % BOOKING_CODE_ALPHABET.length];
  }
  return code;
}

export function normalizeBookingCodeInput(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

export function isBookingCodeFormat(value: string): boolean {
  return BOOKING_CODE_REGEX.test(normalizeBookingCodeInput(value));
}

export function isUuidFormat(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}
