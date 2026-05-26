import * as crypto from 'crypto';

/** Mã xác thực đặt phòng: SHA-256(bookingId + secret) */
export function hashBookingVerificationCode(
  bookingId: string,
  secret: string,
): string {
  return crypto
    .createHash('sha256')
    .update(`${bookingId}:${secret}`, 'utf8')
    .digest('hex');
}

/** Nội dung quét QR — booking id + mã xác thực */
export function buildBookingQrPayload(
  bookingId: string,
  secret: string,
): string {
  const code = hashBookingVerificationCode(bookingId, secret);
  return JSON.stringify({ bookingId, verificationCode: code });
}
