import { get, patch, post } from '@/lib/api-client';
import type { RoomType } from '@/types';
import type { RoomTypeFormValues } from '@/schemas/room-type.schema';

/**
 * Fetch all room types for a given property.
 */
export async function getRoomTypes(propertyId: string): Promise<RoomType[]> {
  return get<RoomType[]>(`/properties/${propertyId}/room-types`);
}

/**
 * Create a new room type for a given property.
 */
export async function createRoomType(
  propertyId: string,
  data: RoomTypeFormValues
): Promise<RoomType> {
  return post<RoomType>(`/properties/${propertyId}/room-types`, data);
}

export async function updateRoomType(
  propertyId: string,
  roomTypeId: string,
  data: Partial<RoomTypeFormValues>,
): Promise<RoomType> {
  return patch<RoomType>(
    `/properties/${propertyId}/room-types/${roomTypeId}`,
    data,
  );
}
