import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReviews, moderateReview } from '@/lib/api/reviews';
import { ReviewStatus } from '@/types';

export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (filters: string) => [...reviewKeys.lists(), { filters }] as const,
};

export function useReviews(params?: { propertyId?: string; status?: ReviewStatus; page?: number; limit?: number }) {
  return useQuery({
    queryKey: reviewKeys.list(JSON.stringify(params || {})),
    queryFn: () => getReviews(params),
  });
}

export function useModerateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: ReviewStatus; reason?: string } }) => moderateReview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
  });
}
