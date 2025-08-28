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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}/orders/stats/summary`, {
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

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">Fulexo Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">
                {user?.email} ({user?.role})
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <a href="/dashboard" className="text-white py-3 px-1 border-b-2 border-blue-500">
              Dashboard
            </a>
            <a href="/orders" className="text-gray-300 hover:text-white py-3 px-1">
              Orders
            </a>
            <a href="/shipments" className="text-gray-300 hover:text-white py-3 px-1">
              Shipments
            </a>
            <a href="/products" className="text-gray-300 hover:text-white py-3 px-1">
              Products
            </a>
            <a href="/customers" className="text-gray-300 hover:text-white py-3 px-1">
              Customers
            </a>
            {(user?.role === 'FULEXO_ADMIN' || user?.role === 'FULEXO_STAFF') && (
              <a href="/settings" className="text-gray-300 hover:text-white py-3 px-1">
                Settings
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user?.email?.split('@')[0]}!
          </h2>
          <p className="text-gray-400">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Orders</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stats?.totalOrders || 0}
                </p>
              </div>
              <div className="text-blue-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-green-500 text-sm mt-4">
              ↑ 12% from last month
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold text-white mt-2">
                  ₺{stats?.totalRevenue?.toLocaleString() || 0}
                </p>
              </div>
              <div className="text-green-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-green-500 text-sm mt-4">
              ↑ 8% from last month
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Orders</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stats?.pendingOrders || 0}
                </p>
              </div>
              <div className="text-yellow-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-4">
              Requires attention
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Return Rate</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {stats?.returnRate || 0}%
                </p>
              </div>
              <div className="text-red-500">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                </svg>
              </div>
            </div>
            <p className="text-green-500 text-sm mt-4">
              ↓ 0.5% from last month
            </p>
          </div>
        </div>

        {/* Sync Status */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h3 className="text-xl font-bold text-white mb-4">Sync Status</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">BaseLinker Synchronization</p>
              <p className="text-sm text-gray-500 mt-1">
                Last sync: {stats?.syncStatus?.lastSync ? new Date(stats.syncStatus.lastSync).toLocaleString() : 'Never'}
              </p>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${stats?.syncStatus?.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`}></div>
              <span className={`text-sm ${stats?.syncStatus?.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>
                {stats?.syncStatus?.status === 'active' ? 'Active' : 'Syncing...'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 transition">
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="font-semibold">Create New Order</p>
          </button>

          <button className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg p-6 transition">
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="font-semibold">Sync with BaseLinker</p>
          </button>

          <button className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-6 transition">
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v1a1 1 0 001 1h4a1 1 0 001-1v-1m-5 0h5m-5 0l1-7h3l1 7M12 4h.01M8 4h.01M16 4h.01M5 8h14a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V9a1 1 0 011-1z" />
            </svg>
            <p className="font-semibold">Generate Report</p>
          </button>
        </div>
      </main>
    </div>
  );
}