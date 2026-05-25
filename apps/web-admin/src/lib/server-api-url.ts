const API_PREFIX = '/api/v1';

/**
 * Build the full NestJS API URL for server-side BFF routes.
 */
export function serverApiUrl(path: string): string {
  const base = (process.env.API_INTERNAL_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${API_PREFIX}${normalizedPath}`;
}
