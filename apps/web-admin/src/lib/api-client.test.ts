import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import type { ApiError } from '@/types';

// Mock the toast module before importing api-client
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

import apiClient, {
  extractApiError,
  showErrorToast,
  get,
  post,
  put,
  patch,
  del,
} from './api-client';
import { toast } from '@/hooks/use-toast';

const mockedToast = vi.mocked(toast);

describe('api-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Axios instance configuration', () => {
    it('should have withCredentials set to true', () => {
      expect(apiClient.defaults.withCredentials).toBe(true);
    });

    it('should have Content-Type header set to application/json', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe(
        'application/json'
      );
    });

    it('should use /api/v1 when NEXT_PUBLIC_API_URL is unset', () => {
      expect(apiClient.defaults.baseURL).toBe('/api/v1');
    });
  });

  describe('extractApiError', () => {
    it('should extract statusCode and message from response data', () => {
      const error = createAxiosError(422, {
        statusCode: 422,
        message: 'Validation failed',
        error: 'Unprocessable Entity',
      });

      const result = extractApiError(error);

      expect(result).toEqual({
        statusCode: 422,
        message: 'Validation failed',
        error: 'Unprocessable Entity',
      });
    });

    it('should fall back to response status when data has no statusCode', () => {
      const error = createAxiosError(500, {
        message: 'Internal server error',
      } as ApiError);

      const result = extractApiError(error);

      expect(result.statusCode).toBe(500);
      expect(result.message).toBe('Internal server error');
    });

    it('should handle missing response data gracefully', () => {
      const error = {
        isAxiosError: true,
        response: { status: 503, data: null, headers: {}, statusText: '', config: {} },
        message: 'Service Unavailable',
        config: {},
        name: 'AxiosError',
        toJSON: () => ({}),
      } as unknown as AxiosError<ApiError>;

      const result = extractApiError(error);

      expect(result.statusCode).toBe(503);
      expect(result.message).toBe('Service Unavailable');
    });

    it('should handle no response at all (network error)', () => {
      const error = {
        isAxiosError: true,
        response: undefined,
        message: 'Network Error',
        config: {},
        name: 'AxiosError',
        toJSON: () => ({}),
      } as unknown as AxiosError<ApiError>;

      const result = extractApiError(error);

      expect(result.statusCode).toBe(500);
      expect(result.message).toBe('Network Error');
    });
  });

  describe('showErrorToast', () => {
    it('should call toast with destructive variant, status code in title, and message in description', () => {
      const apiError: ApiError = {
        statusCode: 404,
        message: 'Resource not found',
      };

      showErrorToast(apiError);

      expect(mockedToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error 404',
        description: 'Resource not found',
      });
    });

    it('should include status code for 5xx errors', () => {
      const apiError: ApiError = {
        statusCode: 500,
        message: 'Internal server error',
      };

      showErrorToast(apiError);

      expect(mockedToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Error 500',
        description: 'Internal server error',
      });
    });
  });

  describe('typed request helpers', () => {
    let mockGet: ReturnType<typeof vi.spyOn>;
    let mockPost: ReturnType<typeof vi.spyOn>;
    let mockPut: ReturnType<typeof vi.spyOn>;
    let mockPatch: ReturnType<typeof vi.spyOn>;
    let mockDelete: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockGet = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { id: '1' } });
      mockPost = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { id: '2' } });
      mockPut = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { id: '3' } });
      mockPatch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: { id: '4' } });
      mockDelete = vi.spyOn(apiClient, 'delete').mockResolvedValue({ data: { success: true } });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('get() should return response.data', async () => {
      const result = await get<{ id: string }>('/test');
      expect(result).toEqual({ id: '1' });
      expect(mockGet).toHaveBeenCalledWith('/test', undefined);
    });

    it('post() should return response.data', async () => {
      const result = await post<{ id: string }>('/test', { name: 'foo' });
      expect(result).toEqual({ id: '2' });
      expect(mockPost).toHaveBeenCalledWith('/test', { name: 'foo' }, undefined);
    });

    it('put() should return response.data', async () => {
      const result = await put<{ id: string }>('/test', { name: 'bar' });
      expect(result).toEqual({ id: '3' });
      expect(mockPut).toHaveBeenCalledWith('/test', { name: 'bar' }, undefined);
    });

    it('patch() should return response.data', async () => {
      const result = await patch<{ id: string }>('/test', { name: 'baz' });
      expect(result).toEqual({ id: '4' });
      expect(mockPatch).toHaveBeenCalledWith('/test', { name: 'baz' }, undefined);
    });

    it('del() should return response.data', async () => {
      const result = await del<{ success: boolean }>('/test');
      expect(result).toEqual({ success: true });
      expect(mockDelete).toHaveBeenCalledWith('/test', undefined);
    });
  });
});

// --- Helper to create AxiosError ---
function createAxiosError(
  status: number,
  data: ApiError
): AxiosError<ApiError> {
  const headers = new AxiosHeaders();
  return {
    isAxiosError: true,
    response: {
      status,
      data,
      headers,
      statusText: '',
      config: { headers },
    },
    message: data.message || 'Error',
    config: { headers },
    name: 'AxiosError',
    toJSON: () => ({}),
  } as AxiosError<ApiError>;
}
