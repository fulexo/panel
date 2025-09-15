'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/orders/stats/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Get status counts from breakdown
  const getStatusCount = (status: string) => {
    return stats?.statusBreakdown?.find(s => s.status === status)?.count || 0;
  };

  const pendingOrders = getStatusCount('pending') + getStatusCount('processing');
  const completedOrders = getStatusCount('completed') + getStatusCount('shipped');

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Welcome */}
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's your business overview
          </p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalOrders || 0}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <span className="text-xl">📦</span>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground">₺{stats?.totalRevenue?.toLocaleString() || 0}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <span className="text-xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold text-foreground">{pendingOrders}</p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <span className="text-xl">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-2xl font-bold text-foreground">{completedOrders}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <span className="text-xl">✅</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
          <a
            href="/orders"
            className="bg-primary text-primary-foreground p-6 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div>
                <h3 className="font-semibold text-lg">View Orders</h3>
                <p className="text-primary-foreground/80 text-sm">Manage all orders</p>
              </div>
            </div>
          </a>

          <a
            href="/products"
            className="bg-secondary text-secondary-foreground p-6 rounded-lg hover:bg-secondary/90 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📱</span>
              <div>
                <h3 className="font-semibold text-lg">Products</h3>
                <p className="text-secondary-foreground/80 text-sm">Manage inventory</p>
              </div>
            </div>
          </a>
        </div>
      </main>
    </div>
  );
}