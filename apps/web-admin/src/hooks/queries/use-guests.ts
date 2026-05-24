import { useQuery } from '@tanstack/react-query';
import { getGuests } from '@/lib/api/guests';

export const guestKeys = {
  all: ['guests'] as const,
  lists: () => [...guestKeys.all, 'list'] as const,
  list: (filters: string) => [...guestKeys.lists(), { filters }] as const,
};

export function useGuests(params?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: guestKeys.list(JSON.stringify(params || {})),
    queryFn: () => getGuests(params),
  });
}
