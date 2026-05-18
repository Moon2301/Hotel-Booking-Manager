import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from './auth-provider';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@/types';

// Test component that uses the useAuth hook
function TestConsumer() {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user-email">{user?.email ?? 'none'}</span>
      <span data-testid="user-role">{user?.role ?? 'none'}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('provides unauthenticated state when no initialUser', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(screen.getByTestId('user-email').textContent).toBe('none');
  });

  it('provides authenticated state when initialUser is given', () => {
    const mockUser = {
      id: 'user-1',
      email: 'admin@hotel.com',
      role: UserRole.SUPER_ADMIN,
      fullName: 'Admin User',
    };

    render(
      <AuthProvider initialUser={mockUser}>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user-email').textContent).toBe('admin@hotel.com');
    expect(screen.getByTestId('user-role').textContent).toBe('SUPER_ADMIN');
  });

  it('logout calls /api/auth/logout and redirects to /login', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    // Mock window.location.href
    const locationMock = { href: '' };
    Object.defineProperty(window, 'location', {
      value: locationMock,
      writable: true,
    });

    const mockUser = {
      id: 'user-1',
      email: 'admin@hotel.com',
      role: UserRole.SUPER_ADMIN,
      fullName: 'Admin User',
    };

    render(
      <AuthProvider initialUser={mockUser}>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
    });
    expect(locationMock.href).toBe('/login');
  });
});
