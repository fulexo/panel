import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api';

const BACKEND_API_BASE = getBackendApiBaseUrl();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Forward request to backend API
    const backendUrl = new URL(`/api/products/${id}/bundle-items`, BACKEND_API_BASE);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env['NODE_ENV'] === 'development') {
         
        console.error('Backend API error:', response.status);
      }
      return NextResponse.json(
        { error: 'Failed to fetch bundle items', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (process.env['NODE_ENV'] === 'development') {
       
      console.error('Get bundle items API error');
    }
    return NextResponse.json(
      { error: 'Database operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Forward request to backend API
    const backendUrl = new URL(`/api/products/${id}/bundle-items`, BACKEND_API_BASE);

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (process.env['NODE_ENV'] === 'development') {
         
        console.error('Backend API error:', response.status);
      }
      return NextResponse.json(
        { error: 'Failed to add bundle item', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    if (process.env['NODE_ENV'] === 'development') {
       
      console.error('Add bundle item API error');
    }
    return NextResponse.json(
      { error: 'Database operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

