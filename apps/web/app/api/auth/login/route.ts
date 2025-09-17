import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Call the backend login endpoint
    const response = await fetch(`${process.env['NEXT_PUBLIC_API_BASE'] || 'http://localhost:3000'}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Include cookies from backend
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Login failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Forward cookies from backend response
    const cookieStore = cookies();
    const setCookieHeaders = response.headers.get('set-cookie');
    
    if (setCookieHeaders) {
      // Parse and forward backend cookies
      const cookies = setCookieHeaders.split(',').map(cookie => cookie.trim());
      for (const cookie of cookies) {
        const [nameValue, ...options] = cookie.split(';');
        if (!nameValue) continue;
        const [name, value] = nameValue.split('=');
        
        if (name && value) {
          const cookieOptions: Record<string, unknown> = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
          };
          
          // Parse cookie options
          for (const option of options) {
            const [optName, optValue] = option.trim().split('=');
            if (!optName) continue;
            switch (optName.toLowerCase()) {
              case 'max-age':
                if (optValue) cookieOptions['maxAge'] = parseInt(optValue, 10);
                break;
              case 'expires':
                if (optValue) cookieOptions['expires'] = new Date(optValue);
                break;
              case 'domain':
                cookieOptions['domain'] = optValue;
                break;
            }
          }
          
          cookieStore.set(name, value, cookieOptions);
        }
      }
    }

    // Return the response without sensitive data
    return NextResponse.json({
      success: data.success,
      data: data.data,
      message: data.message,
      requiresTwoFactor: data.data?.requiresTwoFactor,
      tempToken: data.data?.tempToken,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}