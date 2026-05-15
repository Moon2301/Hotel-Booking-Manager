'use client';

import { useAuth } from './use-auth';
import { hasPermission, type Permission } from '@/lib/rbac';

/**
 * Hook that provides a `can(permission)` function to check
 * if the current user has a specific permission based on their role.
 *
 * If the user is not authenticated, `can()` always returns false.
 */
export function usePermissions() {
  const { user } = useAuth();

  const can = (permission: Permission): boolean => {
    if (!user) {
      return false;
    }
    return hasPermission(user.role, permission);
  };

  return { can };
}
