import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api';
import { cookies } from 'next/headers';

const BACKEND_API_BASE = getBackendApiBaseUrl();

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header for the backend call
    const authHeader = request.headers.get('authorization');
    
    // Call the backend logout endpoint
    const backendUrl = new URL('/api/auth/logout', BACKEND_API_BASE);
    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      credentials: 'include', // Include httpOnly cookies
    });

    // Clear frontend cookies regardless of backend response
    const cookieStore = await cookies();
    
    // Clear all auth-related cookies
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    cookieStore.delete('user');
    cookieStore.delete('temp_2fa_token');

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Logout failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Return success response
    return NextResponse.json({
      success: data.success,
      message: data.message || 'Logged out successfully',
    });
  } catch {
    // Even if there's an error, clear cookies
    const cookieStore = await cookies();
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    cookieStore.delete('user');
    cookieStore.delete('temp_2fa_token');
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
