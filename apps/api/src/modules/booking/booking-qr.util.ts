import * as QRCode from 'qrcode';
import { buildBookingQrPayload } from './booking-token.util';

export async function createBookingQrDataUrl(
  bookingCode: string,
): Promise<string> {
  const payload = buildBookingQrPayload(bookingCode);
  return QRCode.toDataURL(payload, {
    width: 260,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}

export async function createTokenQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    width: 260,
    margin: 2,
    errorCorrectionLevel: 'M',
  });
}

export type QrMailAttachment = {
  filename: string;
  content: Buffer;
  cid: string;
  contentDisposition: 'inline';
  contentType: 'image/png';
};

/** Inline PNG for nodemailer — many clients block data: URLs in img src */
export function qrDataUrlToMailAttachment(
  dataUrl: string,
  cid: string,
): QrMailAttachment | null {
  if (!dataUrl?.startsWith('data:image')) return null;
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
  if (!base64) return null;
  return {
    filename: `${cid}.png`,
    content: Buffer.from(base64, 'base64'),
    cid,
    contentDisposition: 'inline',
    contentType: 'image/png',
  };
}
