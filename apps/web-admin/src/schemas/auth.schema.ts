import { z } from 'zod';

/**
 * Zod schema for the login form.
 * Validates email format and requires a non-empty password.
 */
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
