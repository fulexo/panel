'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthProvider';
import ProtectedRoute from '../../components/ProtectedRoute';
import Link from 'next/link';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  dailyStats?: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

interface RecentActivity {
  id: string;
  type: 'order' | 'customer' | 'product' | 'shipment';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  storeName?: string;
  wooId?: string;
}

interface WooStore {
  id: string;
  name: string;
  baseUrl: string;
  active: boolean;
  lastSync?: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [stores, setStores] = useState<WooStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = (path: string, init?: any) => 
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}${path}`, {
      credentials: 'include', // Include httpOnly cookies
      headers: { 'Content-Type': 'application/json' },
      ...init
    });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    } else {
      router.push('/login');
    }
  }, [user, selectedStore]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch WooCommerce stores first
      const storesResponse = await api('/woo/stores');
      if (!storesResponse.ok) {
        if (storesResponse.status === 401) {
          router.push('/login');
          return;
        }
        const errorText = await storesResponse.text();
        throw new Error(`Failed to fetch WooCommerce stores: ${errorText}`);
      }
      const storesData = await storesResponse.json();
      setStores(storesData || []);

      // Fetch orders stats
      const ordersParams = selectedStore !== 'all' ? `?storeId=${selectedStore}` : '';
      const ordersResponse = await api(`/orders/stats/summary${ordersParams}`);
      if (!ordersResponse.ok) {
        if (ordersResponse.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch orders stats');
      }
      const ordersData = await ordersResponse.json();
      setStats(ordersData);

      // Fetch recent activity from API
      try {
        const activityParams = selectedStore !== 'all' ? `?limit=5&storeId=${selectedStore}` : '?limit=5';
        const activityResponse = await api(`/orders${activityParams}`);
        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          const recentOrders = activityData?.data || [];
          
          const activities: RecentActivity[] = recentOrders.map((order: any, index: number) => ({
            id: order.id,
            type: 'order' as const,
            title: `Order #${order.externalOrderNo || order.id.slice(0, 8)}`,
            description: `Order placed by ${order.customerName || order.customerEmail || 'Unknown Customer'}`,
            timestamp: order.createdAt,
            status: order.status,
            storeName: order.storeName || 'Unknown Store',
            wooId: order.externalOrderNo
          }));

          setRecentActivity(activities);
        } else {
          // Fallback to empty array if API fails
          setRecentActivity([]);
        }
      } catch (err) {
        // Fallback to empty array if API fails
        setRecentActivity([]);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      // Set fallback data
      setStats({
        totalOrders: 0,
        totalRevenue: 0,
        statusBreakdown: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      order: '📦',
      customer: '👤',
      product: '📱',
      shipment: '🚚'
    };
    return icons[type as keyof typeof icons] || '📋';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-yellow-500',
      processing: 'text-blue-500',
      completed: 'text-green-500',
      shipped: 'text-green-500',
      delivered: 'text-green-500',
      cancelled: 'text-red-500'
    };
    return colors[status as keyof typeof colors] || 'text-gray-500';
  };

  // Get status counts from breakdown
  const getStatusCount = (status: string) => {
    return stats?.statusBreakdown?.find(s => s.status === status)?.count || 0;
  };

  const pendingOrders = getStatusCount('pending') + getStatusCount('processing');
  const completedOrders = getStatusCount('completed') + getStatusCount('shipped');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="mobile-heading text-foreground">
              Welcome back, {user?.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-muted-foreground mobile-text">
              Here's your business overview for today
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Store Filter (Admin Only) */}
            {user?.role === 'ADMIN' && stores.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">Store:</label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground text-sm"
                >
                  <option value="all">All Stores</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>📅</span>
              <span>{new Date().toLocaleDateString('tr-TR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg animate-slide-down">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* WooCommerce Stores */}
        {stores.length > 0 && (
          <div className="bg-card p-6 rounded-lg border border-border animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">WooCommerce Stores</h2>
              <Link href="/stores" className="text-sm text-primary hover:text-primary/80">
                Manage Stores →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stores.map((store) => (
                <div key={store.id} className="bg-muted/50 p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-foreground">{store.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      store.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {store.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{store.baseUrl}</p>
                  {store.lastSync && (
                    <p className="text-xs text-muted-foreground">
                      Last sync: {new Date(store.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <div className="bg-card p-6 rounded-lg border border-border card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-foreground">{stats?.totalOrders || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <span className="text-2xl">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(stats?.totalRevenue || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending Orders</p>
                <p className="text-3xl font-bold text-foreground">{pendingOrders}</p>
                <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-3xl font-bold text-foreground">{completedOrders}</p>
                <p className="text-xs text-muted-foreground mt-1">Successfully processed</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        {stats?.statusBreakdown && stats.statusBreakdown.length > 0 && (
          <div className="bg-card p-6 rounded-lg border border-border animate-slide-up">
            <h3 className="text-lg font-semibold text-foreground mb-4">Order Status Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {stats.statusBreakdown.map((status, index) => (
                <div key={status.status} className="text-center">
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {status.count}
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {status.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <a
            href="/orders"
            className="bg-primary text-primary-foreground p-6 rounded-lg hover:bg-primary/90 transition-colors btn-animate group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl group-hover:scale-110 transition-transform">📋</span>
              <div>
                <h3 className="font-semibold text-lg">Orders</h3>
                <p className="text-primary-foreground/80 text-sm">Manage all orders</p>
              </div>
            </div>
          </a>

          <a
            href="/products"
            className="bg-accent text-accent-foreground p-6 rounded-lg hover:bg-accent/90 transition-colors btn-animate group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl group-hover:scale-110 transition-transform">📱</span>
              <div>
                <h3 className="font-semibold text-lg">Products</h3>
                <p className="text-accent-foreground/80 text-sm">Manage inventory</p>
              </div>
            </div>
          </a>

          <a
            href="/customers"
            className="bg-secondary text-secondary-foreground p-6 rounded-lg hover:bg-secondary/90 transition-colors btn-animate group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl group-hover:scale-110 transition-transform">👥</span>
              <div>
                <h3 className="font-semibold text-lg">Customers</h3>
                <p className="text-secondary-foreground/80 text-sm">Customer management</p>
              </div>
            </div>
          </a>

          <a
            href="/shipments"
            className="bg-muted text-muted-foreground p-6 rounded-lg hover:bg-muted/90 transition-colors btn-animate group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl group-hover:scale-110 transition-transform">🚚</span>
              <div>
                <h3 className="font-semibold text-lg">Shipments</h3>
                <p className="text-muted-foreground/80 text-sm">Track deliveries</p>
              </div>
            </div>
          </a>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
          <div className="bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/20 transition-colors"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="text-xl">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground text-sm">{activity.title}</h4>
                      {activity.status && (
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(activity.status)} bg-current/10`}>
                          {activity.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Conversion Rate</p>
                    <p className="text-xs text-muted-foreground">Orders to Revenue</p>
                  </div>
                </div>
                     <div className="text-right">
                       <p className="text-lg font-bold text-foreground">
                         {stats?.totalOrders > 0 ? ((stats.totalRevenue / stats.totalOrders) * 100).toFixed(1) : 0}%
                       </p>
                     </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📈</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Avg Order Value</p>
                    <p className="text-xs text-muted-foreground">Revenue per order</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    {formatCurrency(stats?.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders) : 0)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-accent/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Processing Rate</p>
                    <p className="text-xs text-muted-foreground">Completed orders</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">
                    {stats?.totalOrders > 0 ? ((completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}