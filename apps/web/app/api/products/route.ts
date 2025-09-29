import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/lib/backend-api';

const BACKEND_API_BASE = getBackendApiBaseUrl();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const storeId = searchParams.get('storeId') || '';

    // Debug logging
    const cookies = request.headers.get('cookie') || '';
    console.log('Products API Route - Request cookies:', cookies);
    console.log('Products API Route - Request params:', { page, limit, search, category, storeId });
    console.log('Products API Route - All headers:', Object.fromEntries(request.headers.entries()));

    // Forward request to backend API
    const backendUrl = new URL('/api/products', BACKEND_API_BASE);
    backendUrl.searchParams.set('page', page);
    backendUrl.searchParams.set('limit', limit);
    if (search) backendUrl.searchParams.set('search', search);
    if (category) backendUrl.searchParams.set('category', category);
    if (storeId) backendUrl.searchParams.set('storeId', storeId);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '',
        'User-Agent': request.headers.get('user-agent') || 'Fulexo-Web',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to fetch products', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json(
      { error: 'Database operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward request to backend API
    const backendUrl = new URL('/api/products', BACKEND_API_BASE);

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
      console.error('Backend API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to create product', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Create product API error:', error);
    return NextResponse.json(
      { error: 'Database operation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

