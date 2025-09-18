"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function ReportsPage() {
  const { } = useAuth();
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

  // Mock data - gerçek uygulamada API'den gelecek
  const mockData = {
    overview: {
      totalRevenue: 125000,
      totalOrders: 1250,
      totalProducts: 450,
      totalCustomers: 320,
      revenueGrowth: 12.5,
      orderGrowth: 8.3,
      productGrowth: 15.2,
      customerGrowth: 6.7,
    },
    sales: {
      dailySales: [
        { date: "2024-01-01", sales: 4500 },
        { date: "2024-01-02", sales: 5200 },
        { date: "2024-01-03", sales: 3800 },
        { date: "2024-01-04", sales: 6100 },
        { date: "2024-01-05", sales: 4900 },
        { date: "2024-01-06", sales: 7200 },
        { date: "2024-01-07", sales: 6800 },
      ],
      topProducts: [
        { name: "iPhone 15 Pro", sales: 45, revenue: 45000 },
        { name: "Samsung Galaxy S24", sales: 32, revenue: 32000 },
        { name: "MacBook Air M2", sales: 18, revenue: 18000 },
        { name: "iPad Pro", sales: 25, revenue: 15000 },
        { name: "AirPods Pro", sales: 67, revenue: 13400 },
      ],
      salesByCategory: [
        { category: "Electronics", sales: 85000, percentage: 68 },
        { category: "Clothing", sales: 25000, percentage: 20 },
        { category: "Books", sales: 15000, percentage: 12 },
      ],
    },
    products: {
      topSelling: [
        { name: "iPhone 15 Pro", quantity: 45, revenue: 45000 },
        { name: "Samsung Galaxy S24", quantity: 32, revenue: 32000 },
        { name: "MacBook Air M2", quantity: 18, revenue: 18000 },
      ],
      lowStock: [
        { name: "iPhone 15 Pro", current: 5, min: 10, status: "critical" },
        { name: "Samsung Galaxy S24", current: 8, min: 15, status: "low" },
        { name: "MacBook Air M2", current: 12, min: 20, status: "low" },
      ],
      categoryPerformance: [
        { category: "Electronics", products: 150, revenue: 85000, growth: 15.2 },
        { category: "Clothing", products: 200, revenue: 25000, growth: 8.5 },
        { category: "Books", products: 100, revenue: 15000, growth: 12.3 },
      ],
    },
    customers: {
      newCustomers: 45,
      returningCustomers: 275,
      customerLifetimeValue: 1250,
      topCustomers: [
        { name: "Ahmet Yılmaz", email: "ahmet@example.com", orders: 12, total: 15000 },
        { name: "Ayşe Demir", email: "ayse@example.com", orders: 8, total: 12000 },
        { name: "Mehmet Kaya", email: "mehmet@example.com", orders: 15, total: 18000 },
      ],
      customerSegments: [
        { segment: "VIP", count: 25, revenue: 75000 },
        { segment: "Regular", count: 200, revenue: 40000 },
        { segment: "New", count: 95, revenue: 10000 },
      ],
    },
    inventory: {
      totalValue: 250000,
      lowStockItems: 15,
      outOfStockItems: 3,
      inventoryTurnover: 4.2,
      topMovingItems: [
        { name: "iPhone 15 Pro", turnover: 8.5, value: 45000 },
        { name: "Samsung Galaxy S24", turnover: 6.2, value: 32000 },
        { name: "MacBook Air M2", turnover: 4.8, value: 18000 },
      ],
      stockAlerts: [
        { name: "iPhone 15 Pro", current: 5, min: 10, daysLeft: 2 },
        { name: "Samsung Galaxy S24", current: 8, min: 15, daysLeft: 5 },
        { name: "MacBook Air M2", current: 12, min: 20, daysLeft: 8 },
      ],
    },
    financial: {
      totalRevenue: 125000,
      totalCosts: 75000,
      grossProfit: 50000,
      netProfit: 35000,
      profitMargin: 28,
      expenses: [
        { category: "Inventory", amount: 45000, percentage: 60 },
        { category: "Marketing", amount: 15000, percentage: 20 },
        { category: "Operations", amount: 10000, percentage: 13.3 },
        { category: "Other", amount: 5000, percentage: 6.7 },
      ],
    },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('tr-TR').format(num);
  };

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
                          {formatCurrency(mockData.overview.totalRevenue)}
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          +{mockData.overview.revenueGrowth}% bu ay
                        </p>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Sipariş</h3>
                        <div className="text-3xl font-bold text-blue-600">
                          {formatNumber(mockData.overview.totalOrders)}
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          +{mockData.overview.orderGrowth}% bu ay
                        </p>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Ürün</h3>
                        <div className="text-3xl font-bold text-green-600">
                          {formatNumber(mockData.overview.totalProducts)}
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          +{mockData.overview.productGrowth}% bu ay
                        </p>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Müşteri</h3>
                        <div className="text-3xl font-bold text-purple-600">
                          {formatNumber(mockData.overview.totalCustomers)}
                        </div>
                        <p className="text-sm text-green-600 mt-1">
                          +{mockData.overview.customerGrowth}% bu ay
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Günlük Satışlar</h3>
                        <div className="space-y-3">
                          {mockData.sales.dailySales.map((day, index) => (
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
                          {mockData.sales.salesByCategory.map((category, index) => (
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
                          {mockData.sales.topProducts.map((product, index) => (
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
                          {mockData.products.lowStock.map((item, index) => (
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
                          {mockData.products.categoryPerformance.map((category, index) => (
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
                          {mockData.customers.topCustomers.map((customer, index) => (
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
                          {mockData.customers.customerSegments.map((segment, index) => (
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
                          {formatCurrency(mockData.inventory.totalValue)}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Düşük Stok</h3>
                        <div className="text-3xl font-bold text-yellow-600">
                          {mockData.inventory.lowStockItems}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Stok Devir Hızı</h3>
                        <div className="text-3xl font-bold text-blue-600">
                          {mockData.inventory.inventoryTurnover}x
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">En Hızlı Hareket Eden Ürünler</h3>
                        <div className="space-y-4">
                          {mockData.inventory.topMovingItems.map((item, index) => (
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
                          {mockData.inventory.stockAlerts.map((alert, index) => (
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
                          {formatCurrency(mockData.financial.totalRevenue)}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Toplam Maliyet</h3>
                        <div className="text-3xl font-bold text-red-600">
                          {formatCurrency(mockData.financial.totalCosts)}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Brüt Kar</h3>
                        <div className="text-3xl font-bold text-blue-600">
                          {formatCurrency(mockData.financial.grossProfit)}
                        </div>
                      </div>
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-2">Net Kar</h3>
                        <div className="text-3xl font-bold text-purple-600">
                          {formatCurrency(mockData.financial.netProfit)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-card p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Gider Dağılımı</h3>
                        <div className="space-y-4">
                          {mockData.financial.expenses.map((expense, index) => (
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
                            {mockData.financial.profitMargin}%
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