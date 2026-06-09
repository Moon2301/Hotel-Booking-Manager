import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from './use-permissions';
import { AuthProvider } from '@/providers/auth-provider';
import { UserRole } from '@/types';
import type { ReactNode } from 'react';
import type { Permission } from '@/lib/rbac';

describe('usePermissions', () => {
  it('returns can() that returns false when user is not authenticated', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.can('properties:read')).toBe(false);
    expect(result.current.can('bookings:write')).toBe(false);
    expect(result.current.can('audit:read')).toBe(false);
  });

  it('returns can() that checks permissions for SUPER_ADMIN (has all)', () => {
    const mockUser = {
      id: 'user-1',
      email: 'admin@hotel.com',
      role: UserRole.SUPER_ADMIN,
      fullName: 'Super Admin',
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider initialUser={mockUser}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.can('properties:read')).toBe(true);
    expect(result.current.can('properties:write')).toBe(true);
    expect(result.current.can('users:write' as Permission)).toBe(true);
    expect(result.current.can('audit:read')).toBe(true);
  });

  it('returns can() that checks permissions for FRONT_DESK', () => {
    const mockUser = {
      id: 'user-2',
      email: 'front@hotel.com',
      role: UserRole.FRONT_DESK,
      fullName: 'Front Desk',
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider initialUser={mockUser}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => usePermissions(), { wrapper });

    // FRONT_DESK has these permissions
    expect(result.current.can('properties:read')).toBe(true);
    expect(result.current.can('rooms:read')).toBe(true);
    expect(result.current.can('rooms:status')).toBe(true);
    expect(result.current.can('bookings:read')).toBe(true);
    expect(result.current.can('bookings:write')).toBe(true);
    expect(result.current.can('bookings:checkin')).toBe(true);
    expect(result.current.can('chat:read')).toBe(true);
    expect(result.current.can('chat:write')).toBe(true);

    // FRONT_DESK does NOT have these permissions
    expect(result.current.can('properties:write')).toBe(false);
    expect(result.current.can('rooms:write')).toBe(false);
    expect(result.current.can('rates:read')).toBe(false);
    expect(result.current.can('users:read' as Permission)).toBe(false);
    expect(result.current.can('audit:read')).toBe(false);
  });

  it('returns can() that checks permissions for HOUSEKEEPING (minimal)', () => {
    const mockUser = {
      id: 'user-3',
      email: 'hk@hotel.com',
      role: UserRole.HOUSEKEEPING,
      fullName: 'Housekeeping',
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider initialUser={mockUser}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => usePermissions(), { wrapper });

    expect(result.current.can('rooms:read')).toBe(true);
    expect(result.current.can('rooms:status')).toBe(true);
    expect(result.current.can('properties:read')).toBe(false);
    expect(result.current.can('bookings:read')).toBe(false);
  });

  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => usePermissions());
    }).toThrow('useAuth must be used within an AuthProvider');
  });
});
