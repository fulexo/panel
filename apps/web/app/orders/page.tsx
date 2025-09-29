"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useStores } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { 
  Plus, 
  ShoppingCart, 
  Clock, 
  Truck, 
  Package, 
  CheckCircle, 
  Eye, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
// import { ApiError } from "@/lib/api-client";

export default function OrdersPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  
  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch stores data (for admin store filter)
  const { data: storesData } = useStores();
  const stores = (storesData as any)?.data || [];
  
  // Fetch orders data
  const { 
    data: ordersData, 
    isLoading
  } = useOrders({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    // For admin users, allow store filtering. For customers, use their store
    ...(isAdmin() && storeFilter ? { storeId: storeFilter } : {}),
    ...(!isAdmin() && userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<{ id: string; orderNumber: string; status: string; total: number; createdAt: string; customerEmail: string }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: unknown };

  const updateOrderStatus = useUpdateOrderStatus();

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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1">
              <h1 className="mobile-heading text-foreground flex items-center gap-3">
                <ShoppingCart className="h-8 w-8 text-primary" />
                Orders
              </h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage all orders across all stores' : 'View your store orders'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <ProtectedComponent permission="orders.manage">
                <Link href="/orders/create" className="btn btn-primary btn-md flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Create Order</span>
                </Link>
              </ProtectedComponent>
              <ProtectedComponent permission="orders.approve">
                <Link href="/orders/approvals" className="btn btn-warning btn-md flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16">
                  <Clock className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Approvals</span>
                </Link>
              </ProtectedComponent>
              <ProtectedComponent permission="shipping.manage">
                <Link href="/shipping" className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16">
                  <Truck className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Shipping</span>
                </Link>
              </ProtectedComponent>
              <ProtectedComponent permission="inventory.manage">
                <Link href="/inventory" className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16">
                  <Package className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Inventory</span>
                </Link>
              </ProtectedComponent>
              <ProtectedComponent permission="inventory.approve">
                <Link href="/inventory/approvals" className="btn btn-warning btn-md flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Inv. Approvals</span>
                </Link>
              </ProtectedComponent>
            </div>
          </div>

          {/* Enhanced Filters */}
          <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search orders by number, customer, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                  />
                </div>
                <div className="relative w-full sm:w-auto sm:min-w-[160px]">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                {isAdmin() && (
                  <div className="relative w-full sm:w-auto sm:min-w-[180px]">
                    <ShoppingCart className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      value={storeFilter}
                      onChange={(e) => setStoreFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="">All Stores ({stores.length})</option>
                      {stores.map((store: any) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="btn btn-outline btn-md flex items-center justify-center gap-2 hover:bg-accent/50 transition-all duration-200 w-full sm:w-auto sm:min-w-[100px] h-10">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm font-medium">Refresh</span>
                </button>
                <button className="btn btn-outline btn-md flex items-center justify-center gap-2 hover:bg-accent/50 transition-all duration-200 w-full sm:w-auto sm:min-w-[100px] h-10">
                  <Download className="h-4 w-4" />
                  <span className="text-sm font-medium">Export</span>
                </button>
              </div>
            </div>
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
                          <div className="flex flex-col sm:flex-row gap-2 w-full">
                            <button className="btn btn-outline btn-sm flex items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full sm:w-auto h-8">
                              <Eye className="h-3 w-3" />
                              <span className="text-xs font-medium">View</span>
                            </button>
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                              className="btn btn-outline btn-sm text-xs hover:bg-accent/50 transition-all duration-200 appearance-none cursor-pointer px-3 py-1.5 w-full sm:w-auto h-8"
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

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalOrders)} of {totalOrders} orders
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-outline btn-sm flex items-center gap-2 hover:bg-accent/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-xs font-medium">Prev</span>
                  </button>
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 min-w-[32px] h-8 ${
                            page === pageNum
                              ? 'bg-primary text-primary-foreground shadow-lg'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-outline btn-sm flex items-center gap-2 hover:bg-accent/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] h-8"
                  >
                    <span className="text-xs font-medium">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}