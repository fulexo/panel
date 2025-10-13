import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api';

const BACKEND_API_BASE = getBackendApiBaseUrl();

export async function POST(request: NextRequest) {
  try {
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.log('Login endpoint called', {
        backendBaseConfigured: Boolean(BACKEND_API_BASE),
      });
    }
    const { email, password } = await request.json();
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.log('Login payload received');
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const backendUrl = new URL('/api/auth/login', BACKEND_API_BASE);

    // Check if backend is running
    let backendResponse;
    try {
      if (process.env['NODE_ENV'] === 'development') {
        // eslint-disable-next-line no-console
        console.log('Calling backend API...');
      }
      
      // Add timeout to prevent hanging
      const controller = new globalThis.AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      backendResponse = await fetch(backendUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
    } catch (fetchError) {
      if (process.env['NODE_ENV'] === 'development') {
        // eslint-disable-next-line no-console
        console.error('Backend connection error');
      }
      return NextResponse.json(
        { error: 'Backend service is not available. Please check if API server is running.' },
        { status: 503 }
      );
    }

    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.log('Backend response status:', backendResponse.status);
    }

    if (!backendResponse.ok) {
      let errorData;
      try {
        errorData = await backendResponse.json();
      } catch {
        errorData = { message: 'Backend returned an error' };
      }
      if (process.env['NODE_ENV'] === 'development') {
        // eslint-disable-next-line no-console
        console.log('Backend returned error');
      }
      return NextResponse.json(
        { error: errorData.message || 'Login failed' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.log('Backend success');
    }

    // Set cookies for authentication
    const response = NextResponse.json({
      success: data.success,
      data: data.data,
      message: data.message,
      requiresTwoFactor: data.data?.requiresTwoFactor,
      tempToken: data.data?.tempToken,
    });

    // Copy Set-Cookie headers from backend
    const setCookieHeaders = backendResponse.headers.getSetCookie();
    if (setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach(cookie => {
        response.headers.append('Set-Cookie', cookie);
      });
    }

    return response;
  } catch (error) {
    if (process.env['NODE_ENV'] === 'development') {
      // eslint-disable-next-line no-console
      console.error('Login error');
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
