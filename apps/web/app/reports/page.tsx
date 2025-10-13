'use client';

import { PageHeader } from '@/components/PageHeader';
import ProtectedRoute from '@/components/ProtectedRoute';
import { BarChart3, TrendingUp, Users, Package, DollarSign, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/MetricCard';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { useDashboardStats, useSalesReport, useProductReport, useCustomerReport } from '@/hooks/useApi';
import { useState } from 'react';

export default function ReportsPage() {
  const [_selectedStore] = useState<string>('');
  
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useDashboardStats(_selectedStore);
  const { data: salesReport, isLoading: salesLoading, error: salesError } = useSalesReport({ storeId: _selectedStore });
  const { data: productReport, isLoading: productLoading, error: productError } = useProductReport({ storeId: _selectedStore });
  const { data: customerReport, isLoading: customerLoading, error: customerError } = useCustomerReport({ storeId: _selectedStore });

  const isLoading = statsLoading || salesLoading || productLoading || customerLoading;
  const hasError = statsError || salesError || productError || customerError;

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-6 space-y-6">
            <PageHeader
              title="Reports & Analytics"
              description="Monitor performance across your stores"
              icon={BarChart3}
            />
            <LoadingState />
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (hasError) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-6 space-y-6">
            <PageHeader
              title="Reports & Analytics"
              description="Monitor performance across your stores"
              icon={BarChart3}
            />
            <EmptyState
              title="Unable to load reports"
              description="There was an error loading the reports data. Please try again."
            />
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <PageHeader
            title="Reports & Analytics"
            description="Monitor performance across your stores"
            icon={BarChart3}
          />
          
          {/* Dashboard Stats */}
          {dashboardStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Revenue"
                value={`$${(dashboardStats as any).totalRevenue?.toLocaleString() || '0'}`}
                icon={DollarSign}
                trend={(dashboardStats as any).revenueGrowth}
                trendLabel="vs last period"
              />
              <MetricCard
                title="Total Orders"
                value={(dashboardStats as any).totalOrders?.toLocaleString() || '0'}
                icon={ShoppingCart}
                trend={(dashboardStats as any).orderGrowth}
                trendLabel="vs last period"
              />
              <MetricCard
                title="Total Customers"
                value={(dashboardStats as any).totalCustomers?.toLocaleString() || '0'}
                icon={Users}
                trend={(dashboardStats as any).customerGrowth}
                trendLabel="vs last period"
              />
              <MetricCard
                title="Total Products"
                value={(dashboardStats as any).totalProducts?.toLocaleString() || '0'}
                icon={Package}
                trend={(dashboardStats as any).productGrowth}
                trendLabel="vs last period"
              />
            </div>
          ) : null}

          {/* Sales Report */}
          {salesReport ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Sales Overview</h3>
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">${(salesReport as any).totalSales?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Average Order Value</p>
                  <p className="text-2xl font-bold">${(salesReport as any).averageOrderValue?.toFixed(2) || '0'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">{((salesReport as any).conversionRate * 100)?.toFixed(1) || '0'}%</p>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Product Report */}
          {productReport ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Top Products</h3>
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                {(productReport as any).topProducts?.slice(0, 5).map((product: any, index: number) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sales} sales</p>
                      </div>
                    </div>
                    <p className="font-semibold">${product.revenue?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {/* Customer Report */}
          {customerReport ? (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Customer Insights</h3>
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">New Customers</p>
                  <p className="text-2xl font-bold">{(customerReport as any).newCustomers || '0'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Returning Customers</p>
                  <p className="text-2xl font-bold">{(customerReport as any).returningCustomers || '0'}</p>
                </div>
              </div>
            </Card>
          ) : null}

          {/* Empty State */}
          {!dashboardStats && !salesReport && !productReport && !customerReport && (
            <EmptyState
              title="No data available"
              description="There are no reports available for the selected store."
            />
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
