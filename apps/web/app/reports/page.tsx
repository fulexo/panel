
"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  DollarSign,
  Download,
  LineChart,
  Package,
  TrendingUp,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import {
  useDashboardStats,
  useSalesReport,
  useProductReport,
  useCustomerReport,
  useInventoryReport,
  useFinancialReport,
} from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OverviewData {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueGrowth: number;
  orderGrowth: number;
  productGrowth: number;
  customerGrowth: number;
}

interface DailySale {
  date: string;
  sales: number;
}

interface SalesByCategory {
  category: string;
  sales: number;
  percentage: number;
}

interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

interface SalesReport {
  dailySales: DailySale[];
  topProducts: TopProduct[];
  salesByCategory: SalesByCategory[];
}

interface LowStockItem {
  name: string;
  current: number;
  min: number;
  status: "critical" | "low" | string;
}

interface CategoryPerformance {
  category: string;
  growth: number;
  products: number;
  revenue: number;
}

interface ProductReport {
  topSelling: TopProduct[];
  lowStock: LowStockItem[];
  categoryPerformance: CategoryPerformance[];
}

interface Customer {
  name: string;
  email: string;
  orders: number;
  total: number;
}

interface CustomerSegment {
  segment: string;
  count: number;
  revenue: number;
}

interface CustomerReport {
  newCustomers: number;
  returningCustomers: number;
  customerLifetimeValue: number;
  topCustomers: Customer[];
  customerSegments: CustomerSegment[];
}

interface InventoryItem {
  name: string;
  turnover: number;
  value: number;
}

interface StockAlert {
  name: string;
  current: number;
  daysLeft: number;
}

interface InventoryReport {
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  inventoryTurnover: number;
  topMovingItems: InventoryItem[];
  stockAlerts: StockAlert[];
}

interface Expense {
  category: string;
  amount: number;
  percentage: number;
}

interface FinancialReport {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  expenses: Expense[];
}

const defaultOverview: OverviewData = {
  totalRevenue: 0,
  totalOrders: 0,
  totalProducts: 0,
  totalCustomers: 0,
  revenueGrowth: 0,
  orderGrowth: 0,
  productGrowth: 0,
  customerGrowth: 0,
};

const defaultSales: SalesReport = {
  dailySales: [],
  topProducts: [],
  salesByCategory: [],
};

const defaultProducts: ProductReport = {
  topSelling: [],
  lowStock: [],
  categoryPerformance: [],
};

const defaultCustomers: CustomerReport = {
  newCustomers: 0,
  returningCustomers: 0,
  customerLifetimeValue: 0,
  topCustomers: [],
  customerSegments: [],
};

const defaultInventory: InventoryReport = {
  totalValue: 0,
  lowStockItems: 0,
  outOfStockItems: 0,
  inventoryTurnover: 0,
  topMovingItems: [],
  stockAlerts: [],
};

const defaultFinancial: FinancialReport = {
  totalRevenue: 0,
  totalCosts: 0,
  grossProfit: 0,
  netProfit: 0,
  profitMargin: 0,
  expenses: [],
};

const dateRangeOptions = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
] as const;

const reportTabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "sales", label: "Sales", icon: DollarSign },
  { id: "products", label: "Products", icon: Package },
  { id: "customers", label: "Customers", icon: Users },
  { id: "inventory", label: "Inventory", icon: ClipboardList },
  { id: "financial", label: "Financial", icon: CreditCard },
] as const;

