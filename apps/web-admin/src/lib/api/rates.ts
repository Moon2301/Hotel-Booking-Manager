import { get, put } from '@/lib/api-client';

export interface DailyRate {
  id: string;
  propertyId: string;
  roomTypeId: string;
  ratePlanId: string | null;
  night: string;
  amount: number;
  currency: string;
  taxIncluded: boolean;
  minStay: number;
  closedToArrival: boolean;
}

export type DailyRateInput = {
  roomTypeId: string;
  night: string;
  amount: number;
  taxIncluded?: boolean;
};

export function listDailyRates(
  propertyId: string,
  from: string,
  to: string,
) {
  const q = new URLSearchParams({ from, to });
  return get<DailyRate[]>(`/properties/${propertyId}/rates?${q}`);
}

export function bulkUpdateDailyRates(
  propertyId: string,
  rates: DailyRateInput[],
) {
  return put<DailyRate[]>(`/properties/${propertyId}/rates/bulk`, { rates });
}
