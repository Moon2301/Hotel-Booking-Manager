import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { statusCode: 401, message: 'No refresh token' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_INTERNAL_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();

      // Clear cookies on refresh failure
      cookieStore.delete('access_token');
      cookieStore.delete('refresh_token');

      return NextResponse.json(error, { status: response.status });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await response.json();

    const isProduction = process.env.NODE_ENV === 'production';

    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });

    cookieStore.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/api/auth',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { statusCode: 500, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
