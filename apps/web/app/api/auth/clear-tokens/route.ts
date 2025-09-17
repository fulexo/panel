import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env['NEXT_PUBLIC_API_BASE'] || 'http://localhost:3000';

export async function POST(_request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE}/api/auth/clear-tokens`, {
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
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}