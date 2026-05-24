import { UserRole } from '@/types';

/**
 * Permission type representing all granular permissions in the system.
 */
export type Permission =
  | 'properties:read'
  | 'properties:write'
  | 'rooms:read'
  | 'rooms:write'
  | 'rooms:status'
  | 'room-types:read'
  | 'room-types:write'
  | 'rates:read'
  | 'rates:write'
  | 'bookings:read'
  | 'bookings:write'
  | 'bookings:checkin'
  | 'payments:read'
  | 'policies:read'
  | 'policies:write'
  | 'reviews:read'
  | 'reviews:moderate'
  | 'chat:read'
  | 'chat:write'
  | 'reports:read'
  | 'reports:export'
  | 'users:read'
  | 'users:write'
  | 'audit:read'
  | 'tasks:read'
  | 'tasks:write'
  | 'invoices:read'
  | 'invoices:write'
  | 'guests:read';

/**
 * All possible permissions as an array (useful for iteration/testing).
 */
export const ALL_PERMISSIONS: Permission[] = [
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
  'chat:read',
  'chat:write',
  'reports:read',
  'reports:export',
  'users:read',
  'users:write',
  'audit:read',
  'tasks:read',
  'tasks:write',
  'invoices:read',
  'invoices:write',
  'guests:read',
];

/**
 * Permission matrix mapping each role to its allowed permissions.
 */
export const PERMISSION_MATRIX: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [...ALL_PERMISSIONS],

  [UserRole.PROPERTY_MANAGER]: [
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
    'tasks:read',
    'tasks:write',
    'invoices:read',
    'invoices:write',
    'guests:read',
  ],

  [UserRole.FRONT_DESK]: [
    'properties:read',
    'rooms:read',
    'rooms:status',
    'room-types:read',
    'bookings:read',
    'bookings:write',
    'bookings:checkin',
    'chat:read',
    'chat:write',
    'tasks:read',
    'tasks:write',
    'invoices:read',
    'invoices:write',
    'guests:read',
  ],

  [UserRole.HOUSEKEEPING]: [
    'rooms:read',
    'rooms:status',
    'tasks:read',
    'tasks:write',
  ],

  [UserRole.FINANCE_READ]: [
    'payments:read',
    'reports:read',
    'reports:export',
    'invoices:read',
  ],

  [UserRole.SUPPORT]: [
    'reviews:read',
    'reviews:moderate',
    'chat:read',
    'chat:write',
    'tasks:read',
    'tasks:write',
  ],
};

/**
 * Route-to-permission mapping for all dashboard routes.
 * Uses regex-like patterns to match dynamic route segments.
 */
export const ROUTE_PERMISSION_MAP: Array<{ pattern: RegExp; permission: Permission }> = [
  { pattern: /^\/properties\/[^/]+\/room-types/, permission: 'room-types:read' },
  { pattern: /^\/properties\/[^/]+\/rooms/, permission: 'rooms:read' },
  { pattern: /^\/properties\/[^/]+\/rates/, permission: 'rates:read' },
  { pattern: /^\/properties\/[^/]+\/policies/, permission: 'policies:read' },
  { pattern: /^\/properties\/[^/]+$/, permission: 'properties:read' },
  { pattern: /^\/properties$/, permission: 'properties:read' },
  { pattern: /^\/room-board/, permission: 'rooms:status' },
  { pattern: /^\/bookings\/[^/]+$/, permission: 'bookings:read' },
  { pattern: /^\/bookings$/, permission: 'bookings:read' },
  { pattern: /^\/payments/, permission: 'payments:read' },
  { pattern: /^\/reviews/, permission: 'reviews:read' },
  { pattern: /^\/chat/, permission: 'chat:read' },
  { pattern: /^\/reports/, permission: 'reports:read' },
  { pattern: /^\/users/, permission: 'users:read' },
  { pattern: /^\/audit-log/, permission: 'audit:read' },
  { pattern: /^\/tasks/, permission: 'tasks:read' },
  { pattern: /^\/invoices/, permission: 'invoices:read' },
  { pattern: /^\/guests/, permission: 'guests:read' },
];

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = PERMISSION_MATRIX[role];
  if (!permissions) {
    return false;
  }
  return permissions.includes(permission);
}

/**
 * Get the required permission for a given route path.
 * Returns undefined if the route doesn't require a specific permission
 * (e.g., the dashboard home page).
 */
export function getRoutePermission(path: string): Permission | undefined {
  for (const { pattern, permission } of ROUTE_PERMISSION_MAP) {
    if (pattern.test(path)) {
      return permission;
    }
  }
  return undefined;
}

/**
 * Check if a role can access a given route path.
 * Returns true if the route doesn't require a specific permission (public dashboard routes)
 * or if the role has the required permission.
 */
export function canAccessRoute(role: UserRole, path: string): boolean {
  const permission = getRoutePermission(path);
  if (!permission) {
    // Route doesn't require a specific permission (e.g., dashboard home)
    return true;
  }
  return hasPermission(role, permission);
}
