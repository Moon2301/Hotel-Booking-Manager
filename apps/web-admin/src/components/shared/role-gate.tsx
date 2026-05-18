'use client';

import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission } from '@/lib/rbac';

interface RoleGateProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * RoleGate conditionally renders its children based on whether
 * the current user has the specified permission.
 *
 * If the user lacks the permission, it renders the fallback (default: null).
 */
export function RoleGate({ permission, children, fallback = null }: RoleGateProps) {
  const { can } = usePermissions();

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
