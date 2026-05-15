import { describe, it, expect, vi } from 'vitest';
import { createErrorToast, handleApiError } from './error-handler';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('createErrorToast', () => {
  it('should format ApiError with statusCode and message', () => {
    const apiError = { statusCode: 404, message: 'Không tìm thấy tài nguyên' };
    const result = createErrorToast(apiError);

    expect(result).toEqual({
      title: 'Lỗi 404',
      description: 'Không tìm thấy tài nguyên',
      variant: 'destructive',
    });
  });

  it('should format ApiError with optional error field', () => {
    const apiError = {
      statusCode: 500,
      message: 'Internal Server Error',
      error: 'Something went wrong',
    };
    const result = createErrorToast(apiError);

    expect(result).toEqual({
      title: 'Lỗi 500',
      description: 'Internal Server Error',
      variant: 'destructive',
    });
  });

  it('should handle network errors (ERR_NETWORK code)', () => {
    const networkError = {
      code: 'ERR_NETWORK',
      message: 'Network Error',
    };
    const result = createErrorToast(networkError);

    expect(result).toEqual({
      title: 'Lỗi kết nối',
      description: 'Không thể kết nối đến server',
      variant: 'destructive',
    });
  });

  it('should handle axios errors with no response', () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Network Error',
    };
    const result = createErrorToast(axiosError);

    expect(result).toEqual({
      title: 'Lỗi kết nối',
      description: 'Không thể kết nối đến server',
      variant: 'destructive',
    });
  });

  it('should handle axios errors with response data matching ApiError', () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        status: 403,
        data: { statusCode: 403, message: 'Không có quyền truy cập' },
      },
    };
    const result = createErrorToast(axiosError);

    expect(result).toEqual({
      title: 'Lỗi 403',
      description: 'Không có quyền truy cập',
      variant: 'destructive',
    });
  });

  it('should return generic error for unknown error types', () => {
    const unknownError = new Error('Something unexpected');
    const result = createErrorToast(unknownError);

    expect(result).toEqual({
      title: 'Lỗi hệ thống',
      description: 'Đã xảy ra lỗi không xác định',
      variant: 'destructive',
    });
  });

  it('should return generic error for null', () => {
    const result = createErrorToast(null);

    expect(result).toEqual({
      title: 'Lỗi hệ thống',
      description: 'Đã xảy ra lỗi không xác định',
      variant: 'destructive',
    });
  });

  it('should return generic error for undefined', () => {
    const result = createErrorToast(undefined);

    expect(result).toEqual({
      title: 'Lỗi hệ thống',
      description: 'Đã xảy ra lỗi không xác định',
      variant: 'destructive',
    });
  });

  it('should return generic error for string errors', () => {
    const result = createErrorToast('some error string');

    expect(result).toEqual({
      title: 'Lỗi hệ thống',
      description: 'Đã xảy ra lỗi không xác định',
      variant: 'destructive',
    });
  });

  it('should handle 400 validation errors', () => {
    const apiError = { statusCode: 400, message: 'Dữ liệu không hợp lệ' };
    const result = createErrorToast(apiError);

    expect(result).toEqual({
      title: 'Lỗi 400',
      description: 'Dữ liệu không hợp lệ',
      variant: 'destructive',
    });
  });
});

describe('handleApiError', () => {
  it('should call toast with the formatted error payload', async () => {
    const { toast } = await import('@/hooks/use-toast');
    const apiError = { statusCode: 422, message: 'Validation failed' };

    handleApiError(apiError);

    expect(toast).toHaveBeenCalledWith({
      title: 'Lỗi 422',
      description: 'Validation failed',
      variant: 'destructive',
    });
  });
});
