import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL || 'http://localhost:3000';

/**
 * Decode a JWT payload without verifying the signature.
 * Used to extract user info from the access token for the client.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_INTERNAL_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const { accessToken, refreshToken } = await response.json();

    const isProduction = process.env.NODE_ENV === 'production';

    const cookieStore = await cookies();

    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });

    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/auth',
    });

    // Decode JWT payload to return user info to the client
    const payload = decodeJwtPayload(accessToken);
    const user = payload
      ? {
          id: payload.sub as string,
          email: payload.email as string,
          role: payload.role as string,
          fullName: (payload.fullName as string) || null,
        }
      : null;

    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json(
      { statusCode: 500, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
