import { describe, it, expect } from 'vitest';
import { decodeJwtPayload } from './auth';

describe('decodeJwtPayload', () => {
  it('decodes a valid JWT payload', () => {
    // Create a mock JWT with a known payload
    const payload = {
      sub: 'user-123',
      email: 'test@hotel.com',
      role: 'SUPER_ADMIN',
      fullName: 'Test User',
      exp: 9999999999,
      iat: 1700000000,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = 'fake-signature';
    const token = `${header}.${body}.${signature}`;

    const result = decodeJwtPayload(token);

    expect(result).toEqual(payload);
  });

  it('returns null for an invalid token format', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('')).toBeNull();
    expect(decodeJwtPayload('only.two')).toBeNull();
  });

  it('returns null for invalid base64 payload', () => {
    const result = decodeJwtPayload('header.!!!invalid!!!.signature');
    expect(result).toBeNull();
  });
});
