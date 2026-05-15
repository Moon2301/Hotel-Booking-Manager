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

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call backend logout and clear cookies', async () => {
    mockGet.mockReturnValueOnce({ value: 'test-access-token' });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const request = new NextRequest('http://localhost:3001/api/auth/logout', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toEqual({ success: true });
    expect(response.status).toBe(200);

    // Verify backend was called with Bearer token
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/auth/logout',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-access-token',
        },
      })
    );

    // Verify cookies were cleared
    expect(mockDelete).toHaveBeenCalledWith('access_token');
    expect(mockDelete).toHaveBeenCalledWith('refresh_token');
  });

  it('should clear cookies even when no access token exists', async () => {
    mockGet.mockReturnValueOnce(undefined);

    const request = new NextRequest('http://localhost:3001/api/auth/logout', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toEqual({ success: true });

    // Backend should not be called without a token
    expect(mockFetch).not.toHaveBeenCalled();

    // Cookies should still be cleared
    expect(mockDelete).toHaveBeenCalledWith('access_token');
    expect(mockDelete).toHaveBeenCalledWith('refresh_token');
  });

  it('should clear cookies even when backend logout fails', async () => {
    mockGet.mockReturnValueOnce({ value: 'test-access-token' });

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const request = new NextRequest('http://localhost:3001/api/auth/logout', {
      method: 'POST',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data).toEqual({ success: true });

    // Cookies should still be cleared
    expect(mockDelete).toHaveBeenCalledWith('access_token');
    expect(mockDelete).toHaveBeenCalledWith('refresh_token');
  });
});
