import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api';

const BACKEND_API_BASE = getBackendApiBaseUrl();

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json();
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      logger.error('Frontend Error:', errorData);
    }
    
    // Send to backend monitoring service
    try {
      const backendUrl = new URL('/api/monitoring/errors', BACKEND_API_BASE);
      const response = await fetch(backendUrl.toString(), {
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
        logger.error('Failed to send error to monitoring service');
      }
    } catch (monitoringError) {
      logger.error('Error sending to monitoring service:', monitoringError);
    }
    
    // Log to console as fallback
    logger.error('Frontend Error:', {
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