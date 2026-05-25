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

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should refresh tokens and set new cookies on success', async () => {
    mockGet.mockReturnValueOnce({ value: 'old-refresh-token' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        }),
    });

    const request = new NextRequest('http://localhost:3001/api/auth/refresh', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toEqual({ success: true });
    expect(response.status).toBe(200);

    // Verify backend was called with the refresh token
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'old-refresh-token' }),
      })
    );

    // Verify new cookies were set
    expect(mockSet).toHaveBeenCalledWith(
      'access_token',
      'new-access-token',
      {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
      }
    );

    expect(mockSet).toHaveBeenCalledWith(
      'refresh_token',
      'new-refresh-token',
      {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/api/auth',
      }
    );
  });

  it('should return 401 when no refresh token cookie exists', async () => {
    mockGet.mockReturnValueOnce(undefined);

    const request = new NextRequest('http://localhost:3001/api/auth/refresh', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ statusCode: 401, message: 'No refresh token' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should clear cookies and return error when backend refresh fails', async () => {
    mockGet.mockReturnValueOnce({ value: 'expired-refresh-token' });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({
          statusCode: 401,
          message: 'Refresh token expired',
        }),
    });

    const request = new NextRequest('http://localhost:3001/api/auth/refresh', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      statusCode: 401,
      message: 'Refresh token expired',
    });

    // Verify cookies were cleared
    expect(mockDelete).toHaveBeenCalledWith('access_token');
    expect(mockDelete).toHaveBeenCalledWith('refresh_token');
  });

  it('should return 500 when fetch throws an error', async () => {
    mockGet.mockReturnValueOnce({ value: 'some-refresh-token' });
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const request = new NextRequest('http://localhost:3001/api/auth/refresh', {
      method: 'POST',
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
