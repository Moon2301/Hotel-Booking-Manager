import { z } from 'zod';

export const UserRoleSchema = z.enum([
  'SUPER_ADMIN',
  'PROPERTY_MANAGER',
  'FRONT_DESK',
  'HOUSEKEEPING',
  'FINANCE_READ',
  'SUPPORT',
]);

// Add more shared schemas here
