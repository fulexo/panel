"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useStores } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { SectionShell } from "@/components/patterns/SectionShell";
import { MetricCard } from "@/components/patterns/MetricCard";
import { StatusPill } from "@/components/patterns/StatusPill";
import type { StatusTone } from "@/components/patterns/StatusPill";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
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
  RefreshCw,
  Ban
} from "lucide-react";
// import { ApiError } from "@/lib/api-client";

export default function OrdersPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const adminView = isAdmin();
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
    isLoading,
    refetch: refetchOrders,
  } = useOrders({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    // For admin users, allow store filtering. For customers, use their store
    ...(adminView && storeFilter ? { storeId: storeFilter } : {}),
    ...(!adminView && userStoreId ? { storeId: userStoreId } : {}),
  }) as {
    data:
      | {
          data: Array<{
            id: string;
            orderNumber: string;
            status: string;
            total: number;
            createdAt: string;
            customerEmail: string;
          }>;
          pagination: { total: number; pages: number };
        }
      | undefined;
    isLoading: boolean;
    refetch: () => Promise<unknown>;
    error: unknown;
  };

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

  const orders = ordersData?.data || [];
  const totalOrders = ordersData?.pagination?.total || 0;
  const totalPages = ordersData?.pagination?.pages || 1;

  // Calculate statistics
  const statusCounts = useMemo(() => {
    return orders.reduce((acc: Record<string, number>, order: { status: string }) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [orders]);

  const statusMeta = useMemo((): Record<string, { label: string; tone: StatusTone; icon: typeof ShoppingCart }> => ({
    pending: { label: "Pending", tone: "warning" as const, icon: Clock },
    processing: { label: "Processing", tone: "info" as const, icon: RefreshCw },
    completed: { label: "Completed", tone: "success" as const, icon: CheckCircle },
    cancelled: { label: "Cancelled", tone: "destructive" as const, icon: Ban },
  }), []);

  const orderSummaryCards = useMemo(() => {
    const statusCards = (["pending", "processing", "completed", "cancelled"] as const)
      .map((statusKey) => {
        const meta = statusMeta[statusKey];
        if (!meta) return null;
        return {
          key: statusKey,
          label: meta.label,
          value: (statusCounts[statusKey] ?? 0).toLocaleString(),
          context: `${meta.label} orders in view`,
          icon: meta.icon,
          tone:
            statusKey === "completed"
              ? ("emerald" as const)
              : statusKey === "cancelled"
              ? ("destructive" as const)
              : statusKey === "processing"
              ? ("blue" as const)
              : ("warning" as const),
        };
      })
      .filter((card): card is NonNullable<typeof card> => card !== null);

    return [
      {
        key: "total",
        label: "Total Orders",
        value: totalOrders.toLocaleString(),
        context: adminView ? "Across all stores" : "Your store",
        icon: ShoppingCart,
        tone: "blue" as const,
      },
      ...statusCards,
    ];
  }, [totalOrders, adminView, statusCounts, statusMeta]);

  const visibleOrderSummaryCards = useMemo(() => orderSummaryCards.slice(0, 5), [orderSummaryCards]);

  const quickActions = useMemo(() => [
    {
      key: "create",
      label: "Create Order",
      href: "/orders/create",
      icon: Plus,
      variant: "default" as const,
      permission: "orders.manage",
    },
    {
      key: "approvals",
      label: "Approvals",
      href: "/orders/approvals",
      icon: Clock,
      variant: "warning" as const,
      permission: "orders.approve",
    },
    {
      key: "shipping",
      label: "Shipping",
      href: "/shipping",
      icon: Truck,
      variant: "outline" as const,
      permission: "shipping.manage",
    },
    {
      key: "inventory",
      label: "Inventory",
      href: "/inventory",
      icon: Package,
      variant: "outline" as const,
      permission: "inventory.manage",
    },
    {
      key: "inventory-approvals",
      label: "Inv. Approvals",
      href: "/inventory/approvals",
      icon: CheckCircle,
      variant: "warning" as const,
      permission: "inventory.approve",
    },
  ], []);

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
                {adminView ? 'Manage all orders across all stores' : 'View your store orders'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                const content = (
                  <Link
                    key={action.key}
                    href={action.href}
                    className={cn(
                      buttonVariants({ variant: action.variant, size: "lg" }),
                      "h-16 w-full flex flex-col items-center justify-center gap-1 text-xs font-medium leading-tight shadow-sm hover:shadow-md"
                    )}
                  >
                    <ActionIcon className="h-5 w-5" aria-hidden="true" />
                    <span>{action.label}</span>
                  </Link>
                );

                if (action.permission) {
                  return (
                    <ProtectedComponent permission={action.permission as any} key={action.key}>
                      {content}
                    </ProtectedComponent>
                  );
                }

                return content;
              })}
            </div>
          </div>

          {/* Enhanced Filters */}
          <SectionShell
            title="Filters"
            description="Refine the order list by status, store or keywords"
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormField
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search orders by number, customer, or email"
                  className="h-11 pl-10"
                />
              </div>
              <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-11 w-full appearance-none rounded-md border border-border bg-background pl-10 pr-8 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="Filter by order status"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {adminView && (
                <div className="relative w-full sm:w-52">
                  <ShoppingCart className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={storeFilter}
                    onChange={(e) => {
                      setStoreFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 w-full appearance-none rounded-md border border-border bg-background pl-10 pr-8 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label="Filter by store"
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
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetchOrders()}
                className="gap-2 h-10 w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2 h-10 w-full sm:w-auto"
                onClick={() => window.print()}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Export
              </Button>
            </div>
          </SectionShell>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SectionShell
              title="Recent Orders"
              description="Latest transactions in the current view"
            >
              <div className="space-y-3">
                {orders.slice(0, 5).map((order: { id: string; orderNumber: string; status: string; total: number; createdAt: string; customerEmail: string; billingInfo?: { first_name: string; last_name: string } }) => {
                  const meta = statusMeta[order.status] ?? {
                    label: order.status,
                    tone: "muted" as StatusTone,
                  };
                  const customerName = [order.billingInfo?.first_name, order.billingInfo?.last_name]
                    .filter(Boolean)
                    .join(" ") || order.customerEmail;

                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-lg border border-border/70 bg-accent/10 p-4 transition-colors hover:bg-accent/20"
                    >
                      <div>
                        <div className="font-semibold text-foreground">Order #{order.orderNumber}</div>
                        <div className="text-sm text-muted-foreground">{customerName}</div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm font-semibold text-foreground">
                          {formatCurrency(order.total)}
                        </div>
                        <StatusPill label={meta.label} tone={meta.tone} className="justify-end" />
                      </div>
                    </div>
                  );
                })}
                {orders.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No orders found
                  </div>
                )}
              </div>
            </SectionShell>

            <SectionShell
              title="Order Snapshot"
              description="Totals for the current dataset"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {visibleOrderSummaryCards.map((card) => (
                  <MetricCard
                    key={card.key}
                    label={card.label}
                    value={card.value}
                    context={card.context}
                    tone={card.tone}
                    subtle
                  />
                ))}
              </div>
            </SectionShell>
          </div>

          <SectionShell
            title="All Orders"
            description="Paginated list respecting the filters above"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="p-3 text-left">Order #</th>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Total</th>
                    <th className="p-3 text-left">Date</th>
                    {adminView && (
                      <ProtectedComponent permission="orders.manage">
                        <th className="p-3 text-left">Actions</th>
                      </ProtectedComponent>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: { id: string; orderNumber: string; status: string; total: number; createdAt: string; customerEmail: string; billingInfo?: { first_name: string; last_name: string } }) => {
                    const meta = statusMeta[order.status] ?? {
                      label: order.status,
                      tone: "muted" as StatusTone,
                    };
                    const customerName = [order.billingInfo?.first_name, order.billingInfo?.last_name]
                      .filter(Boolean)
                      .join(" ") || order.customerEmail;

                    return (
                      <tr key={order.id} className="border-b border-border/60 last:border-b-0">
                        <td className="p-3 text-sm font-medium text-foreground">#{order.orderNumber}</td>
                        <td className="p-3 text-sm text-foreground/80">{customerName}</td>
                        <td className="p-3 text-sm">
                          <StatusPill label={meta.label} tone={meta.tone} />
                        </td>
                        <td className="p-3 text-sm font-semibold text-foreground">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        {adminView && (
                          <ProtectedComponent permission="orders.manage">
                            <td className="p-3">
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Link
                                  href={`/orders/${order.id}`}
                                  className={cn(
                                    buttonVariants({ variant: "outline", size: "sm" }),
                                    "gap-1 h-8"
                                  )}
                                >
                                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                  View
                                </Link>
                                <select
                                  value={order.status}
                                  onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                  className="h-8 min-w-[120px] rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                  aria-label="Update order status"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="processing">Processing</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>
                            </td>
                          </ProtectedComponent>
                        )}
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={adminView ? 6 : 5} className="p-8 text-center text-sm text-muted-foreground">
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalOrders)} of {totalOrders} orders
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="gap-2 min-w-[80px]"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Prev
                  </Button>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                      return (
                        <Button
                          type="button"
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "min-w-[40px] px-3",
                            page === pageNum ? "shadow-sm" : "text-muted-foreground"
                          )}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="gap-2 min-w-[80px]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </SectionShell>
        </main>
      </div>
    </ProtectedRoute>
  );
}
