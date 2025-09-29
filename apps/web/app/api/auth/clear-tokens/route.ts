import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api';

const BACKEND_API_BASE = getBackendApiBaseUrl();

export async function POST(_request: NextRequest) {
  try {
    const backendUrl = new URL('/api/auth/clear-tokens', BACKEND_API_BASE);
    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Forward the response with proper headers
    const nextResponse = NextResponse.json(data, { status: response.status });
    
    // Copy Set-Cookie headers from backend
    const setCookieHeaders = response.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }
    
    return nextResponse;
  } catch (error) {
    console.error('Clear tokens error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
