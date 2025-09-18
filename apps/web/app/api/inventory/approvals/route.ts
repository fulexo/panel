import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // This would typically fetch pending approvals from your backend
    const approvals = [
      {
        id: '1',
        storeId: '1',
        storeName: 'Sample Store 1',
        productId: '123',
        productName: 'Sample Product',
        changeType: 'stock_update',
        oldValue: 50,
        newValue: 75,
        requestedBy: 'customer@example.com',
        requestedAt: new Date().toISOString(),
        status: 'pending',
      },
      {
        id: '2',
        storeId: '1',
        storeName: 'Sample Store 1',
        productId: '124',
        productName: 'Another Product',
        changeType: 'price_update',
        oldValue: 29.99,
        newValue: 34.99,
        requestedBy: 'customer@example.com',
        requestedAt: new Date().toISOString(),
        status: 'pending',
      },
    ];

    return NextResponse.json({ approvals });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch approvals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { approvalId, action } = body; // action: 'approve' | 'reject'
    
    // This would typically update the approval status in your backend
    const result = {
      approvalId,
      action,
      processedAt: new Date().toISOString(),
      status: 'success',
    };

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}