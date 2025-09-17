'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface OrderInfo {
  id: string;
  orderNo: number;
  externalOrderNo: string;
  status: string;
  total: number;
  currency: string;
  confirmedAt: string;
  customerEmail: string;
  items: Array<{
    id: string;
    sku: string;
    name: string;
    qty: number;
    price: number;
  }>;
}

export default function OrderInfoPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing token');
      setLoading(false);
      return;
    }

    const fetchOrderInfo = async () => {
      try {
        const response = await fetch(`/api/orders/public/${token}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Order not found or token has expired');
          } else {
            setError('Failed to load order information');
          }
          return;
        }

        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load order information';
        setError(errorMessage);
        // eslint-disable-next-line no-console
        console.error('Error fetching order info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderInfo();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading order information...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full bg-card shadow-lg rounded-lg p-6 border border-border">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-destructive/10 rounded-full">
            <svg
              className="w-6 h-6 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-foreground">
              Unable to Load Order
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg text-foreground">No order information available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-card shadow-lg rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 py-4">
            <h1 className="text-2xl font-bold text-primary-foreground">
              Order Information
            </h1>
            <p className="text-primary-foreground/80 mt-1">
              Order #{order.orderNo} ({order.externalOrderNo})
            </p>
          </div>

          {/* Order Details */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Order Details</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Status:</dt>
                    <dd className="text-sm font-medium text-foreground capitalize">
                      {order.status}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Total:</dt>
                    <dd className="text-sm font-medium text-foreground">
                      {order.total} {order.currency}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Order Date:</dt>
                    <dd className="text-sm font-medium text-foreground">
                      {new Date(order.confirmedAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-muted-foreground">Customer:</dt>
                    <dd className="text-sm font-medium text-foreground">
                      {order.customerEmail}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-3">Order Items</h3>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-accent rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-foreground">
                          {item.qty} × {item.price} {order.currency}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Total: {(item.qty * item.price).toFixed(2)} {order.currency}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-muted px-6 py-4">
            <p className="text-sm text-muted-foreground text-center">
              This is a secure link to view your order information. 
              This link will expire after 24 hours for security purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}