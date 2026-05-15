'use client';

import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/providers/auth-provider';

/**
 * Hook to access the current authentication state.
 *
 * Returns:
 * - `user`: The authenticated user object (id, email, role, fullName) or null
 * - `isAuthenticated`: Boolean indicating if a user is logged in
 * - `logout`: Function that calls the logout endpoint and redirects to /login
 *
 * Throws if used outside of an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
