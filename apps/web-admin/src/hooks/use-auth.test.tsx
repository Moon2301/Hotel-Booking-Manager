import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from './use-auth';
import { AuthProvider } from '@/providers/auth-provider';
import { UserRole } from '@/types';
import type { ReactNode } from 'react';

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('returns user and isAuthenticated when wrapped in AuthProvider', () => {
    const mockUser = {
      id: 'user-1',
      email: 'front@hotel.com',
      role: UserRole.FRONT_DESK,
      fullName: 'Front Desk',
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider initialUser={mockUser}>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(typeof result.current.logout).toBe('function');
  });

  it('returns null user when no initialUser provided', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
