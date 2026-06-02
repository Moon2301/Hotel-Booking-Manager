import { randomUUID } from 'crypto';

export const BOOKING_GROUP_REF_PREFIX = 'groupRef:';

export function makeBookingGroupRef(): string {
  return `${BOOKING_GROUP_REF_PREFIX}${randomUUID()}`;
}

export function getBookingGroupRef(notes: string | null | undefined): string | null {
  const n = notes?.trim();
  if (!n?.startsWith(BOOKING_GROUP_REF_PREFIX)) return null;
  return n;
}
