import { get, patch, post } from '@/lib/api-client';
import type { Booking, BookingCharge, Invoice, Room } from '@/types';

export { listServiceItems } from '@/lib/api/service-catalog';

export type RoomFolioResponse = {
  room: Room;
  booking: Booking | null;
  occupants: Array<{ id: string; fullName: string; idDocumentType: string; isPrimary: boolean }>;
  charges: BookingCharge[];
  depositInvoice: Invoice | null;
  finalInvoice: Invoice | null;
  totals: { roomTotal: number; chargesTotal: number; grandTotal: number };
};

export function getRoomFolio(propertyId: string, roomId: string) {
  return get<RoomFolioResponse>(`/properties/${propertyId}/rooms/${roomId}/folio`);
}

export function postCharge(
  bookingId: string,
  data: { serviceItemId: string; quantity: number },
) {
  return post<BookingCharge>(`/bookings/${bookingId}/charges`, {
    serviceItemId: data.serviceItemId,
    quantity: data.quantity,
    unitPrice: 0, // ignored when serviceItemId is provided
  });
}

export function checkOutBooking(bookingId: string) {
  return patch(`/bookings/${bookingId}/check-out`, {});
}

