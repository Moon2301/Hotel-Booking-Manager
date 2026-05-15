import { describe, it, expect } from 'vitest';
import { loginSchema } from './auth.schema';

describe('loginSchema', () => {
  it('validates a correct email and password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@hotel.com',
      password: 'secret123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['email']);
    }
  });

  it('rejects an empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'secret123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@hotel.com',
      password: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['password']);
    }
  });

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
