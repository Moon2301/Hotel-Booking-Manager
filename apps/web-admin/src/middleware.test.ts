import { describe, it, expect } from 'vitest';

import { UserRole } from '@/types';

import { decodeJwtPayload, isPublicPath } from './middleware';

// Helper to create a base64url-encoded JWT for testing
function createTestJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const signature = 'test-signature';
  return `${header}.${body}.${signature}`;
}

describe('decodeJwtPayload', () => {
  it('decodes a valid JWT payload', () => {
    const payload = {
      sub: 'user-1',
      email: 'admin@test.com',
      role: UserRole.SUPER_ADMIN,
      exp: 1700000000,
      iat: 1699996400,
    };
    const token = createTestJwt(payload);
    const decoded = decodeJwtPayload(token);

    expect(decoded).not.toBeNull();
    expect(decoded!.sub).toBe('user-1');
    expect(decoded!.email).toBe('admin@test.com');
    expect(decoded!.role).toBe(UserRole.SUPER_ADMIN);
    expect(decoded!.exp).toBe(1700000000);
    expect(decoded!.iat).toBe(1699996400);
  });

  it('returns null for a token with fewer than 3 parts', () => {
    expect(decodeJwtPayload('only-one-part')).toBeNull();
    expect(decodeJwtPayload('two.parts')).toBeNull();
  });

  it('returns null for a token with invalid base64 payload', () => {
    expect(decodeJwtPayload('header.!!!invalid!!!.signature')).toBeNull();
  });

  it('returns null for a token with non-JSON payload', () => {
    const nonJson = btoa('not json at all')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(decodeJwtPayload(`header.${nonJson}.signature`)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeJwtPayload('')).toBeNull();
  });

  it('handles base64url characters correctly (- and _)', () => {
    // Create a payload that would produce + and / in standard base64
    const payload = { data: '>>>???<<<' };
    const token = createTestJwt(payload);
    const decoded = decodeJwtPayload(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.data).toBe('>>>???<<<');
  });
});

describe('isPublicPath', () => {
  it('identifies /login as public', () => {
    expect(isPublicPath('/login')).toBe(true);
  });

  it('identifies /_next as public', () => {
    expect(isPublicPath('/_next')).toBe(true);
  });

  it('identifies /favicon.ico as public', () => {
    expect(isPublicPath('/favicon.ico')).toBe(true);
  });

  it('identifies /api/auth/* paths as public', () => {
    expect(isPublicPath('/api/auth/login')).toBe(true);
    expect(isPublicPath('/api/auth/refresh')).toBe(true);
    expect(isPublicPath('/api/auth/logout')).toBe(true);
  });

  it('identifies /_next/* paths as public', () => {
    expect(isPublicPath('/_next/static/chunk.js')).toBe(true);
    expect(isPublicPath('/_next/image?url=test')).toBe(true);
  });

  it('identifies protected routes as non-public', () => {
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/properties')).toBe(false);
    expect(isPublicPath('/bookings')).toBe(false);
    expect(isPublicPath('/users')).toBe(false);
    expect(isPublicPath('/api/v1/properties')).toBe(false);
  });
});
