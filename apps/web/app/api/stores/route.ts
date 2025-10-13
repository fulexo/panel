import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api';

const BACKEND_API_BASE = getBackendApiBaseUrl();

export async function GET(request: NextRequest) {
  try {
    const backendUrl = new URL('/api/stores', BACKEND_API_BASE);
    request.nextUrl.searchParams.forEach((value, key) => {
      backendUrl.searchParams.set(key, value);
    });

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') ?? '',
        'User-Agent': request.headers.get('user-agent') ?? 'Fulexo-Web',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env['NODE_ENV'] === 'development') {
        // eslint-disable-next-line no-console
        console.error('Stores API proxy error:', response.status);
      }
      return NextResponse.json(
        { error: 'Failed to fetch stores', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });
    const setCookieHeaders = response.headers.getSetCookie();
    setCookieHeaders?.forEach((cookie) => nextResponse.headers.append('Set-Cookie', cookie));
    return nextResponse;
  } catch (error) {
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.error('Stores API error');
    }
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = new URL('/api/stores', BACKEND_API_BASE);
    const body = await request.text();

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') ?? 'application/json',
        Cookie: request.headers.get('cookie') ?? '',
        'User-Agent': request.headers.get('user-agent') ?? 'Fulexo-Web',
      },
      body,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env['NODE_ENV'] === 'development') {
        // eslint-disable-next-line no-console
        console.error('Create store proxy error:', response.status);
      }
      return NextResponse.json(
        { error: 'Failed to create store', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const nextResponse = NextResponse.json(data, { status: response.status });
    const setCookieHeaders = response.headers.getSetCookie();
    setCookieHeaders?.forEach((cookie) => nextResponse.headers.append('Set-Cookie', cookie));
    return nextResponse;
  } catch (error) {
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.error('Create store API error');
    }
    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    );
  }
}
