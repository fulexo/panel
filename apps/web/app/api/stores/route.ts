import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // This would typically fetch from your backend API
    // For now, returning mock data
    const stores = [
      {
        id: '1',
        name: 'Sample Store 1',
        url: 'https://store1.example.com',
        status: 'connected',
        lastSync: new Date().toISOString(),
        config: {
          url: 'https://store1.example.com',
          consumerKey: 'ck_***',
          consumerSecret: 'cs_***',
        },
      },
      {
        id: '2',
        name: 'Sample Store 2',
        url: 'https://store2.example.com',
        status: 'disconnected',
        config: {
          url: 'https://store2.example.com',
          consumerKey: 'ck_***',
          consumerSecret: 'cs_***',
        },
      },
    ];

    return NextResponse.json({ stores });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // This would typically create a new store in your backend
    // For now, returning mock response
    const newStore = {
      id: Date.now().toString(),
      ...body,
      status: 'disconnected',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ store: newStore }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create store' },
      { status: 500 }
    );
  }
}