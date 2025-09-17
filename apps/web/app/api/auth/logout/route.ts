import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header for the backend call
    const authHeader = request.headers.get('authorization');
    
    // Call the backend logout endpoint
    const response = await fetch(`${process.env['NEXT_PUBLIC_API_BASE'] || 'http://localhost:3000'}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      credentials: 'include', // Include httpOnly cookies
    });

    // Clear frontend cookies regardless of backend response
    const cookieStore = cookies();
    
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
    const cookieStore = cookies();
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