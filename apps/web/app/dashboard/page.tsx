"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useDashboardStats, useOrders, useStores } from "@/hooks/useApi";
import { DashboardStats } from "@/types/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ApiError } from "@/lib/api-client";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  
  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats(
    isAdmin() ? undefined : userStoreId
  ) as { data: DashboardStats | undefined; isLoading: boolean; error: ApiError | null };
  
  const { data: recentOrders, isLoading: ordersLoading } = useOrders({
    limit: 5,
    storeId: isAdmin() ? undefined : userStoreId,
  });
  
  const { data: stores, isLoading: storesLoading } = useStores();

  if (statsLoading || ordersLoading || (isAdmin() && storesLoading)) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading dashboard...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (statsError) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-500 text-lg">Error loading dashboard</div>
            <div className="text-muted-foreground">
              {statsError instanceof ApiError ? statsError.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Overview of all stores and operations' : 'Your store overview and statistics'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Orders</h3>
              <div className="text-3xl font-bold text-primary">
                {stats?.totalOrders || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Across all stores' : 'This month'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Products</h3>
              <div className="text-3xl font-bold text-primary">
                {stats?.totalProducts || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Total products' : 'In your store'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Customers</h3>
              <div className="text-3xl font-bold text-primary">
                {stats?.totalCustomers || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Total customers' : 'In your store'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Revenue</h3>
              <div className="text-3xl font-bold text-primary">
                ${stats?.totalRevenue || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Total revenue' : 'This month'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Orders</h3>
              <div className="space-y-3">
                {recentOrders?.data?.length > 0 ? (
                  recentOrders.data.map((order: any) => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-accent rounded-lg">
                      <div>
                        <div className="font-medium">Order #{order.orderNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${order.total}</div>
                        <div className={`text-sm ${
                          order.status === 'completed' ? 'text-green-600' :
                          order.status === 'processing' ? 'text-yellow-600' :
                          'text-gray-600'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No recent orders
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Low Stock Alerts</h3>
              <div className="space-y-3">
                {stats?.lowStockProducts?.length > 0 ? (
                  stats.lowStockProducts.map((product: any) => (
                    <div key={product.id} className={`flex justify-between items-center p-3 rounded-lg ${
                      product.stockQuantity <= 5 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <div>
                        <div className={`font-medium ${
                          product.stockQuantity <= 5 ? 'text-red-800' : 'text-yellow-800'
                        }`}>
                          {product.name}
                        </div>
                        <div className={`text-sm ${
                          product.stockQuantity <= 5 ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          SKU: {product.sku}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          product.stockQuantity <= 5 ? 'text-red-800' : 'text-yellow-800'
                        }`}>
                          {product.stockQuantity} left
                        </div>
                        <div className={`text-sm ${
                          product.stockQuantity <= 5 ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {product.stockQuantity <= 5 ? 'Critical' : 'Warning'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No low stock alerts
                  </div>
                )}
              </div>
            </div>
          </div>

          {isAdmin() && stores?.data && (
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Store Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stores.data.map((store: any) => (
                  <div key={store.id} className="p-4 bg-accent rounded-lg">
                    <div className="font-medium">{store.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {store._count?.orders || 0} orders this month
                    </div>
                    <div className={`text-sm ${
                      store.status === 'connected' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {store.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
