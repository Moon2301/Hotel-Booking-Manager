import { get } from '@/lib/api-client';
import type { PaginatedResponse, Guest } from '@/types';

export async function getGuests(params?: { search?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  return get<PaginatedResponse<Guest>>(`/guests?${query.toString()}`);
}
