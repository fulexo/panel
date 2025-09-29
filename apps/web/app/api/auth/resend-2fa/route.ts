import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api';

const BACKEND_API_BASE = getBackendApiBaseUrl();

export async function POST(request: NextRequest) {
  try {
    const { tempToken } = await request.json();

    if (!tempToken) {
      return NextResponse.json(
        { error: 'Temp token is required' },
        { status: 400 }
      );
    }

    const backendUrl = new URL('/api/auth/resend-2fa', BACKEND_API_BASE);
    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tempToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}