function formatRange(range: string) {
  const end = new Date();
  const start = new Date();

  switch (range) {
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      break;
    case "1y":
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setDate(end.getDate() - 30);
      break;
  }

  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

function growthBadge(value: number) {
  const variant = value >= 0 ? "success" : "destructive";
  const prefix = value >= 0 ? "+" : "";
  return <Badge variant={variant}>{`${prefix}${value}%`}</Badge>;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [activeTab, setActiveTab] = useState<(typeof reportTabs)[number]["id"]>("overview");
  const [dateRange, setDateRange] = useState<(typeof dateRangeOptions)[number]["value"]>("30d");

  const userStoreId = user?.stores?.[0]?.id;
  const { startDate, endDate } = useMemo(() => formatRange(dateRange), [dateRange]);

  const { data: dashboardStats, isLoading: isLoadingDashboard } = useDashboardStats(userStoreId);
  const { data: salesData, isLoading: isLoadingSales } = useSalesReport({
    startDate,
    endDate,
    ...(userStoreId ? { storeId: userStoreId } : {}),
  });
  const { data: productData, isLoading: isLoadingProducts } = useProductReport({
    startDate,
    endDate,
    ...(userStoreId ? { storeId: userStoreId } : {}),
  });
  const { data: customerData, isLoading: isLoadingCustomers } = useCustomerReport({
    startDate,
    endDate,
    ...(userStoreId ? { storeId: userStoreId } : {}),
  });
  const { data: inventoryData, isLoading: isLoadingInventory } = useInventoryReport({
    ...(userStoreId ? { storeId: userStoreId } : {}),
    lowStock: true,
  });
  const { data: financialData, isLoading: isLoadingFinancial } = useFinancialReport({
    startDate,
    endDate,
    ...(userStoreId ? { storeId: userStoreId } : {}),
  });

  const overview = (dashboardStats as OverviewData | undefined) ?? defaultOverview;
  const sales = (salesData as SalesReport | undefined) ?? defaultSales;
  const products = (productData as ProductReport | undefined) ?? defaultProducts;
  const customers = (customerData as CustomerReport | undefined) ?? defaultCustomers;
  const inventory = (inventoryData as InventoryReport | undefined) ?? defaultInventory;
  const financial = (financialData as FinancialReport | undefined) ?? defaultFinancial;

  const isLoading =
    isLoadingDashboard ||
    isLoadingSales ||
    isLoadingProducts ||
    isLoadingCustomers ||
    isLoadingInventory ||
    isLoadingFinancial;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(amount ?? 0);

  const formatNumber = (value: number) => new Intl.NumberFormat("tr-TR").format(value ?? 0);

  const overviewCards = [
    {
      label: "Total revenue",
      value: formatCurrency(overview.totalRevenue),
      growth: overview.revenueGrowth,
    },
    {
      label: "Total orders",
      value: formatNumber(overview.totalOrders),
      growth: overview.orderGrowth,
    },
    {
      label: "Products",
      value: formatNumber(overview.totalProducts),
      growth: overview.productGrowth,
    },
    {
      label: "Customers",
      value: formatNumber(overview.totalCustomers),
      growth: overview.customerGrowth,
    },
  ];

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container flex items-center justify-center py-24">
            <LoadingState message="Loading analytics..." />
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container space-y-8 py-8">
          <PageHeader
            title="Reports & Analytics"
            description={
              isAdmin()
                ? "Monitor performance across every store from a single, theme-aware dashboard."
                : "Review your store health, growth, and financials with up-to-date reports."
            }
            icon={BarChart3}
            actions={
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Select value={dateRange} onValueChange={(value) => setDateRange(value as typeof dateRangeOptions[number]["value"]) }>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export data
                </Button>
              </div>
            }
          >
            Select a report to explore detailed KPIs, customer behaviour, inventory health, and financial performance for the
            selected period.
          </PageHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as typeof reportTabs[number]["id"])}
            className="grid gap-6 lg:grid-cols-[260px,1fr]"
          >
            <div>
              <Card className="lg:sticky lg:top-28">
                <CardContent className="p-4">
                  <TabsList className="flex h-auto flex-col gap-2 bg-transparent p-0">
                    {reportTabs.map((tab) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="justify-start gap-3 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {overviewCards.map((card) => (
                    <Card key={card.label}>
                      <CardHeader className="space-y-2">
                        <CardDescription>{card.label}</CardDescription>
                        <CardTitle className="text-3xl font-semibold text-foreground">{card.value}</CardTitle>
                      </CardHeader>
                      <CardContent>{growthBadge(card.growth)}</CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily sales</CardTitle>
                      <CardDescription>Revenue generated each day within the selected period.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {sales.dailySales.length === 0 ? (
                        <EmptyState
                          icon={LineChart}
                          title="No sales captured"
                          description="Sales data will appear here once orders are processed within the selected range."
                        />
                      ) : (
                        sales.dailySales.map((day) => (
                          <div key={day.date} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                            <span className="text-sm text-muted-foreground">
                              {new Date(day.date).toLocaleDateString("tr-TR")}
                            </span>
                            <span className="text-sm font-medium text-foreground">{formatCurrency(day.sales)}</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Sales by category</CardTitle>
                      <CardDescription>Share of revenue per product category.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {sales.salesByCategory.length === 0 ? (
                        <EmptyState
                          icon={TrendingUp}
                          title="No category data"
                          description="Add product categories to track their contribution to total revenue."
                        />
                      ) : (
                        sales.salesByCategory.map((category) => (
                          <div key={category.category} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground">{category.category}</span>
                              <span className="text-muted-foreground">{formatCurrency(category.sales)}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(category.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="sales" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top products</CardTitle>
                      <CardDescription>Products ranked by total revenue.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {sales.topProducts.length === 0 ? (
                        <EmptyState
                          icon={Package}
                          title="No product sales yet"
                          description="When orders are processed, your top performing products will appear here."
                        />
                      ) : (
                        sales.topProducts.map((product) => (
                          <div key={product.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{formatNumber(product.sales)} units</p>
                            </div>
                            <span className="text-sm font-semibold text-foreground">{formatCurrency(product.revenue)}</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                  <Card className="flex items-center justify-center">
                    <CardContent className="w-full">
                      <EmptyState
                        icon={LineChart}
                        title="Sales trend visualisation"
                        description="Connect the analytics service to render daily and weekly sales charts."
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="products" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Low stock alerts</CardTitle>
                      <CardDescription>Products that need restocking soon.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {products.lowStock.length === 0 ? (
                        <EmptyState
                          icon={ClipboardList}
                          title="No low stock items"
                          description="Inventory levels are healthy across all products."
                        />
                      ) : (
                        products.lowStock.map((item) => (
                          <div key={item.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">
                                On hand {item.current} • Minimum {item.min}
                              </p>
                            </div>
                            <Badge variant={item.status === "critical" ? "destructive" : "warning"}>
                              {item.status === "critical" ? "Critical" : "Low"}
                            </Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Category performance</CardTitle>
                      <CardDescription>Growth and revenue by category.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {products.categoryPerformance.length === 0 ? (
                        <EmptyState
                          icon={TrendingUp}
                          title="No category performance yet"
                          description="Categories will populate once sales data is available."
                        />
                      ) : (
                        products.categoryPerformance.map((category) => (
                          <div key={category.category} className="rounded-lg border border-border/60 bg-card/60 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">{category.category}</span>
                              {growthBadge(category.growth)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatNumber(category.products)} products • {formatCurrency(category.revenue)} revenue
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="customers" className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardDescription>New customers</CardDescription>
                      <CardTitle className="text-2xl">{formatNumber(customers.newCustomers)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Returning customers</CardDescription>
                      <CardTitle className="text-2xl">{formatNumber(customers.returningCustomers)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Customer lifetime value</CardDescription>
                      <CardTitle className="text-2xl">{formatCurrency(customers.customerLifetimeValue)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top customers</CardTitle>
                      <CardDescription>Loyal customers ranked by spend.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {customers.topCustomers.length === 0 ? (
                        <EmptyState
                          icon={Users}
                          title="No customer data"
                          description="Customer transactions will appear here after orders are processed."
                        />
                      ) : (
                        customers.topCustomers.map((customer) => (
                          <div key={customer.email} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.email}</p>
                              <p className="text-xs text-muted-foreground">{customer.orders} orders</p>
                            </div>
                            <span className="text-sm font-semibold text-foreground">{formatCurrency(customer.total)}</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Customer segments</CardTitle>
                      <CardDescription>Revenue distribution across segments.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {customers.customerSegments.length === 0 ? (
                        <EmptyState
                          icon={BarChart3}
                          title="No segments defined"
                          description="Create customer segments to compare their performance."
                        />
                      ) : (
                        customers.customerSegments.map((segment) => (
                          <div key={segment.segment} className="rounded-lg border border-border/60 bg-muted/40 p-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground">{segment.segment}</span>
                              <span className="text-muted-foreground">{formatNumber(segment.count)} customers</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatCurrency(segment.revenue)} revenue</p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="inventory" className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader>
                      <CardDescription>Total inventory value</CardDescription>
                      <CardTitle className="text-2xl">{formatCurrency(inventory.totalValue)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Low stock items</CardDescription>
                      <CardTitle className="text-2xl">{formatNumber(inventory.lowStockItems)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Out of stock</CardDescription>
                      <CardTitle className="text-2xl">{formatNumber(inventory.outOfStockItems)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Inventory turnover</CardDescription>
                      <CardTitle className="text-2xl">{inventory.inventoryTurnover.toFixed(1)}x</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top moving items</CardTitle>
                      <CardDescription>Products with the highest turnover.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {inventory.topMovingItems.length === 0 ? (
                        <EmptyState
                          icon={Package}
                          title="No movement data"
                          description="Start fulfilling orders to track inventory velocity."
                        />
                      ) : (
                        inventory.topMovingItems.map((item) => (
                          <div key={item.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.turnover.toFixed(1)}x turnover</p>
                            </div>
                            <span className="text-sm font-semibold text-foreground">{formatCurrency(item.value)}</span>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Stock alerts</CardTitle>
                      <CardDescription>Items that need attention soon.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {inventory.stockAlerts.length === 0 ? (
                        <EmptyState
                          icon={ClipboardList}
                          title="No alerts"
                          description="Stock levels are healthy across all tracked products."
                        />
                      ) : (
                        inventory.stockAlerts.map((alert) => (
                          <div
                            key={alert.name}
                            className="flex items-center justify-between rounded-lg border border-border/60 bg-[hsl(var(--warning))]/15 px-3 py-2 dark:bg-[hsl(var(--warning))]/20"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{alert.name}</p>
                              <p className="text-xs text-muted-foreground">{alert.current} remaining • {alert.daysLeft} days</p>
                            </div>
                            <Badge variant="warning">Attention</Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader>
                      <CardDescription>Total revenue</CardDescription>
                      <CardTitle className="text-2xl">{formatCurrency(financial.totalRevenue)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Total costs</CardDescription>
                      <CardTitle className="text-2xl">{formatCurrency(financial.totalCosts)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Gross profit</CardDescription>
                      <CardTitle className="text-2xl">{formatCurrency(financial.grossProfit)}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Net profit</CardDescription>
                      <CardTitle className="text-2xl">{formatCurrency(financial.netProfit)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Expense distribution</CardTitle>
                      <CardDescription>Breakdown of operational spending.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {financial.expenses.length === 0 ? (
                        <EmptyState
                          icon={CreditCard}
                          title="No expenses captured"
                          description="Import expense data to track margins accurately."
                        />
                      ) : (
                        financial.expenses.map((expense) => (
                          <div key={expense.category} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground">{expense.category}</span>
                              <span className="text-muted-foreground">{expense.percentage}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${Math.min(expense.percentage, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">{formatCurrency(expense.amount)}</p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="flex flex-col items-center justify-center">
                    <CardHeader className="items-center text-center">
                      <CardTitle>Profit margin</CardTitle>
                      <CardDescription>Percentage of revenue retained as profit.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-6xl font-semibold text-primary">{financial.profitMargin.toFixed(1)}%</div>
                      <p className="mt-2 text-sm text-muted-foreground">Target healthy margins by monitoring expenses regularly.</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  );
}
