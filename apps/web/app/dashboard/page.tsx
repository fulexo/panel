"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useDashboardStats, useOrders, useStores } from "@/hooks/useApi";
import { DashboardStats } from "@/types/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import CalendarWidget from "@/components/CalendarWidget";
import { MetricCard } from "@/components/patterns/MetricCard";
import { SectionShell } from "@/components/patterns/SectionShell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  const adminView = isAdmin();
  
  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats(
    adminView ? undefined : userStoreId
  ) as { data: DashboardStats | undefined; isLoading: boolean; error: ApiError | null };
  
  const { data: recentOrders, isLoading: ordersLoading } = useOrders({
    limit: 3,
    ...(adminView ? {} : userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<{ id: string; orderNumber: string; createdAt: string; status: string; total: number }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: unknown };
  
  const { data: stores, isLoading: storesLoading } = useStores() as { data: { data: Array<{ id: string; name: string; status: string; url: string }> } | undefined; isLoading: boolean; error: unknown };

  if (statsLoading || ordersLoading || (adminView && storesLoading)) {
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
              <Button 
                onClick={() => window.location.reload()} 
                variant="default"
                className="flex-1"
              >
                Retry Dashboard
              </Button>
              <Button 
                onClick={() => {
                  sessionStorage.clear();
                  localStorage.clear();
                  window.location.href = '/login';
                }} 
                variant="outline"
                className="flex-1"
              >
                Re-login
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const metricCards = [
    {
      key: "orders",
      label: "Total Orders",
      value: stats?.totalOrders?.toLocaleString() ?? "0",
      context: adminView ? "Across all stores" : "This month",
      icon: ShoppingCart,
      tone: "blue" as const,
    },
    {
      key: "products",
      label: "Products",
      value: stats?.totalProducts?.toLocaleString() ?? "0",
      context: adminView ? "Total products" : "In your store",
      icon: Package,
      tone: "green" as const,
    },
    {
      key: "customers",
      label: "Users",
      value: stats?.totalCustomers?.toLocaleString() ?? "0",
      context: adminView ? "Panel users" : "Store customers",
      icon: Users,
      tone: "purple" as const,
    },
    {
      key: "revenue",
      label: "Revenue",
      value: formatCurrency(stats?.totalRevenue ?? 0),
      context: adminView ? "Total revenue" : "This month",
      icon: TrendingUp,
      tone: "emerald" as const,
    },
  ];

  type QuickActionTone =
    | "blue"
    | "green"
    | "purple"
    | "orange"
    | "indigo"
    | "teal"
    | "amber"
    | "rose"
    | "slate"
    | "cyan";

  const quickActionToneClasses: Record<QuickActionTone, string> = {
    blue: "border-blue-200/70 bg-blue-50 dark:border-blue-800/60 dark:bg-blue-900/25",
    green: "border-green-200/70 bg-green-50 dark:border-green-800/60 dark:bg-green-900/25",
    purple: "border-purple-200/70 bg-purple-50 dark:border-purple-800/60 dark:bg-purple-900/25",
    orange: "border-orange-200/70 bg-orange-50 dark:border-orange-800/60 dark:bg-orange-900/25",
    indigo: "border-indigo-200/70 bg-indigo-50 dark:border-indigo-800/60 dark:bg-indigo-900/25",
    teal: "border-teal-200/70 bg-teal-50 dark:border-teal-800/60 dark:bg-teal-900/25",
    amber: "border-amber-200/70 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/25",
    rose: "border-rose-200/70 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-900/25",
    slate: "border-slate-200/70 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/30",
    cyan: "border-cyan-200/70 bg-cyan-50 dark:border-cyan-800/60 dark:bg-cyan-900/25",
  };

  const quickActionIconClasses: Record<QuickActionTone, string> = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    purple: "bg-purple-600",
    orange: "bg-orange-500",
    indigo: "bg-indigo-600",
    teal: "bg-teal-600",
    amber: "bg-amber-500",
    rose: "bg-rose-600",
    slate: "bg-slate-600",
    cyan: "bg-cyan-600",
  };

  const quickActions = [
    {
      key: "orders",
      label: "Orders",
      description: "Manage orders & shipping",
      href: "/orders",
      icon: ShoppingCart,
      tone: "blue" as QuickActionTone,
      adminOnly: false,
    },
    {
      key: "products",
      label: "Products",
      description: "Manage product catalog",
      href: "/products",
      icon: Package,
      tone: "green" as QuickActionTone,
      adminOnly: false,
    },
    {
      key: "customers",
      label: "Users",
      description: "Manage panel users",
      href: "/customers",
      icon: Users,
      tone: "purple" as QuickActionTone,
      adminOnly: false,
    },
    {
      key: "inventory",
      label: "Inventory",
      description: "Stock management",
      href: "/inventory",
      icon: BarChart3,
      tone: "orange" as QuickActionTone,
      adminOnly: false,
    },
    {
      key: "stores",
      label: "Stores",
      description: "Manage customer stores",
      href: "/stores",
      icon: Building,
      tone: "indigo" as QuickActionTone,
      adminOnly: true,
    },
    {
      key: "shipping",
      label: "Shipping",
      description: "Logistics & delivery",
      href: "/shipping",
      icon: Truck,
      tone: "teal" as QuickActionTone,
      adminOnly: true,
    },
    {
      key: "order-approvals",
      label: "Order Approvals",
      description: "Review pending orders",
      href: "/orders/approvals",
      icon: Clock,
      tone: "amber" as QuickActionTone,
      adminOnly: true,
    },
    {
      key: "inventory-approvals",
      label: "Inventory Approvals",
      description: "Review stock requests",
      href: "/inventory/approvals",
      icon: CheckCircle,
      tone: "rose" as QuickActionTone,
      adminOnly: true,
    },
    {
      key: "support",
      label: "Support",
      description: "Help & tickets",
      href: "/support",
      icon: ClipboardList,
      tone: "slate" as QuickActionTone,
      adminOnly: false,
    },
    {
      key: "reports",
      label: "Reports",
      description: "Analytics & insights",
      href: "/reports",
      icon: BarChart3,
      tone: "cyan" as QuickActionTone,
      adminOnly: false,
    },
  ];

  const visibleQuickActions = quickActions.filter((action) =>
    action.adminOnly ? adminView : true
  );

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
                {adminView ? 'Overview of all stores and operations' : 'Your store overview and statistics'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button asChild variant="default" className="flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16">
                <Link href="/orders/create">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Create Order</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16">
                <Link href="/products">
                  <Package className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Products</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16">
                <Link href="/inventory">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Inventory</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {metricCards.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                value={metric.value}
                context={metric.context}
                tone={metric.tone}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionShell
              title="Recent Orders"
              description="Latest order activity"
              actions={
                <Link
                  href="/orders"
                  className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  View all
                </Link>
              }
            >
              <div className="space-y-3">
                {recentOrders?.data && recentOrders.data.length > 0 ? (
                  recentOrders.data.map((order: { id: string; orderNumber: string; createdAt: string; status: string; total: number }) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-accent/10 p-4 transition-colors hover:bg-accent/20"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">Order #{order.orderNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-foreground">
                          {formatCurrency(order.total)}
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            order.status === "completed"
                              ? "text-emerald-700 dark:text-emerald-300"
                              : order.status === "processing"
                              ? "text-amber-600 dark:text-amber-300"
                              : "text-muted-foreground"
                          )}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm font-medium text-muted-foreground">
                    No recent orders
                  </div>
                )}
              </div>
            </SectionShell>

            <SectionShell
              title="Low Stock Alerts"
              description="Products needing attention"
              actions={
                <Link
                  href="/inventory"
                  className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  Manage inventory
                </Link>
              }
            >
              <div className="space-y-3">
                {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
                  stats.lowStockProducts.map((product: { id: string; name: string; sku: string; stock: number }) => {
                    const critical = product.stock <= 5;

                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-4 transition-colors",
                          critical
                            ? "border-red-300/70 bg-red-500/10 dark:border-red-800/60 dark:bg-red-900/20"
                            : "border-amber-300/70 bg-amber-500/10 dark:border-amber-800/60 dark:bg-amber-900/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "inline-flex h-9 w-9 items-center justify-center rounded-lg text-white",
                              critical ? "bg-red-600" : "bg-amber-500"
                            )}
                          >
                            <Package className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div>
                            <div className="font-semibold text-foreground">{product.name}</div>
                            <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">{product.stock} left</div>
                          <span
                            className={cn(
                              "text-sm font-medium",
                              critical
                                ? "text-red-700 dark:text-red-300"
                                : "text-amber-700 dark:text-amber-300"
                            )}
                          >
                            {critical ? "Critical" : "Warning"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-sm font-medium text-muted-foreground">
                    No low stock alerts
                  </div>
                )}
              </div>
            </SectionShell>
          </div>

          {/* Quick Actions */}
          <SectionShell
            title={
              <span className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-5 w-5" aria-hidden="true" />
                </span>
                Quick Actions
              </span>
            }
            description="Frequently used features and shortcuts"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleQuickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.key}
                    href={action.href}
                    className={cn(
                      "group flex min-h-[120px] flex-col justify-center rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      quickActionToneClasses[action.tone]
                    )}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm",
                          quickActionIconClasses[action.tone]
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="font-semibold text-card-foreground">{action.label}</div>
                    </div>
                    <p className="text-sm font-medium text-card-foreground/80">{action.description}</p>
                  </Link>
                );
              })}
            </div>
          </SectionShell>

          {/* Calendar Widget */}
          <CalendarWidget />

          {adminView && stores?.data && (
            <SectionShell
              title="Store Overview"
              description="Monitor all connected customer stores"
            >
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
            </SectionShell>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
