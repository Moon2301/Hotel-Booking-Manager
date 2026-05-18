import { toast } from '@/hooks/use-toast';
import type { ApiError } from '@/types';

/**
 * Toast notification object compatible with the useToast hook.
 */
export interface ErrorToastPayload {
  title: string;
  description: string;
  variant: 'destructive';
}

/**
 * Type guard to check if an error matches the ApiError shape.
 */
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'message' in error &&
    typeof (error as ApiError).statusCode === 'number' &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * Type guard to check if an error is a network error (no response from server).
 */
function isNetworkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  // Axios network errors have `code` property
  if ('code' in error && (error as { code: string }).code === 'ERR_NETWORK') {
    return true;
  }

  // Axios errors with no response (server unreachable)
  if (
    'isAxiosError' in error &&
    (error as { isAxiosError: boolean }).isAxiosError &&
    !('response' in error && (error as { response: unknown }).response)
  ) {
    return true;
  }

  return false;
}

/**
 * Creates a toast notification payload from an API error or unknown error.
 *
 * - For ApiError objects: title = "Lỗi {statusCode}", description = error message
 * - For network errors (no response): title = "Lỗi kết nối", description = connection message
 * - For unknown errors: title = "Lỗi hệ thống", description = generic message
 */
export function createErrorToast(error: unknown): ErrorToastPayload {
  // Check for network errors first (no response from server)
  if (isNetworkError(error)) {
    return {
      title: 'Lỗi kết nối',
      description: 'Không thể kết nối đến server',
      variant: 'destructive',
    };
  }

  // Check if the error is an ApiError (direct or from axios response.data)
  if (isApiError(error)) {
    return {
      title: `Lỗi ${error.statusCode}`,
      description: error.message,
      variant: 'destructive',
    };
  }

  // Check if it's an Axios error with response data matching ApiError shape
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response: unknown }).response === 'object' &&
    (error as { response: { data: unknown } }).response !== null
  ) {
    const responseData = (error as { response: { data: unknown } }).response
      .data;
    if (isApiError(responseData)) {
      return {
        title: `Lỗi ${responseData.statusCode}`,
        description: responseData.message,
        variant: 'destructive',
      };
    }
  }

  // Fallback for unknown errors
  return {
    title: 'Lỗi hệ thống',
    description: 'Đã xảy ra lỗi không xác định',
    variant: 'destructive',
  };
}

/**
 * Handles an API error by displaying a toast notification.
 * Can be used in axios interceptors and TanStack Query onError callbacks.
 */
export function handleApiError(error: unknown): void {
  const payload = createErrorToast(error);
  toast(payload);
}
