import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { toast } from '@/hooks/use-toast';
import type { ApiError } from '@/types';

function resolveClientApiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!publicUrl) {
    // Same-origin requests proxied by Next.js rewrites (/api/v1 → Nest API)
    return '/api/v1';
  }
  return `${publicUrl.replace(/\/$/, '')}/api/v1`;
}

// Axios instance configured for the BFF pattern.
// - baseURL points at /api/v1 (rewrites) or NEXT_PUBLIC_API_URL + /api/v1
// - withCredentials ensures httpOnly cookies are sent with cross-origin requests
const apiClient = axios.create({
  baseURL: resolveClientApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Token refresh state ---
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: AxiosResponse) => void;
  reject: (reason: unknown) => void;
  config: InternalAxiosRequestConfig;
}> = [];

function processQueue(error: unknown | null) {
  if (error) {
    failedQueue.forEach(({ reject }) => reject(error));
  }
  failedQueue = [];
}

// --- Response interceptor: handle 401 (token refresh) and error toasts ---
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if the failing request IS the refresh call
      if (originalRequest.url === '/api/auth/refresh') {
        redirectToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call the BFF refresh endpoint (not the backend directly)
        await axios.post('/api/auth/refresh', null, {
          withCredentials: true,
        });

        // Refresh succeeded - retry all queued requests
        failedQueue.forEach(({ config, resolve, reject }) => {
          apiClient(config).then(resolve).catch(reject);
        });
        failedQueue = [];

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - reject all queued requests and redirect to login
        processQueue(refreshError);
        redirectToLogin();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 4xx/5xx errors - trigger toast notification
    if (error.response && error.response.status >= 400) {
      const apiError = extractApiError(error);
      showErrorToast(apiError);
    }

    return Promise.reject(error);
  }
);

// --- Helper functions ---

function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * Extract a structured ApiError from an AxiosError response.
 */
export function extractApiError(error: AxiosError<ApiError>): ApiError {
  if (error.response?.data) {
    const data = error.response.data;
    return {
      statusCode: data.statusCode || error.response.status,
      message: data.message || error.message || 'An unexpected error occurred',
      error: data.error,
    };
  }

  return {
    statusCode: error.response?.status || 500,
    message: error.message || 'Network error',
  };
}

/**
 * Show a toast notification for API errors.
 * Produces a toast with the status code and error message.
 */
export function showErrorToast(apiError: ApiError): void {
  toast({
    variant: 'destructive',
    title: `Error ${apiError.statusCode}`,
    description: apiError.message,
  });
}

// --- Typed request helpers ---

/**
 * Typed GET request helper.
 */
export async function get<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.get<T>(url, config);
  return response.data;
}

/**
 * Typed POST request helper.
 */
export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.post<T>(url, data, config);
  return response.data;
}

/**
 * Typed PUT request helper.
 */
export async function put<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.put<T>(url, data, config);
  return response.data;
}

/**
 * Typed PATCH request helper.
 */
export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.patch<T>(url, data, config);
  return response.data;
}

/**
 * Typed DELETE request helper.
 */
export async function del<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await apiClient.delete<T>(url, config);
  return response.data;
}

export default apiClient;
