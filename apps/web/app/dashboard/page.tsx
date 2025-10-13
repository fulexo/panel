"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useDashboardStats, useOrders, useStores } from "@/hooks/useApi";
import { DashboardStats } from "@/types/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";
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

  if (statsLoading || ordersLoading || storesLoading) {
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
            <div className="p-3 bg-accent rounded-full">
              <AlertTriangle className="h-8 w-8 text-foreground" />
            </div>
            <div className="text-center">
              <div className="text-foreground text-lg font-semibold mb-2">Dashboard Error</div>
              <div className="text-muted-foreground text-sm mb-4">
                {statsError instanceof ApiError ? statsError.message : 'Failed to load dashboard data'}
              </div>
              <div className="text-xs text-muted-foreground mb-6">
                {statsError instanceof ApiError && statsError.message.includes('token') ? 
                  'This usually happens when your session has expired or the API server is not responding.'
                  : 'Please try refreshing the page or contact support if the problem persists.'
                }
              </div>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
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
      tone: "default" as const,
    },
    {
      key: "products",
      label: "Products",
      value: stats?.totalProducts?.toLocaleString() ?? "0",
      context: adminView ? "Total products" : "In your store",
      icon: Package,
      tone: "default" as const,
    },
    {
      key: "customers",
      label: "Users",
      value: stats?.totalCustomers?.toLocaleString() ?? "0",
      context: adminView ? "Panel users" : "Store customers",
      icon: Users,
      tone: "default" as const,
    },
    {
      key: "revenue",
      label: "Revenue",
      value: formatCurrency(stats?.totalRevenue ?? 0),
      context: adminView ? "Total revenue" : "This month",
      icon: TrendingUp,
      tone: "default" as const,
    },
  ];

  const quickActions = [
    {
      key: "orders",
      label: "Orders",
      description: "Manage orders & shipping",
      href: "/orders",
      icon: ShoppingCart,
      adminOnly: false,
    },
    {
      key: "products",
      label: "Products",
      description: "Manage product catalog",
      href: "/products",
      icon: Package,
      adminOnly: false,
    },
    {
      key: "customers",
      label: "Users",
      description: "Manage panel users",
      href: "/customers",
      icon: Users,
      adminOnly: false,
    },
    {
      key: "inventory",
      label: "Inventory",
      description: "Stock management",
      href: "/inventory",
      icon: BarChart3,
      adminOnly: false,
    },
    {
      key: "stores",
      label: "Stores",
      description: "Manage customer stores",
      href: "/stores",
      icon: Building,
      adminOnly: true,
    },
    {
      key: "shipping",
      label: "Shipping",
      description: "Logistics & delivery",
      href: "/shipping",
      icon: Truck,
      adminOnly: true,
    },
    {
      key: "order-approvals",
      label: "Order Approvals",
      description: "Review pending orders",
      href: "/orders/approvals",
      icon: Clock,
      adminOnly: true,
    },
    {
      key: "inventory-approvals",
      label: "Inventory Approvals",
      description: "Review stock requests",
      href: "/inventory/approvals",
      icon: CheckCircle,
      adminOnly: true,
    },
    {
      key: "support",
      label: "Support",
      description: "Help & tickets",
      href: "/support",
      icon: ClipboardList,
      adminOnly: false,
    },
    {
      key: "reports",
      label: "Reports",
      description: "Analytics & insights",
      href: "/reports",
      icon: BarChart3,
      adminOnly: false,
    },
  ];

  return (
    <ProtectedRoute>
      <div className="bg-background">
        <main className="mobile-container py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="mobile-heading text-foreground flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-foreground" />
                Dashboard
              </h1>
              <p className="text-muted-foreground mobile-text">
                {adminView ? "Overview of all stores and activities" : "Your store overview and quick actions"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Button asChild variant="outline" className="flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16">
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
                  className="text-sm font-semibold text-foreground transition-colors hover:text-muted-foreground"
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
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
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
                        <span className="text-sm font-medium text-muted-foreground">
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
                  className="text-sm font-semibold text-foreground transition-colors hover:text-muted-foreground"
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
                        className="flex items-center justify-between rounded-lg border border-border bg-accent/10 p-4 transition-colors hover:bg-accent/20"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
                            <Package className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div>
                            <div className="font-semibold text-foreground">{product.name}</div>
                            <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">{product.stock} left</div>
                          <span className="text-sm font-medium text-muted-foreground">
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
            title="Quick Actions"
            description="Common tasks and navigation"
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {quickActions
                .filter(action => adminView || !action.adminOnly)
                .map((action) => (
                  <Link
                    key={action.key}
                    href={action.href}
                    className="group flex min-h-[120px] flex-col justify-center rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-foreground text-background">
                        <action.icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-muted-foreground">
                          {action.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </SectionShell>

          {/* Stores Overview and Calendar (Admin Only) */}
          {adminView && stores?.data && stores.data.length > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <SectionShell
                title="Stores Overview"
                description="Connected stores status"
                actions={
                  <Link
                    href="/stores"
                    className="text-sm font-semibold text-foreground transition-colors hover:text-muted-foreground"
                  >
                    Manage stores
                  </Link>
                }
              >
                <div className="space-y-3">
                  {stores.data.slice(0, 5).map((store: { id: string; name: string; status: string; url: string }) => (
                    <div
                      key={store.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-accent/10 p-4 transition-colors hover:bg-accent/20"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
                          <Building className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">{store.name}</div>
                          <div className="text-sm text-muted-foreground">{store.url}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-accent text-foreground">
                          {store.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionShell>

              <SectionShell
                title="Calendar"
                description="Upcoming events and deadlines"
              >
                <CalendarWidget />
              </SectionShell>
            </div>
          )}

          {/* Calendar Widget (Customer Only) */}
          {!adminView && (
            <SectionShell
              title="Calendar"
              description="Upcoming events and deadlines"
            >
              <CalendarWidget />
            </SectionShell>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}