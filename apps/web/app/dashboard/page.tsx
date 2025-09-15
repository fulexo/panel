'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  shippedOrders: number;
  returnRate: number;
  syncStatus: {
    lastSync: string;
    status: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

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
      const url = new URL(`/api/orders/stats/summary`, window.location.origin);
      if(dateFrom) url.searchParams.set('dateFrom', dateFrom);
      if(dateTo) url.searchParams.set('dateTo', dateTo);
      const response = await fetch(url.toString(), {
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
      
      // Mock additional stats for demo
      setStats({
        totalOrders: data.totalOrders || 0,
        totalRevenue: data.totalRevenue || 0,
        pendingOrders: 15,
        shippedOrders: 45,
        returnRate: 2.3,
        syncStatus: {
          lastSync: new Date().toISOString(),
          status: 'active',
        },
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const statCards = [
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: '📦',
      change: '+12%',
      changeType: 'positive',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Revenue',
      value: `₺${stats?.totalRevenue?.toLocaleString() || 0}`,
      icon: '💰',
      change: '+8%',
      changeType: 'positive',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      icon: '⏳',
      change: 'Requires attention',
      changeType: 'neutral',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Return Rate',
      value: `${stats?.returnRate || 0}%`,
      icon: '↩️',
      change: '-0.5%',
      changeType: 'positive',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  const quickActions = [
    {
      title: 'Create New Order',
      description: 'Add a new order to the system',
      icon: '➕',
      href: '/orders/create',
      color: 'bg-primary hover:bg-primary/90',
    },
    {
      title: 'Sync Stores',
      description: 'Synchronize with WooCommerce stores',
      icon: '🔄',
      href: '/stores/sync',
      color: 'bg-purple-600 hover:bg-purple-700',
    },
    {
      title: 'Generate Report',
      description: 'Create detailed business reports',
      icon: '📊',
      href: '/reports',
      color: 'bg-green-600 hover:bg-green-700',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="mobile-container py-6 space-y-6">
        {/* Welcome Message */}
        <div className="animate-fade-in">
          <h1 className="mobile-heading text-foreground mb-2">
            Welcome back, {user?.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-muted-foreground mobile-text">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* Date Filter */}
        <div className="bg-card p-4 rounded-lg border border-border animate-slide-up">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              />
            </div>
            <button
              onClick={fetchDashboardStats}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mobile-grid animate-slide-up">
          {statCards.map((card, index) => (
            <div
              key={card.title}
              className="bg-card p-6 rounded-lg border border-border card-hover animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <span className="text-2xl">{card.icon}</span>
                </div>
                <div className={`text-sm font-medium ${card.color}`}>
                  {card.change}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sync Status */}
        <div className="bg-card p-6 rounded-lg border border-border animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats?.syncStatus?.status === 'active' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                <span className="text-xl">🔄</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Sync Status</h3>
                <p className="text-sm text-muted-foreground">
                  Last sync: {stats?.syncStatus?.lastSync ? new Date(stats.syncStatus.lastSync).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${stats?.syncStatus?.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
              <span className={`text-sm font-medium ${stats?.syncStatus?.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>
                {stats?.syncStatus?.status === 'active' ? 'Active' : 'Syncing...'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
          <div className="mobile-grid">
            {quickActions.map((action, index) => (
              <a
                key={action.title}
                href={action.href}
                className={`${action.color} text-white rounded-lg p-6 transition-all duration-200 card-hover animate-scale-in`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{action.icon}</span>
                  <h3 className="font-semibold text-lg">{action.title}</h3>
                </div>
                <p className="text-white/80 text-sm">{action.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card p-6 rounded-lg border border-border animate-slide-up">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
              <span className="text-lg">📦</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">New order #12345 received</p>
                <p className="text-xs text-muted-foreground">2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
              <span className="text-lg">🚚</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Order #12344 shipped</p>
                <p className="text-xs text-muted-foreground">1 hour ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg">
              <span className="text-lg">🔄</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Store sync completed</p>
                <p className="text-xs text-muted-foreground">3 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}