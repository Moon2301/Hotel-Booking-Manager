'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoomTypes, createRoomType } from '@/lib/api/room-types';
import type { RoomTypeFormValues } from '@/schemas/room-type.schema';
import { toast } from '@/hooks/use-toast';

/**
 * Query key factory for room types.
 */
export const roomTypeKeys = {
  all: (propertyId: string) => ['room-types', propertyId] as const,
};

/**
 * Hook to fetch room types for a property.
 */
export function useRoomTypes(propertyId: string) {
  return useQuery({
    queryKey: roomTypeKeys.all(propertyId),
    queryFn: () => getRoomTypes(propertyId),
    enabled: !!propertyId,
  });
}

/**
 * Hook to create a new room type. Invalidates the room types query on success.
 */
export function useCreateRoomType(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RoomTypeFormValues) => createRoomType(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomTypeKeys.all(propertyId) });
      toast({
        title: 'Room type created',
        description: 'The new room type has been created successfully.',
      });
    },
  });
}
