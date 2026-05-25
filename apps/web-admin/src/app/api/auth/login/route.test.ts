import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock cookies from next/headers
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockCookieStore = { set: mockSet, get: mockGet, delete: mockDelete };

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { POST } from './route';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should proxy login request to backend and set cookies on success', async () => {
    // Create a valid JWT-shaped token so decodeJwtPayload can extract user info
    const payload = { sub: 'user-1', email: 'admin@test.com', role: 'SUPER_ADMIN', fullName: 'Admin', exp: 9999999999, iat: 1700000000 };
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const testAccessToken = `${header}.${body}.fake-sig`;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accessToken: testAccessToken,
          refreshToken: 'test-refresh-token',
        }),
    });

    const request = new NextRequest('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@test.com', password: 'password' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toEqual({
      success: true,
      user: { id: 'user-1', email: 'admin@test.com', role: 'SUPER_ADMIN', fullName: 'Admin' },
    });
    expect(response.status).toBe(200);

    // Verify backend was called correctly
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/login',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@test.com', password: 'password' }),
      })
    );

    // Verify cookies were set
    expect(mockSet).toHaveBeenCalledWith('access_token', testAccessToken, {
      httpOnly: true,
      secure: false, // test env is not production
      sameSite: 'strict',
      path: '/',
    });

    expect(mockSet).toHaveBeenCalledWith(
      'refresh_token',
      'test-refresh-token',
      {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/api/auth',
      }
    );
  });

  it('should return error response when backend returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          statusCode: 401,
          message: 'Invalid credentials',
        }),
    });

    const request = new NextRequest('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'bad@test.com', password: 'wrong' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ statusCode: 401, message: 'Invalid credentials' });
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('should return 500 when fetch throws an error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const request = new NextRequest('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@test.com', password: 'password' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
