'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRooms,
  createRoom,
  updateRoomStatus,
  deleteRoom,
  type CreateRoomData,
} from '@/lib/api/rooms';
import type { RoomStatus } from '@/types';
import { toast } from '@/hooks/use-toast';

/**
 * Query key factory for rooms.
 */
export const roomKeys = {
  all: (propertyId: string) => ['rooms', propertyId] as const,
};

/**
 * Hook to fetch all rooms for a property.
 */
export function useRooms(propertyId: string) {
  return useQuery({
    queryKey: roomKeys.all(propertyId),
    queryFn: () => getRooms(propertyId),
    enabled: !!propertyId,
  });
}

/**
 * Hook to create a new room. Invalidates the rooms query on success.
 */
export function useCreateRoom(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRoomData) => createRoom(propertyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.all(propertyId) });
      toast({
        title: 'Tạo phòng thành công',
        description: 'Phòng mới đã được thêm vào hệ thống.',
      });
    },
  });
}

/**
 * Hook to update room status.
 */
export function useUpdateRoomStatus(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, status }: { roomId: string; status: RoomStatus }) =>
      updateRoomStatus(propertyId, roomId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.all(propertyId) });
      toast({
        title: 'Cập nhật trạng thái',
        description: 'Trạng thái phòng đã được cập nhật.',
      });
    },
  });
}

/**
 * Hook to delete a room.
 */
export function useDeleteRoom(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => deleteRoom(propertyId, roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.all(propertyId) });
      toast({
        title: 'Xóa phòng',
        description: 'Phòng đã được xóa khỏi hệ thống.',
      });
    },
  });
}
