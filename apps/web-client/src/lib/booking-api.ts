export interface CatalogProperty {
  id: string;
  name: string;
  address: string | null;
  holdTtlSeconds: number;
  roomTypes: {
    id: string;
    name: string;
    basePrice: number;
    maxOccupancy: number;
    description: string | null;
    amenities: string[];
  }[];
}

export interface AvailabilityRow {
  roomTypeId: string;
  roomTypeName: string;
  available: number;
}

export interface QuoteResult {
  nights: { night: string; amount: number }[];
  totalAmount: number;
  currency: string;
  roomTypeName: string;
}

export interface HoldResult {
  id: string;
  propertyId: string;
  roomTypeId: string;
  nights: string[];
  expiresAt: string;
}

export interface CheckoutResult {
  booking: {
    id: string;
    checkIn: string;
    checkOut: string;
    status: string;
    totalAmount: number;
    propertyName?: string;
    roomTypeName?: string;
  };
  guest: { fullName: string; email: string; phone: string };
  invoice: { id: string; totalAmount: number; paymentStatus: string };
  paymentUrl: string;
}

export interface ConfirmationResult {
  booking: {
    id: string;
    bookingCode: string;
    checkIn: string;
    checkOut: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    checkinToken?: string | null;
    checkinTokenExpiresAt?: string | null;
  };
  guest: { fullName: string; email: string; phone: string };
  roomType: { id: string; name: string } | null;
  property: { id: string; name: string; address: string | null } | null;
  invoice: {
    id: string;
    totalAmount: number;
    paymentStatus: string;
    paidAt: string | null;
  } | null;
  qrPayload?: string | null;
  bookingCode?: string | null;
}

const API = '/api/v1/public';

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const raw = data?.message;
    let msg = 'Yêu cầu thất bại';
    if (typeof raw === 'string') msg = raw;
    else if (Array.isArray(raw)) msg = raw[0] ?? msg;
    else if (raw && typeof raw === 'object' && 'message' in raw) {
      msg = String((raw as { message: string }).message);
    }
    if (data?.code === 'ROOM_UNAVAILABLE') {
      msg =
        'Phòng vừa hết chỗ hoặc có thay đổi. Vui lòng quay lại bước 2 và chọn lại.';
    }
    if (res.status >= 500 && msg === 'Internal server error') {
      msg = 'Lỗi máy chủ khi xử lý đặt phòng. Vui lòng thử lại sau vài giây.';
    }
    throw new Error(msg);
  }
  return data as T;
}

function parseLocalDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Nights stayed: checkIn inclusive, checkOut exclusive (hotel checkout day). */
export function nightsBetween(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const cur = parseLocalDate(checkIn);
  const end = parseLocalDate(checkOut);
  while (cur < end) {
    dates.push(formatLocalDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function fetchCatalog() {
  const res = await fetch(`${API}/catalog`);
  return parseJson<{ properties: CatalogProperty[] }>(res);
}

export async function fetchAvailability(
  propertyId: string,
  from: string,
  to: string,
) {
  const q = new URLSearchParams({ propertyId, from, to });
  const res = await fetch(`${API}/availability?${q}`);
  return parseJson<AvailabilityRow[]>(res);
}

export type AvailabilityCalendarResult = {
  from: string;
  to: string;
  calendars: Record<string, { date: string; available: number }[]>;
};

export async function fetchAvailabilityCalendar(
  propertyId: string,
  from: string,
  to: string,
) {
  const q = new URLSearchParams({ propertyId, from, to });
  const res = await fetch(`${API}/availability/calendar?${q}`);
  return parseJson<AvailabilityCalendarResult>(res);
}

export async function fetchQuote(
  propertyId: string,
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
) {
  const q = new URLSearchParams({
    propertyId,
    roomTypeId,
    checkIn,
    checkOut,
  });
  const res = await fetch(`${API}/quote?${q}`);
  return parseJson<QuoteResult>(res);
}

export async function createHold(
  propertyId: string,
  roomTypeId: string,
  nights: string[],
) {
  const res = await fetch(`${API}/holds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId, roomTypeId, nights }),
  });
  return parseJson<HoldResult>(res);
}

export interface CheckoutGroupResult {
  bookings: {
    bookingId: string;
    roomTypeName: string;
    totalAmount: number;
  }[];
  guest: { fullName: string; email: string; phone: string };
  invoice: { id: string; totalAmount: number; paymentStatus: string };
  paymentUrl: string;
  primaryBookingId: string;
}

export async function checkoutGroup(payload: {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  lines: { roomTypeId: string; quantity: number }[];
  fullName: string;
  email: string;
  phone: string;
  partnerRef?: string;
}) {
  const res = await fetch(`${API}/checkout-group`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<CheckoutGroupResult>(res);
}

export async function checkout(payload: {
  holdId: string;
  fullName: string;
  email: string;
  phone: string;
  partnerRef?: string;
}) {
  const res = await fetch(`${API}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJson<CheckoutResult>(res);
}

export async function fetchConfirmation(bookingId: string, phone: string) {
  const q = new URLSearchParams({ phone });
  const res = await fetch(`${API}/confirmation/${bookingId}?${q}`);
  return parseJson<ConfirmationResult>(res);
}

export const PENDING_BOOKING_KEY = 'mango_pending_booking';

export function savePendingBooking(bookingId: string, phone: string) {
  sessionStorage.setItem(
    PENDING_BOOKING_KEY,
    JSON.stringify({ bookingId, phone }),
  );
}

export function loadPendingBooking(): { bookingId: string; phone: string } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_BOOKING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { bookingId: string; phone: string };
  } catch {
    return null;
  }
}

export function clearPendingBooking() {
  sessionStorage.removeItem(PENDING_BOOKING_KEY);
}
