import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Frontend Error:', errorData);
    }
    
    // In production, you might want to send this to an error tracking service
    // like Sentry, LogRocket, etc.
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to log error' },
      { status: 500 }
    );
  }
}