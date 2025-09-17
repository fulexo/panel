import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { tempToken } = await request.json();

    if (!tempToken) {
      return NextResponse.json(
        { error: 'Temp token is required' },
        { status: 400 }
      );
    }

    // Forward to backend
    const response = await fetch(`${process.env['NEXT_PUBLIC_API_BASE'] || 'http://localhost:3000'}/api/auth/resend-2fa`, {
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