import { get, patch, post } from '@/lib/api-client';

export interface ReferralPartner {
  id: string;
  name: string;
  code: string;
  commissionRatePercent: number;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerSummary {
  partner: ReferralPartner;
  referralUrl: string;
  stats: {
    totalBookings: number;
    paidBookings: number;
    accruedCommission: number;
    paidOutCommission: number;
  };
}

export type PartnerCommissionStatus = 'ACCRUED' | 'PAID_OUT' | 'CANCELLED';

export interface PartnerCommissionRow {
  id: string;
  partnerId: string;
  bookingId: string;
  bookingAmount: number;
  commissionRatePercent: number;
  commissionAmount: number;
  status: PartnerCommissionStatus;
  paidOutAt: string | null;
  createdAt: string;
  partner?: ReferralPartner;
  booking?: {
    id: string;
    checkIn: string;
    checkOut: string;
    bookingCode?: string | null;
    guest?: { fullName: string; email: string };
  };
}

export interface CreatePartnerInput {
  name: string;
  code: string;
  commissionRatePercent?: number;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export function listPartners() {
  return get<PartnerSummary[]>('/partners');
}

export function createPartner(body: CreatePartnerInput) {
  return post<PartnerSummary>('/partners', body);
}

export function updatePartner(
  id: string,
  body: Partial<CreatePartnerInput> & { isActive?: boolean },
) {
  return patch<PartnerSummary>(`/partners/${id}`, body);
}

export function listPartnerCommissions(partnerId?: string) {
  const q = partnerId ? `?partnerId=${encodeURIComponent(partnerId)}` : '';
  return get<PartnerCommissionRow[]>(`/partners/commissions${q}`);
}

export function markCommissionPaidOut(commissionId: string) {
  return post<PartnerCommissionRow>(
    `/partners/commissions/${commissionId}/paid-out`,
    {},
  );
}
