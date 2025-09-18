import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    
    // This would typically trigger sync with WooCommerce
    // For now, returning mock response
    const syncResult = {
      storeId,
      status: 'success',
      syncedAt: new Date().toISOString(),
      itemsSynced: {
        products: 150,
        orders: 25,
        customers: 100,
      },
    };

    return NextResponse.json({ sync: syncResult });
    } catch {
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}