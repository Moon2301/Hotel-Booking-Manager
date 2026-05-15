import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    // Call backend logout if we have an access token
    if (accessToken) {
      await fetch(`${API_INTERNAL_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }

    // Clear cookies regardless of backend response
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    // Still clear cookies even if backend call fails
    const cookieStore = await cookies();
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');

    return NextResponse.json({ success: true });
  }
}
