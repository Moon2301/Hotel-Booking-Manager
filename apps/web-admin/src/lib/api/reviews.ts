import { get, patch } from '@/lib/api-client';
import type { PaginatedResponse, Review, ReviewStatus } from '@/types';

export async function getReviews(params?: { propertyId?: string; status?: ReviewStatus; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.propertyId) query.append('propertyId', params.propertyId);
  if (params?.status) query.append('status', params.status);
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));

  return get<PaginatedResponse<Review>>(`/reviews?${query.toString()}`);
}

export async function moderateReview(id: string, data: { status: ReviewStatus; reason?: string }) {
  return patch<Review>(`/reviews/${id}/moderate`, data);
}
