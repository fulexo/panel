import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api';

const BACKEND_API_BASE = getBackendApiBaseUrl();

export async function GET(request: NextRequest) {
  try {
    const backendUrl = new URL('/api/auth/me', BACKEND_API_BASE);

    // Direct call to backend API with timeout
    const controller = new globalThis.AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward all cookies from the original request
        'Cookie': request.headers.get('cookie') || '',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Auth me error:', error);
    // Return unauthorized instead of internal server error for timeout/connection issues
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}

