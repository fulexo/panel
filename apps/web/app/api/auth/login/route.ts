import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api';

const BACKEND_API_BASE = getBackendApiBaseUrl();

export async function POST(request: NextRequest) {
  try {
    console.log('Login endpoint called');
    console.log('BACKEND_API_BASE:', BACKEND_API_BASE);
    console.log('Environment variables:', {
      BACKEND_API_BASE: process.env['BACKEND_API_BASE'],
      API_BASE_URL: process.env['API_BASE_URL'],
      NEXT_PUBLIC_API_BASE: process.env['NEXT_PUBLIC_API_BASE'],
      DOMAIN_API: process.env['DOMAIN_API'],
      NODE_ENV: process.env['NODE_ENV']
    });
    const { email, password } = await request.json();
    console.log('Email:', email);

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
      console.log('Calling backend API...');
      
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
      console.error('Backend connection error:', fetchError);
      return NextResponse.json(
        { error: 'Backend service is not available. Please check if API server is running.' },
        { status: 503 }
      );
    }

    console.log('Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      let errorData;
      try {
        errorData = await backendResponse.json();
      } catch {
        errorData = { message: 'Backend returned an error' };
      }
      console.log('Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.message || 'Login failed' },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    console.log('Backend success data:', data);

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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
