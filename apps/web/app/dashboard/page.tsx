"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useDashboardStats, useOrders, useStores } from "@/hooks/useApi";
import { DashboardStats } from "@/types/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ApiError } from "@/lib/api-client";
import CalendarWidget from "@/components/CalendarWidget";
import Link from "next/link";
import { 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3,
  Truck,
  ClipboardList,
  Clock,
  CheckCircle,
  Plus,
  TrendingUp,
  AlertTriangle,
  Building
} from "lucide-react";

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
    ...(isAdmin() ? {} : userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<{ id: string; orderNumber: string; createdAt: string; status: string; total: number }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: unknown };
  
  const { data: stores, isLoading: storesLoading } = useStores() as { data: { data: Array<{ id: string; name: string; status: string; url: string }> } | undefined; isLoading: boolean; error: unknown };

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
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto p-6">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="text-center">
              <div className="text-red-500 text-lg font-semibold mb-2">Dashboard Error</div>
              <div className="text-muted-foreground text-sm mb-4">
                {statsError instanceof ApiError ? statsError.message : 'Failed to load dashboard data'}
              </div>
              <div className="text-xs text-muted-foreground mb-6">
                {statsError instanceof ApiError && statsError.message.includes('token') ? 
                  'Authentication token missing. Please login again.' :
                  'This usually happens when your session has expired or the API server is not responding.'
                }
              </div>
              <div className="text-xs bg-muted/20 p-3 rounded-lg mb-6">
                <strong>Debug Info:</strong><br/>
                User: {user ? `${user.email} (${user.role})` : 'Not logged in'}<br/>
                Error: {statsError instanceof ApiError ? `${statsError.status} - ${statsError.message}` : 'Unknown error'}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button 
                onClick={() => window.location.reload()} 
                className="btn btn-primary flex-1"
              >
                Retry Dashboard
              </button>
              <button 
                onClick={() => {
                  sessionStorage.clear();
                  localStorage.clear();
                  window.location.href = '/login';
                }} 
                className="btn btn-outline flex-1"
              >
                Re-login
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1">
              <h1 className="mobile-heading text-foreground flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-blue-600 dark:text-primary" />
                Dashboard
              </h1>
              <p className="text-gray-700 dark:text-gray-400 mobile-text font-medium">
                {isAdmin() ? 'Overview of all stores and operations' : 'Your store overview and statistics'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Link href="/orders/create" className="btn btn-primary btn-md flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16">
                <Plus className="h-5 w-5 text-white" />
                <span className="text-xs font-medium leading-tight">Create Order</span>
              </Link>
              <Link href="/products" className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16">
                <Package className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                <span className="text-xs font-medium leading-tight">Products</span>
              </Link>
              <Link href="/inventory" className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16">
                <BarChart3 className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                <span className="text-xs font-medium leading-tight">Inventory</span>
              </Link>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-50/50 dark:bg-blue-900/30 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-blue-700 dark:text-blue-400" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{stats?.totalOrders || 0}</div>
                  <p className="text-sm text-foreground font-medium">Total Orders</p>
                </div>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold">
                {isAdmin() ? 'Across all stores' : 'This month'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-50/50 dark:bg-green-900/30 rounded-lg">
                  <Package className="h-6 w-6 text-green-700 dark:text-green-400" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{stats?.totalProducts || 0}</div>
                  <p className="text-sm text-foreground font-medium">Products</p>
                </div>
              </div>
              <p className="text-xs text-green-700 dark:text-green-400 font-semibold">
                {isAdmin() ? 'Total products' : 'In your store'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-50/50 dark:bg-purple-900/30 rounded-lg">
                  <Users className="h-6 w-6 text-purple-700 dark:text-purple-400" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{stats?.totalCustomers || 0}</div>
                  <p className="text-sm text-foreground font-medium">Users</p>
                </div>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold">
                {isAdmin() ? 'Panel users' : 'Store customers'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-emerald-50/50 dark:bg-emerald-900/30 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">${stats?.totalRevenue || 0}</div>
                  <p className="text-sm text-foreground font-medium">Revenue</p>
                </div>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                {isAdmin() ? 'Total revenue' : 'This month'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50/50 dark:bg-blue-900/30 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-blue-700 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Recent Orders</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-400 font-medium">Latest order activity</p>
                </div>
              </div>
              <div className="space-y-3">
                {recentOrders?.data && recentOrders.data.length > 0 ? (
                  recentOrders.data.map((order: { id: string; orderNumber: string; createdAt: string; status: string; total: number }) => (
                    <div key={order.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-accent/30 to-accent/20 rounded-lg border border-border/50 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">Order #{order.orderNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-foreground">${order.total}</div>
                        <div className={`text-sm font-medium ${
                          order.status === 'completed' ? 'text-green-700 dark:text-green-400' :
                          order.status === 'processing' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-foreground/80 font-medium">
                    No recent orders
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-50/50 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-700 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Low Stock Alerts</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-400 font-medium">Products needing attention</p>
                </div>
              </div>
              <div className="space-y-3">
                {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
                  stats.lowStockProducts.map((product: { id: string; name: string; sku: string; stock: number }) => (
                    <div key={product.id} className={`flex justify-between items-center p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                      product.stock <= 5 ? 
                        'bg-gradient-to-r from-red-50/80 to-red-100/80 dark:from-red-900/20 dark:to-red-800/20 border-red-200/60 dark:border-red-800/30' : 
                        'bg-gradient-to-r from-yellow-50/80 to-yellow-100/80 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200/60 dark:border-yellow-800/30'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          product.stock <= 5 ? 'bg-red-500' : 'bg-yellow-500'
                        }`}>
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className={`font-semibold ${
                            product.stock <= 5 ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
                          }`}>
                            {product.name}
                          </div>
                          <div className={`text-sm ${
                            product.stock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                          }`}>
                            SKU: {product.sku}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${
                          product.stock <= 5 ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {product.stock} left
                        </div>
                        <div className={`text-sm font-medium ${
                          product.stock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {product.stock <= 5 ? 'Critical' : 'Warning'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-foreground/80 font-medium">
                    No low stock alerts
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
                <p className="text-sm text-gray-800 dark:text-gray-300 font-semibold">Frequently used features and shortcuts</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {/* Core Actions */}
              <Link href="/orders" className="group p-5 bg-card dark:bg-gradient-to-br dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-blue-500 rounded-lg shadow-sm">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-semibold text-card-foreground">Orders</div>
                </div>
                  <div className="text-sm text-card-foreground/80 leading-relaxed font-semibold">Manage orders & shipping</div>
              </Link>
              
              <Link href="/products" className="group p-5 bg-card dark:bg-gradient-to-br dark:from-green-900/20 dark:to-green-800/20 rounded-xl border border-green-200 dark:border-green-800/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-green-500 rounded-lg shadow-sm">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-semibold text-card-foreground">Products</div>
                </div>
                  <div className="text-sm text-card-foreground/80 leading-relaxed font-semibold">Manage product catalog</div>
              </Link>
              
              <Link href="/customers" className="group p-5 bg-card dark:bg-gradient-to-br dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-purple-500 rounded-lg shadow-sm">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-semibold text-card-foreground">Users</div>
                </div>
                  <div className="text-sm text-card-foreground/80 leading-relaxed font-semibold">Manage panel users</div>
              </Link>
              
              <Link href="/inventory" className="group p-5 bg-card dark:bg-gradient-to-br dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl border border-orange-200 dark:border-orange-800/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-orange-500 rounded-lg shadow-sm">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-semibold text-card-foreground">Inventory</div>
                </div>
                  <div className="text-sm text-card-foreground/80 leading-relaxed font-semibold">Stock management</div>
              </Link>

              {/* Admin Only Actions */}
              {isAdmin() && (
                <>
                  <Link href="/stores" className="group p-5 bg-card dark:bg-gradient-to-br dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl border border-indigo-200 dark:border-indigo-800/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-indigo-500 rounded-lg shadow-sm">
                        <Building className="h-5 w-5 text-white" />
                      </div>
                      <div className="font-semibold text-card-foreground">Stores</div>
                    </div>
                    <div className="text-sm text-card-foreground/80 leading-relaxed font-semibold">Manage customer stores</div>
                  </Link>
                  
                  <Link href="/shipping" className="group p-5 bg-card dark:bg-gradient-to-br dark:from-teal-900/20 dark:to-teal-800/20 rounded-xl border border-teal-200 dark:border-teal-800/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-teal-500 rounded-lg shadow-sm">
                        <Truck className="h-5 w-5 text-white" />
                      </div>
                      <div className="font-semibold text-card-foreground">Shipping</div>
                    </div>
                    <div className="text-sm text-card-foreground/80 leading-relaxed font-semibold">Logistics & delivery</div>
                  </Link>
                  
                  <Link href="/orders/approvals" className="group p-5 bg-card dark:bg-gradient-to-br dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl border border-amber-200 dark:border-amber-800/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-amber-500 rounded-lg shadow-sm">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div className="font-semibold text-card-foreground">Order Approvals</div>
                    </div>
                    <div className="text-sm text-card-foreground/80 leading-relaxed font-semibold">Review pending orders</div>
                  </Link>
                  
                  <Link href="/inventory/approvals" className="group p-5 bg-card dark:bg-gradient-to-br dark:from-rose-900/20 dark:to-rose-800/20 rounded-xl border border-rose-200 dark:border-rose-800/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-rose-500 rounded-lg shadow-sm">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div className="font-semibold text-card-foreground">Inventory Approvals</div>
                    </div>
                    <div className="text-sm text-card-foreground/80 leading-relaxed font-semibold">Review stock requests</div>
                  </Link>
                </>
              )}

              {/* Universal Actions */}
              <Link href="/support" className="group p-5 bg-card dark:bg-gradient-to-br dark:from-gray-800/20 dark:to-gray-700/20 rounded-xl border border-gray-200 dark:border-gray-700/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-gray-500 rounded-lg shadow-sm">
                    <ClipboardList className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-semibold text-card-foreground">Support</div>
                </div>
                <div className="text-sm text-card-foreground/80 leading-relaxed font-semibold">Help & tickets</div>
              </Link>
              
              <Link href="/reports" className="group p-5 bg-card dark:bg-gradient-to-br dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-xl border border-cyan-200 dark:border-cyan-800/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 min-h-[120px] flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-cyan-500 rounded-lg shadow-sm">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div className="font-semibold text-card-foreground">Reports</div>
                </div>
                <div className="text-sm text-card-foreground/80 leading-relaxed font-semibold">Analytics & insights</div>
              </Link>
            </div>
          </div>

          {/* Calendar Widget */}
          <CalendarWidget />

          {isAdmin() && stores?.data && (
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <Building className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Store Overview</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-400 font-medium">Monitor all connected customer stores</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.data.map((store: { id: string; name: string; status: string; url: string; _count?: { orders: number } }) => (
                  <div key={store.id} className="p-4 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl border border-border hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        store.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        <Building className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{store.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{store.url}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                    <div className="text-sm text-foreground/80 font-medium">
                      {store._count?.orders || 0} orders
                    </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        store.status === 'connected' ? 
                          'bg-green-100 text-gray-900 dark:bg-green-900/30 dark:text-green-300' : 
                          'bg-red-100 text-gray-900 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {store.status}
                      </span>
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
