import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGate } from './role-gate';
import { AuthProvider } from '@/providers/auth-provider';
import { UserRole } from '@/types';

describe('RoleGate', () => {
  it('renders children when user has the required permission', () => {
    const mockUser = {
      id: 'user-1',
      email: 'admin@hotel.com',
      role: UserRole.SUPER_ADMIN,
      fullName: 'Super Admin',
    };

    render(
      <AuthProvider initialUser={mockUser}>
        <RoleGate permission="properties:read">
          <div data-testid="protected-content">Protected Content</div>
        </RoleGate>
      </AuthProvider>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('hides children when user lacks the required permission', () => {
    const mockUser = {
      id: 'user-2',
      email: 'hk@hotel.com',
      role: UserRole.HOUSEKEEPING,
      fullName: 'Housekeeping',
    };

    render(
      <AuthProvider initialUser={mockUser}>
        <RoleGate permission="properties:read">
          <div data-testid="protected-content">Protected Content</div>
        </RoleGate>
      </AuthProvider>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders fallback when user lacks permission', () => {
    const mockUser = {
      id: 'user-3',
      email: 'hk@hotel.com',
      role: UserRole.HOUSEKEEPING,
      fullName: 'Housekeeping',
    };

    render(
      <AuthProvider initialUser={mockUser}>
        <RoleGate
          permission="audit:read"
          fallback={<div data-testid="fallback">Access Denied</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </RoleGate>
      </AuthProvider>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('hides children when user is not authenticated', () => {
    render(
      <AuthProvider>
        <RoleGate permission="properties:read">
          <div data-testid="protected-content">Protected Content</div>
        </RoleGate>
      </AuthProvider>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children for PROPERTY_MANAGER with properties:write permission', () => {
    const mockUser = {
      id: 'user-4',
      email: 'pm@hotel.com',
      role: UserRole.PROPERTY_MANAGER,
      fullName: 'Property Manager',
    };

    render(
      <AuthProvider initialUser={mockUser}>
        <RoleGate permission="properties:write">
          <div data-testid="edit-button">Edit Property</div>
        </RoleGate>
      </AuthProvider>
    );

    expect(screen.getByTestId('edit-button')).toBeInTheDocument();
  });

  it('hides children for FINANCE_READ without properties:read permission', () => {
    const mockUser = {
      id: 'user-5',
      email: 'finance@hotel.com',
      role: UserRole.FINANCE_READ,
      fullName: 'Finance',
    };

    render(
      <AuthProvider initialUser={mockUser}>
        <RoleGate permission="properties:read">
          <div data-testid="protected-content">Protected Content</div>
        </RoleGate>
      </AuthProvider>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
