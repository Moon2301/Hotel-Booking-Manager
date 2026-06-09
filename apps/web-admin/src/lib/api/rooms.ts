'use client';

import { get, post, patch, del } from '@/lib/api-client';
import type { Room, RoomStatus } from '@/types';

export interface CreateRoomData {
  roomTypeId: string;
  roomNumber: string;
  floor?: number;
  notes?: string;
}

/**
 * Fetch all rooms for a given property.
 */
export async function getRooms(propertyId: string): Promise<Room[]> {
  return get<Room[]>(`/properties/${propertyId}/rooms`);
}

/**
 * Create a new physical room for a given property.
 */
export async function createRoom(
  propertyId: string,
  data: CreateRoomData
): Promise<Room> {
  return post<Room>(`/properties/${propertyId}/rooms`, data);
}

/**
 * Update room status (state machine enforced on backend).
 */
export async function updateRoomStatus(
  propertyId: string,
  roomId: string,
  status: RoomStatus
): Promise<Room> {
  return patch<Room>(`/properties/${propertyId}/rooms/${roomId}/status`, {
    status,
  });
}

/**
 * Delete a physical room.
 */
export async function deleteRoom(
  propertyId: string,
  roomId: string
): Promise<void> {
  return del<void>(`/properties/${propertyId}/rooms/${roomId}`);
}
