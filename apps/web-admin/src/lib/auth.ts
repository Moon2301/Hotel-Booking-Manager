import { cookies } from 'next/headers';
import type { UserRole } from '@/types';
import type { AuthUser } from '@/providers/auth-provider';

/**
 * Decode a JWT payload without verifying the signature.
 * Used server-side to extract user info from the httpOnly access_token cookie.
 */
export function decodeJwtPayload(
  token: string
): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Read the access_token cookie and extract user info.
 * Returns null if no valid token is found.
 *
 * This is intended for use in Server Components to pass initial user data
 * to the AuthProvider client component.
 */
export async function getServerUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  // Check if token is expired
  const exp = payload.exp as number | undefined;
  if (exp && Date.now() >= exp * 1000) return null;

  return {
    id: payload.sub as string,
    email: payload.email as string,
    role: payload.role as UserRole,
    fullName: (payload.fullName as string) || null,
  };
}
