import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, updateTask } from '@/lib/api/tasks';
import { TaskStatus } from '@/types';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: string) => [...taskKeys.lists(), { filters }] as const,
};

export function useTasks(params?: { propertyId?: string; bookingId?: string; status?: TaskStatus }) {
  return useQuery({
    queryKey: taskKeys.list(JSON.stringify(params || {})),
    queryFn: () => getTasks(params),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: TaskStatus; staffReport?: string; assignedToId?: string } }) => updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
