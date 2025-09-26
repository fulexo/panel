"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
// import { ApiError } from "@/lib/api-client";

export default function OrdersPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch orders data
  const { 
    data: ordersData, 
    isLoading
  } = useOrders({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(isAdmin() ? {} : userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<{ id: string; orderNumber: string; status: string; total: number; createdAt: string; customerEmail: string }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: unknown };

  const updateOrderStatus = useUpdateOrderStatus();
  // const updateOrderShipping = useUpdateOrderShipping();

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus.mutateAsync({ id: orderId, status: newStatus });
    } catch {
      // logger.error('Failed to update order status:', error);
    }
  };

  // const handleShippingUpdate = async (orderId: string, trackingData: { trackingNumber: string; carrier: string }) => {
  //   try {
  //     await updateOrderShipping.mutateAsync({ id: orderId, data: trackingData });
  //   } catch (error) {
  //     logger.error('Failed to update shipping:', error);
  //   }
  // };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="bg-background flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading orders...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Error handling removed as error variable is not available

  const orders = ordersData?.data || [];
  const totalOrders = ordersData?.pagination?.total || 0;
  const totalPages = ordersData?.pagination?.pages || 1;

  // Calculate statistics
  const statusCounts = orders.reduce((acc: Record<string, number>, order: { id: string; orderNumber: string; status: string; total: number; createdAt: string; customerEmail: string }) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ProtectedRoute>
      <div className="bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Orders</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage all orders across all stores' : 'View your store orders'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ProtectedComponent permission="orders.manage">
                <button className="btn btn-primary text-sm">
                  Create Order
                </button>
              </ProtectedComponent>
              <ProtectedComponent permission="orders.create">
                <Link href="/orders/create" className="btn btn-outline text-sm">
                  New Customer Order
                </Link>
              </ProtectedComponent>
              <ProtectedComponent permission="orders.approve">
                <Link href="/orders/approvals" className="btn btn-warning text-sm">
                  Pending Approvals
                </Link>
              </ProtectedComponent>
              <ProtectedComponent permission="shipping.manage">
                <Link href="/shipping" className="btn btn-outline text-sm">
                  Shipping Prices
                </Link>
              </ProtectedComponent>
              <ProtectedComponent permission="inventory.manage">
                <Link href="/inventory" className="btn btn-outline text-sm">
                  Inventory Management
                </Link>
              </ProtectedComponent>
              <ProtectedComponent permission="inventory.approve">
                <Link href="/inventory/approvals" className="btn btn-warning text-sm">
                  Inventory Approvals
                </Link>
              </ProtectedComponent>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Orders</h3>
              <div className="space-y-3">
                {orders.slice(0, 5).map((order: { id: string; orderNumber: string; status: string; total: number; createdAt: string; customerEmail: string; billingInfo?: { first_name: string; last_name: string } }) => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-accent rounded-lg">
                    <div>
                      <div className="font-medium">Order #{order.orderNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.billingInfo?.first_name} {order.billingInfo?.last_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${order.total}</div>
                      <div className={`text-sm ${
                        order.status === 'completed' ? 'text-green-600' :
                        order.status === 'processing' ? 'text-yellow-600' :
                        order.status === 'cancelled' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No orders found
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Order Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Orders</span>
                  <span className="font-medium">{totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-medium text-yellow-600">{statusCounts['pending'] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing</span>
                  <span className="font-medium text-blue-600">{statusCounts['processing'] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-medium text-green-600">{statusCounts['completed'] || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cancelled</span>
                  <span className="font-medium text-red-600">{statusCounts['cancelled'] || 0}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 sm:p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">All Orders</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 sm:p-3 text-sm">Order #</th>
                    <th className="text-left p-2 sm:p-3 text-sm">Customer</th>
                    <th className="text-left p-2 sm:p-3 text-sm">Status</th>
                    <th className="text-left p-2 sm:p-3 text-sm">Total</th>
                    <th className="text-left p-2 sm:p-3 text-sm">Date</th>
                    <ProtectedComponent permission="orders.manage">
                      <th className="text-left p-2 sm:p-3 text-sm">Actions</th>
                    </ProtectedComponent>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: { id: string; orderNumber: string; status: string; total: number; createdAt: string; customerEmail: string; billingInfo?: { first_name: string; last_name: string } }) => (
                    <tr key={order.id} className="border-b border-border">
                      <td className="p-2 sm:p-3 text-sm">#{order.orderNumber}</td>
                      <td className="p-2 sm:p-3 text-sm">
                        {order.billingInfo?.first_name} {order.billingInfo?.last_name}
                      </td>
                      <td className="p-2 sm:p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 text-sm">${order.total}</td>
                      <td className="p-2 sm:p-3 text-sm">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <ProtectedComponent permission="orders.manage">
                        <td className="p-2 sm:p-3">
                          <div className="flex flex-col sm:flex-row gap-1">
                            <button className="btn btn-xs btn-outline">View</button>
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                              className="btn btn-xs btn-outline text-xs"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </td>
                      </ProtectedComponent>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin() ? 6 : 5} className="p-8 text-center text-muted-foreground">
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}