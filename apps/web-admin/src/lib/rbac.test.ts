import { describe, it, expect } from 'vitest';
import { UserRole } from '@/types';
import {
  Permission,
  ALL_PERMISSIONS,
  PERMISSION_MATRIX,
  hasPermission,
  canAccessRoute,
  getRoutePermission,
} from './rbac';

describe('rbac', () => {
  describe('PERMISSION_MATRIX', () => {
    it('SUPER_ADMIN has all permissions', () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(hasPermission(UserRole.SUPER_ADMIN, permission)).toBe(true);
      }
    });

    it('PROPERTY_MANAGER has correct permissions', () => {
      const expected: Permission[] = [
        'properties:read',
        'properties:write',
        'rooms:read',
        'rooms:write',
        'rooms:status',
        'room-types:read',
        'room-types:write',
        'rates:read',
        'rates:write',
        'bookings:read',
        'bookings:write',
        'bookings:checkin',
        'payments:read',
        'policies:read',
        'policies:write',
        'reviews:read',
        'reviews:moderate',
        'reports:read',
        'reports:export',
        'invoices:read',
        'invoices:write',
        'guests:read',
      ];
      for (const permission of expected) {
        expect(hasPermission(UserRole.PROPERTY_MANAGER, permission)).toBe(true);
      }
      // Should NOT have these
      expect(hasPermission(UserRole.PROPERTY_MANAGER, 'chat:read')).toBe(false);
      expect(hasPermission(UserRole.PROPERTY_MANAGER, 'chat:write')).toBe(false);
      expect(hasPermission(UserRole.PROPERTY_MANAGER, 'audit:read')).toBe(false);
    });

    it('FRONT_DESK has correct permissions', () => {
      const expected: Permission[] = [
        'properties:read',
        'rooms:read',
        'rooms:status',
        'room-types:read',
        'bookings:read',
        'bookings:write',
        'bookings:checkin',
        'chat:read',
        'chat:write',
        'invoices:read',
        'invoices:write',
        'guests:read',
      ];
      for (const permission of expected) {
        expect(hasPermission(UserRole.FRONT_DESK, permission)).toBe(true);
      }
      // Should NOT have these
      expect(hasPermission(UserRole.FRONT_DESK, 'properties:write')).toBe(false);
      expect(hasPermission(UserRole.FRONT_DESK, 'rooms:write')).toBe(false);
      expect(hasPermission(UserRole.FRONT_DESK, 'rates:read')).toBe(false);
      expect(hasPermission(UserRole.FRONT_DESK, 'payments:read')).toBe(false);
    });

    it('HOUSEKEEPING has only rooms:read and rooms:status', () => {
      expect(hasPermission(UserRole.HOUSEKEEPING, 'rooms:read')).toBe(true);
      expect(hasPermission(UserRole.HOUSEKEEPING, 'rooms:status')).toBe(true);
      // Should NOT have anything else
      expect(hasPermission(UserRole.HOUSEKEEPING, 'rooms:write')).toBe(false);
      expect(hasPermission(UserRole.HOUSEKEEPING, 'properties:read')).toBe(false);
      expect(hasPermission(UserRole.HOUSEKEEPING, 'bookings:read')).toBe(false);
    });

    it('FINANCE_READ has payments, reports, and invoices read', () => {
      expect(hasPermission(UserRole.FINANCE_READ, 'payments:read')).toBe(true);
      expect(hasPermission(UserRole.FINANCE_READ, 'reports:read')).toBe(true);
      expect(hasPermission(UserRole.FINANCE_READ, 'reports:export')).toBe(true);
      expect(hasPermission(UserRole.FINANCE_READ, 'invoices:read')).toBe(true);
      // Should NOT have anything else
      expect(hasPermission(UserRole.FINANCE_READ, 'properties:read')).toBe(false);
      expect(hasPermission(UserRole.FINANCE_READ, 'bookings:read')).toBe(false);
      expect(hasPermission(UserRole.FINANCE_READ, 'rooms:read')).toBe(false);
    });

    it('SUPPORT has reviews:read, reviews:moderate, chat:read, chat:write', () => {
      expect(hasPermission(UserRole.SUPPORT, 'reviews:read')).toBe(true);
      expect(hasPermission(UserRole.SUPPORT, 'reviews:moderate')).toBe(true);
      expect(hasPermission(UserRole.SUPPORT, 'chat:read')).toBe(true);
      expect(hasPermission(UserRole.SUPPORT, 'chat:write')).toBe(true);
      // Should NOT have anything else
      expect(hasPermission(UserRole.SUPPORT, 'properties:read')).toBe(false);
      expect(hasPermission(UserRole.SUPPORT, 'bookings:read')).toBe(false);
      expect(hasPermission(UserRole.SUPPORT, 'rooms:read')).toBe(false);
    });

    it('every role in PERMISSION_MATRIX only contains valid permissions', () => {
      for (const role of Object.values(UserRole)) {
        const permissions = PERMISSION_MATRIX[role];
        for (const perm of permissions) {
          expect(ALL_PERMISSIONS).toContain(perm);
        }
      }
    });
  });

  describe('hasPermission', () => {
    it('returns true for granted permission', () => {
      expect(hasPermission(UserRole.SUPER_ADMIN, 'audit:read')).toBe(true);
    });

    it('returns false for denied permission', () => {
      expect(hasPermission(UserRole.HOUSEKEEPING, 'audit:read')).toBe(false);
    });
  });

  describe('getRoutePermission', () => {
    it('maps /properties to properties:read', () => {
      expect(getRoutePermission('/properties')).toBe('properties:read');
    });

    it('maps /properties/[id] to properties:read', () => {
      expect(getRoutePermission('/properties/abc-123')).toBe('properties:read');
    });

    it('maps /properties/[id]/room-types to room-types:read', () => {
      expect(getRoutePermission('/properties/abc-123/room-types')).toBe('room-types:read');
    });

    it('maps /properties/[id]/rooms to rooms:read', () => {
      expect(getRoutePermission('/properties/abc-123/rooms')).toBe('rooms:read');
    });

    it('maps /properties/[id]/rates to rates:read', () => {
      expect(getRoutePermission('/properties/abc-123/rates')).toBe('rates:read');
    });

    it('maps /properties/[id]/policies to policies:read', () => {
      expect(getRoutePermission('/properties/abc-123/policies')).toBe('policies:read');
    });

    it('maps /room-board to rooms:status', () => {
      expect(getRoutePermission('/room-board')).toBe('rooms:status');
    });

    it('maps /bookings to bookings:read', () => {
      expect(getRoutePermission('/bookings')).toBe('bookings:read');
    });

    it('maps /bookings/[id] to bookings:read', () => {
      expect(getRoutePermission('/bookings/booking-123')).toBe('bookings:read');
    });

    it('maps /payments to payments:read', () => {
      expect(getRoutePermission('/payments')).toBe('payments:read');
    });

    it('maps /reviews to reviews:read', () => {
      expect(getRoutePermission('/reviews')).toBe('reviews:read');
    });

    it('maps /chat to chat:read', () => {
      expect(getRoutePermission('/chat')).toBe('chat:read');
    });

    it('maps /reports to reports:read', () => {
      expect(getRoutePermission('/reports')).toBe('reports:read');
    });

    it('maps /audit-log to audit:read', () => {
      expect(getRoutePermission('/audit-log')).toBe('audit:read');
    });

    it('returns undefined for unknown routes (e.g., dashboard home)', () => {
      expect(getRoutePermission('/')).toBeUndefined();
      expect(getRoutePermission('/dashboard')).toBeUndefined();
    });
  });

  describe('canAccessRoute', () => {
    it('SUPER_ADMIN can access all routes', () => {
      const routes = [
        '/properties',
        '/properties/abc-123',
        '/properties/abc-123/room-types',
        '/properties/abc-123/rooms',
        '/properties/abc-123/rates',
        '/properties/abc-123/policies',
        '/room-board',
        '/bookings',
        '/bookings/booking-123',
        '/payments',
        '/reviews',
        '/chat',
        '/reports',
        '/audit-log',
      ];
      for (const route of routes) {
        expect(canAccessRoute(UserRole.SUPER_ADMIN, route)).toBe(true);
      }
    });

    it('HOUSEKEEPING can only access room-board', () => {
      expect(canAccessRoute(UserRole.HOUSEKEEPING, '/room-board')).toBe(true);
      expect(canAccessRoute(UserRole.HOUSEKEEPING, '/properties')).toBe(false);
      expect(canAccessRoute(UserRole.HOUSEKEEPING, '/bookings')).toBe(false);
      expect(canAccessRoute(UserRole.HOUSEKEEPING, '/payments')).toBe(false);
    });

    it('FINANCE_READ can access payments and reports', () => {
      expect(canAccessRoute(UserRole.FINANCE_READ, '/payments')).toBe(true);
      expect(canAccessRoute(UserRole.FINANCE_READ, '/reports')).toBe(true);
      expect(canAccessRoute(UserRole.FINANCE_READ, '/properties')).toBe(false);
      expect(canAccessRoute(UserRole.FINANCE_READ, '/bookings')).toBe(false);
    });

    it('SUPPORT can access reviews and chat', () => {
      expect(canAccessRoute(UserRole.SUPPORT, '/reviews')).toBe(true);
      expect(canAccessRoute(UserRole.SUPPORT, '/chat')).toBe(true);
      expect(canAccessRoute(UserRole.SUPPORT, '/properties')).toBe(false);
      expect(canAccessRoute(UserRole.SUPPORT, '/bookings')).toBe(false);
    });

    it('FRONT_DESK can access properties, room-board, bookings, chat', () => {
      expect(canAccessRoute(UserRole.FRONT_DESK, '/properties')).toBe(true);
      expect(canAccessRoute(UserRole.FRONT_DESK, '/room-board')).toBe(true);
      expect(canAccessRoute(UserRole.FRONT_DESK, '/bookings')).toBe(true);
      expect(canAccessRoute(UserRole.FRONT_DESK, '/chat')).toBe(true);
      expect(canAccessRoute(UserRole.FRONT_DESK, '/payments')).toBe(false);
      expect(canAccessRoute(UserRole.FRONT_DESK, '/audit-log')).toBe(false);
    });

    it('returns true for routes without permission requirements', () => {
      expect(canAccessRoute(UserRole.HOUSEKEEPING, '/')).toBe(true);
    });
  });
});
