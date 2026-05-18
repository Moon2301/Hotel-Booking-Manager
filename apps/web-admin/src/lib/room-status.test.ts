import { describe, it, expect } from 'vitest';
import { canTransition, getValidTransitions, groupRoomsByStatus, VALID_TRANSITIONS } from './room-status';
import { Room, RoomStatus } from '@/types';

describe('room-status utilities', () => {
  describe('canTransition', () => {
    it('allows AVAILABLE → RESERVED', () => {
      expect(canTransition(RoomStatus.AVAILABLE, RoomStatus.RESERVED)).toBe(true);
    });

    it('allows AVAILABLE → MAINTENANCE', () => {
      expect(canTransition(RoomStatus.AVAILABLE, RoomStatus.MAINTENANCE)).toBe(true);
    });

    it('allows RESERVED → OCCUPIED', () => {
      expect(canTransition(RoomStatus.RESERVED, RoomStatus.OCCUPIED)).toBe(true);
    });

    it('allows RESERVED → AVAILABLE', () => {
      expect(canTransition(RoomStatus.RESERVED, RoomStatus.AVAILABLE)).toBe(true);
    });

    it('allows OCCUPIED → CLEANING', () => {
      expect(canTransition(RoomStatus.OCCUPIED, RoomStatus.CLEANING)).toBe(true);
    });

    it('allows CLEANING → AVAILABLE', () => {
      expect(canTransition(RoomStatus.CLEANING, RoomStatus.AVAILABLE)).toBe(true);
    });

    it('allows CLEANING → MAINTENANCE', () => {
      expect(canTransition(RoomStatus.CLEANING, RoomStatus.MAINTENANCE)).toBe(true);
    });

    it('allows MAINTENANCE → AVAILABLE', () => {
      expect(canTransition(RoomStatus.MAINTENANCE, RoomStatus.AVAILABLE)).toBe(true);
    });

    it('rejects AVAILABLE → OCCUPIED (not a valid transition)', () => {
      expect(canTransition(RoomStatus.AVAILABLE, RoomStatus.OCCUPIED)).toBe(false);
    });

    it('rejects AVAILABLE → CLEANING', () => {
      expect(canTransition(RoomStatus.AVAILABLE, RoomStatus.CLEANING)).toBe(false);
    });

    it('rejects OCCUPIED → AVAILABLE (must go through CLEANING)', () => {
      expect(canTransition(RoomStatus.OCCUPIED, RoomStatus.AVAILABLE)).toBe(false);
    });

    it('rejects MAINTENANCE → RESERVED', () => {
      expect(canTransition(RoomStatus.MAINTENANCE, RoomStatus.RESERVED)).toBe(false);
    });

    it('rejects same-status transition', () => {
      expect(canTransition(RoomStatus.AVAILABLE, RoomStatus.AVAILABLE)).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('returns [RESERVED, MAINTENANCE] for AVAILABLE', () => {
      expect(getValidTransitions(RoomStatus.AVAILABLE)).toEqual([
        RoomStatus.RESERVED,
        RoomStatus.MAINTENANCE,
      ]);
    });

    it('returns [OCCUPIED, AVAILABLE] for RESERVED', () => {
      expect(getValidTransitions(RoomStatus.RESERVED)).toEqual([
        RoomStatus.OCCUPIED,
        RoomStatus.AVAILABLE,
      ]);
    });

    it('returns [CLEANING] for OCCUPIED', () => {
      expect(getValidTransitions(RoomStatus.OCCUPIED)).toEqual([RoomStatus.CLEANING]);
    });

    it('returns [AVAILABLE, MAINTENANCE] for CLEANING', () => {
      expect(getValidTransitions(RoomStatus.CLEANING)).toEqual([
        RoomStatus.AVAILABLE,
        RoomStatus.MAINTENANCE,
      ]);
    });

    it('returns [AVAILABLE] for MAINTENANCE', () => {
      expect(getValidTransitions(RoomStatus.MAINTENANCE)).toEqual([RoomStatus.AVAILABLE]);
    });
  });

  describe('groupRoomsByStatus', () => {
    const makeRoom = (id: string, status: RoomStatus): Room => ({
      id,
      propertyId: 'prop-1',
      roomTypeId: 'rt-1',
      roomNumber: id,
      status,
      floor: 1,
      notes: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    it('groups rooms correctly by status', () => {
      const rooms: Room[] = [
        makeRoom('101', RoomStatus.AVAILABLE),
        makeRoom('102', RoomStatus.AVAILABLE),
        makeRoom('201', RoomStatus.RESERVED),
        makeRoom('301', RoomStatus.OCCUPIED),
        makeRoom('401', RoomStatus.CLEANING),
        makeRoom('501', RoomStatus.MAINTENANCE),
      ];

      const grouped = groupRoomsByStatus(rooms);

      expect(grouped[RoomStatus.AVAILABLE]).toHaveLength(2);
      expect(grouped[RoomStatus.RESERVED]).toHaveLength(1);
      expect(grouped[RoomStatus.OCCUPIED]).toHaveLength(1);
      expect(grouped[RoomStatus.CLEANING]).toHaveLength(1);
      expect(grouped[RoomStatus.MAINTENANCE]).toHaveLength(1);
    });

    it('returns empty arrays for statuses with no rooms', () => {
      const rooms: Room[] = [makeRoom('101', RoomStatus.AVAILABLE)];

      const grouped = groupRoomsByStatus(rooms);

      expect(grouped[RoomStatus.RESERVED]).toEqual([]);
      expect(grouped[RoomStatus.OCCUPIED]).toEqual([]);
      expect(grouped[RoomStatus.CLEANING]).toEqual([]);
      expect(grouped[RoomStatus.MAINTENANCE]).toEqual([]);
    });

    it('handles empty array', () => {
      const grouped = groupRoomsByStatus([]);

      expect(grouped[RoomStatus.AVAILABLE]).toEqual([]);
      expect(grouped[RoomStatus.RESERVED]).toEqual([]);
      expect(grouped[RoomStatus.OCCUPIED]).toEqual([]);
      expect(grouped[RoomStatus.CLEANING]).toEqual([]);
      expect(grouped[RoomStatus.MAINTENANCE]).toEqual([]);
    });

    it('preserves room data in groups', () => {
      const room = makeRoom('101', RoomStatus.AVAILABLE);
      const grouped = groupRoomsByStatus([room]);

      expect(grouped[RoomStatus.AVAILABLE][0]).toBe(room);
    });

    it('does not lose or duplicate rooms', () => {
      const rooms: Room[] = [
        makeRoom('101', RoomStatus.AVAILABLE),
        makeRoom('102', RoomStatus.RESERVED),
        makeRoom('103', RoomStatus.OCCUPIED),
        makeRoom('104', RoomStatus.CLEANING),
        makeRoom('105', RoomStatus.MAINTENANCE),
      ];

      const grouped = groupRoomsByStatus(rooms);
      const totalGrouped = Object.values(grouped).flat();

      expect(totalGrouped).toHaveLength(rooms.length);
    });
  });
});
