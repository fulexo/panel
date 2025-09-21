"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { 
  useDashboardStats, 
  useSalesReport, 
  useProductReport, 
  useCustomerReport, 
  useInventoryReport, 
  useFinancialReport 
} from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ReportsPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30d");

  const tabs = [
    { id: "overview", label: "Genel Bakış", icon: "📊" },
    { id: "sales", label: "Satış Raporları", icon: "💰" },
    { id: "products", label: "Ürün Raporları", icon: "📦" },
    { id: "customers", label: "Müşteri Raporları", icon: "👥" },
    { id: "inventory", label: "Stok Raporları", icon: "📋" },
    { id: "financial", label: "Mali Raporlar", icon: "💳" },
  ];

  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch real data from API
  const { data: dashboardStats, isLoading: isLoadingDashboard } = useDashboardStats(userStoreId);
  const { data: salesData, isLoading: isLoadingSales } = useSalesReport({ 
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as string,
    endDate: new Date().toISOString().split('T')[0] as string,
    storeId: userStoreId 
  });
  const { data: productData, isLoading: isLoadingProducts } = useProductReport({ 
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as string,
    endDate: new Date().toISOString().split('T')[0] as string,
    storeId: userStoreId 
  });
  const { data: customerData, isLoading: isLoadingCustomers } = useCustomerReport({ 
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as string,
    endDate: new Date().toISOString().split('T')[0] as string,
    storeId: userStoreId 
  });
  const { data: inventoryData, isLoading: isLoadingInventory } = useInventoryReport({ 
    storeId: userStoreId,
    lowStock: true 
  });
  const { data: financialData, isLoading: isLoadingFinancial } = useFinancialReport({ 
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as string,
    endDate: new Date().toISOString().split('T')[0] as string,
    storeId: userStoreId 
  });

  // Use real data or fallback to empty data
  const data = {
    overview: dashboardStats || {
      totalRevenue: 0,
      totalOrders: 0,
      totalProducts: 0,
      totalCustomers: 0,
      revenueGrowth: 0,
      orderGrowth: 0,
      productGrowth: 0,
      customerGrowth: 0,
    },
    sales: salesData || {
      dailySales: [],
      topProducts: [],
      salesByCategory: [],
    },
    products: productData || {
      topSelling: [],
      lowStock: [],
      categoryPerformance: [],
    },
    customers: customerData || {
      newCustomers: 0,
      returningCustomers: 0,
      customerLifetimeValue: 0,
      topCustomers: [],
      customerSegments: [],
    },
    inventory: inventoryData || {
      totalValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      inventoryTurnover: 0,
      topMovingItems: [],
      stockAlerts: [],
    },
    financial: financialData || {
      totalRevenue: 0,
      totalCosts: 0,
      grossProfit: 0,
      netProfit: 0,
      profitMargin: 0,
      expenses: [],
    },
  };

  const isLoading = isLoadingDashboard || isLoadingSales || isLoadingProducts || 
                   isLoadingCustomers || isLoadingInventory || isLoadingFinancial;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('tr-TR').format(num);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading reports...</div>
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
              <h1 className="mobile-heading text-foreground">Reports & Analytics</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Comprehensive reports across all stores' : 'Your store performance reports'}
              </p>
            </div>
            <div className="flex gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="form-select"
              >
                <option value="7d">Son 7 Gün</option>
                <option value="30d">Son 30 Gün</option>
                <option value="90d">Son 90 Gün</option>
                <option value="1y">Son 1 Yıl</option>
              </select>
              <button className="btn btn-outline">Export</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Reports Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-card p-4 rounded-lg border border-border">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-foreground"
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Reports Content */}
            <div className="lg:col-span-3">
              <div className="bg-card p-6 rounded-lg border border-border">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Genel Bakış</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Gelir</h3>
                        <div className="text-3xl font-bold text-primary">
                          {formatCurrency(data.overview.totalRevenue)}
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          +{data.overview.revenueGrowth}% bu ay
                        </p>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Sipariş</h3>
                        <div className="text-3xl font-bold text-blue-600">
                          {formatNumber(data.overview.totalOrders)}
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          +{data.overview.orderGrowth}% bu ay
                        </p>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Ürün</h3>
                        <div className="text-3xl font-bold text-green-600">
                          {formatNumber(data.overview.totalProducts)}
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          +{data.overview.productGrowth}% bu ay
                        </p>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Müşteri</h3>
                        <div className="text-3xl font-bold text-purple-600">
                          {formatNumber(data.overview.totalCustomers)}
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          +{data.overview.customerGrowth}% bu ay
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Günlük Satışlar</h3>
                        <div className="space-y-3">
                          {data.sales.dailySales.map((day, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                {new Date(day.date).toLocaleDateString('tr-TR')}
                              </span>
                              <span className="font-medium">{formatCurrency(day.sales)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Kategori Dağılımı</h3>
                        <div className="space-y-3">
                          {data.sales.salesByCategory.map((category, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">{category.category}</span>
                                <span className="text-sm font-medium">{formatCurrency(category.sales)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${category.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sales Tab */}
                {activeTab === "sales" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Satış Raporları</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">En Çok Satan Ürünler</h3>
                        <div className="space-y-4">
                          {data.sales.topProducts.map((product, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">{product.sales} adet</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(product.revenue)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Satış Trendi</h3>
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          📈 Grafik burada olacak
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Products Tab */}
                {activeTab === "products" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Ürün Raporları</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Düşük Stok Uyarıları</h3>
                        <div className="space-y-3">
                          {data.products.lowStock.map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Mevcut: {item.current} | Min: {item.min}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                item.status === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.status === 'critical' ? 'Kritik' : 'Düşük'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Kategori Performansı</h3>
                        <div className="space-y-4">
                          {data.products.categoryPerformance.map((category, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{category.category}</span>
                                <span className="text-sm text-green-600">+{category.growth}%</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {category.products} ürün • {formatCurrency(category.revenue)} gelir
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Customers Tab */}
                {activeTab === "customers" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Müşteri Raporları</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">En Değerli Müşteriler</h3>
                        <div className="space-y-4">
                          {data.customers.topCustomers.map((customer, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-muted-foreground">{customer.email}</p>
                                <p className="text-sm text-muted-foreground">{customer.orders} sipariş</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(customer.total)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Müşteri Segmentleri</h3>
                        <div className="space-y-4">
                          {data.customers.customerSegments.map((segment, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{segment.segment}</span>
                                <span className="text-sm text-muted-foreground">{segment.count} müşteri</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatCurrency(segment.revenue)} gelir
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Inventory Tab */}
                {activeTab === "inventory" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Stok Raporları</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Stok Değeri</h3>
                        <div className="text-3xl font-bold text-primary">
                          {formatCurrency(data.inventory.totalValue)}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Düşük Stok</h3>
                        <div className="text-3xl font-bold text-yellow-600">
                          {data.inventory.lowStockItems}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Stok Devir Hızı</h3>
                        <div className="text-3xl font-bold text-blue-600">
                          {data.inventory.inventoryTurnover}x
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">En Hızlı Hareket Eden Ürünler</h3>
                        <div className="space-y-4">
                          {data.inventory.topMovingItems.map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground">{item.turnover}x devir</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(item.value)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Stok Uyarıları</h3>
                        <div className="space-y-3">
                          {data.inventory.stockAlerts.map((alert, index) => (
                            <div key={index} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                              <div>
                                <p className="font-medium">{alert.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {alert.current} adet kaldı • {alert.daysLeft} gün
                                </p>
                              </div>
                              <span className="text-yellow-600 text-sm">⚠️</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Tab */}
                {activeTab === "financial" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Mali Raporlar</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Gelir</h3>
                        <div className="text-3xl font-bold text-green-600">
                          {formatCurrency(data.financial.totalRevenue)}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Maliyet</h3>
                        <div className="text-3xl font-bold text-red-600">
                          {formatCurrency(data.financial.totalCosts)}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Brüt Kar</h3>
                        <div className="text-3xl font-bold text-blue-600">
                          {formatCurrency(data.financial.grossProfit)}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Net Kar</h3>
                        <div className="text-3xl font-bold text-purple-600">
                          {formatCurrency(data.financial.netProfit)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Gider Dağılımı</h3>
                        <div className="space-y-4">
                          {data.financial.expenses.map((expense, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{expense.category}</span>
                                <span className="text-sm text-muted-foreground">{expense.percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${expense.percentage}%` }}
                                ></div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatCurrency(expense.amount)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Kar Marjı</h3>
                        <div className="text-center">
                          <div className="text-6xl font-bold text-primary mb-2">
                            {data.financial.profitMargin}%
                          </div>
                          <p className="text-muted-foreground">Net Kar Marjı</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}