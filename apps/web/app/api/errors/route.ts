import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Frontend Error:', errorData);
    }
    
    // Send to backend monitoring service
    try {
      const response = await fetch(`${process.env['NEXT_PUBLIC_API_BASE'] || 'http://localhost:3000'}/api/monitoring/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...errorData,
          source: 'frontend',
        }),
      });
      
      if (!response.ok) {
        // eslint-disable-next-line no-console
        console.error('Failed to send error to monitoring service');
      }
    } catch (monitoringError) {
      // eslint-disable-next-line no-console
      console.error('Error sending to monitoring service:', monitoringError);
    }
    
    // Log to console as fallback
    // eslint-disable-next-line no-console
    console.error('Frontend Error:', {
      type: errorData.type,
      message: errorData.message,
      stack: errorData.stack,
      timestamp: errorData.timestamp,
      url: errorData.url,
    });
    
    return NextResponse.json({ success: true });
  } catch {
    // Silent fail for error logging
    return NextResponse.json({ success: false }, { status: 500 });
  }
}