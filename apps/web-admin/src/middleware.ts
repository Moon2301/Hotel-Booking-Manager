import { NextRequest, NextResponse } from 'next/server';

import { canAccessRoute } from '@/lib/rbac';
import { UserRole } from '@/types';

// --- Public routes that don't require authentication ---
const PUBLIC_PATHS = ['/login', '/_next', '/favicon.ico'];
const PUBLIC_PATH_PREFIXES = ['/api/auth/', '/_next/'];

/**
 * Decode a JWT payload without signature verification.
 * Returns the parsed payload or null if decoding fails.
 */
export function decodeJwtPayload(
  token: string
): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    // Base64url decode: replace URL-safe chars and add padding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Check if a path is public (no auth required).
 */
export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without auth check
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Read access_token from cookies
  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Decode JWT payload (no signature verification)
  const payload = decodeJwtPayload(token);

  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check token expiration
  const exp = payload.exp as number | undefined;
  if (!exp || Date.now() >= exp * 1000) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Extract role for RBAC check
  const role = payload.role as UserRole | undefined;
  if (!role || !Object.values(UserRole).includes(role)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // RBAC route check using shared canAccessRoute from rbac.ts
  if (!canAccessRoute(role, pathname)) {
    const dashboardUrl = new URL('/', request.url);
    dashboardUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except Next assets and favicon.
     * Use broad _next exclusion so dev chunks (webpack, main-app.js) never hit auth middleware.
     */
    '/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
