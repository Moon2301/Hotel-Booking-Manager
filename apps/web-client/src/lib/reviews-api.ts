export type PublicReview = {
  id: string;
  propertyId: string;
  bookingId: string;
  guestId: string;
  rating: number;
  content: string | null;
  createdAt: string;
};

export type Paginated<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
};

const API = '/api/v1/public';

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    const raw = (data as any)?.message;
    const msg = typeof raw === 'string' ? raw : 'Yêu cầu thất bại';
    throw new Error(msg);
  }
  return data as T;
}

export async function fetchPublicReviews(propertyId: string, limit = 6) {
  const q = new URLSearchParams({ propertyId, limit: String(limit) });
  const res = await fetch(`${API}/reviews?${q.toString()}`);
  return parseJson<Paginated<PublicReview>>(res);
}

