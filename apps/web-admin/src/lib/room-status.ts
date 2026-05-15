import { Room, RoomStatus } from '@/types';

/**
 * Valid room status transitions as defined by the state machine.
 *
 * AVAILABLE → [RESERVED, MAINTENANCE]
 * RESERVED → [OCCUPIED, AVAILABLE]
 * OCCUPIED → [CLEANING]
 * CLEANING → [AVAILABLE, MAINTENANCE]
 * MAINTENANCE → [AVAILABLE]
 */
export const VALID_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  [RoomStatus.AVAILABLE]: [RoomStatus.RESERVED, RoomStatus.MAINTENANCE],
  [RoomStatus.RESERVED]: [RoomStatus.OCCUPIED, RoomStatus.AVAILABLE],
  [RoomStatus.OCCUPIED]: [RoomStatus.CLEANING],
  [RoomStatus.CLEANING]: [RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE],
  [RoomStatus.MAINTENANCE]: [RoomStatus.AVAILABLE],
};

/**
 * Check if a transition from one status to another is valid.
 */
export function canTransition(from: RoomStatus, to: RoomStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get the list of valid target statuses from the current status.
 */
export function getValidTransitions(current: RoomStatus): RoomStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/**
 * Group an array of rooms by their status.
 * Returns a record with all RoomStatus keys, each containing an array of rooms with that status.
 */
export function groupRoomsByStatus(rooms: Room[]): Record<RoomStatus, Room[]> {
  const groups: Record<RoomStatus, Room[]> = {
    [RoomStatus.AVAILABLE]: [],
    [RoomStatus.RESERVED]: [],
    [RoomStatus.OCCUPIED]: [],
    [RoomStatus.CLEANING]: [],
    [RoomStatus.MAINTENANCE]: [],
  };

  for (const room of rooms) {
    if (groups[room.status]) {
      groups[room.status].push(room);
    }
  }

  return groups;
}
