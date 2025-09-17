"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Order {
  id: string;
  externalOrderNo?: string;
  wooOrderId?: string;
  status: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  storeId?: string;
  storeName?: string;
  syncStatus?: 'synced' | 'pending' | 'failed';
  customer?: {
    id: string;
    name?: string;
    email?: string;
    company?: string;
  };
  items?: Array<{
    id: string;
    productName: string;
    quantity: number;
    price: number;
    wooProductId?: string;
  }>;
}

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  useEffect(() => {
    if (user) {
      fetchOrders();
      if (user.role === 'ADMIN') {
        fetchStores();
        fetchCustomers();
      }
    } else {
      router.push('/login');
    }
  }, [user, currentPage, statusFilter, dateFilter, storeFilter, customerFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dateFilter !== 'all' && { dateRange: dateFilter }),
        ...(searchTerm && { search: searchTerm }),
        ...(storeFilter !== 'all' && { storeId: storeFilter }),
        ...(customerFilter !== 'all' && { customerId: customerFilter }),
      });

      const response = await api(`/orders?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data?.data || []);
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotalOrders(data?.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await api('/woo/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data || []);
      }
    } catch (err) {
      // Ignore store fetch errors
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api('/customers?limit=100');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.data || []);
      }
    } catch (err) {
      // Ignore customer fetch errors
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await api(`/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update order status');
      }

      setSuccess('Order status updated successfully');
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedOrders.length === 0) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await api('/orders/bulk', {
        method: 'PUT',
        body: JSON.stringify({ 
          orderIds: selectedOrders, 
          updates: { status: newStatus } 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update orders');
      }

      const result = await response.json();
      setSuccess(result.message);
      setSelectedOrders([]);
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    setSelectedOrders(
      selectedOrders.length === orders.length 
        ? [] 
        : orders.map(order => order.id)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'shipped': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'delivered': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'shipped': return '🚚';
      case 'delivered': return '✅';
      case 'cancelled': return '❌';
      default: return '📦';
    }
  };

  const formatCurrency = (amount: number, currency: string = '₺') => {
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDateRange = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case 'today':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        };
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return {
          start: weekStart,
          end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        };
      case 'month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading orders...</div>
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
            <h1 className="mobile-heading text-foreground">Order Management</h1>
            <p className="text-muted-foreground mobile-text">
              Manage and track your orders ({totalOrders} total)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalOrders} orders total
            </span>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate">
              + New Order
            </button>
          </div>
        </div>

        {/* Messages */}
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

        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg animate-slide-down">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <span className="text-xl">📦</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold text-foreground">{totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <span className="text-xl">⏳</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-foreground">
                  {orders.filter(o => o.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold text-foreground">
                  {orders.filter(o => o.status === 'delivered').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(orders.reduce((sum, o) => sum + o.total, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card p-4 rounded-lg border border-border animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search orders by number, customer, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Store Filter (Admin Only) */}
            {user?.role === 'ADMIN' && (
              <div>
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
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

            {/* Customer Filter (Admin Only) */}
            {user?.role === 'ADMIN' && (
              <div>
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                >
                  <option value="all">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name || customer.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <div className="bg-accent/20 p-4 rounded-lg border border-accent animate-slide-down">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {selectedOrders.length} order(s) selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => bulkUpdateStatus(e.target.value)}
                  className="px-3 py-1 bg-background border border-border rounded text-sm"
                  disabled={saving}
                >
                  <option value="">Bulk Actions</option>
                  <option value="processing">Mark as Processing</option>
                  <option value="shipped">Mark as Shipped</option>
                  <option value="delivered">Mark as Delivered</option>
                  <option value="cancelled">Cancel Orders</option>
                </select>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="px-3 py-1 bg-destructive/10 text-destructive rounded text-sm hover:bg-destructive/20 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-4 animate-slide-up">
          {orders.length === 0 ? (
            <div className="bg-card p-8 rounded-lg border border-border text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating your first order'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header */}
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                  />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-6 gap-4 text-sm font-medium text-muted-foreground">
                    <div>Order</div>
                    <div>Customer</div>
                    <div>Status</div>
                    <div>Total</div>
                    <div>Date</div>
                    <div>Actions</div>
                  </div>
                </div>
              </div>

              {/* Orders */}
              {orders.map((order, index) => (
                <div
                  key={order.id}
                  className="bg-card p-4 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 card-hover animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                    />
                    
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-6 gap-4 items-center">
                      {/* Order Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getStatusIcon(order.status)}</span>
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">
                              #{order.externalOrderNo || order.id.slice(0, 8)}
                            </h3>
                            {order.wooOrderId && (
                              <p className="text-xs text-blue-600">
                                WooCommerce: #{order.wooOrderId}
                              </p>
                            )}
                            {order.storeName && (
                              <p className="text-xs text-muted-foreground">
                                Store: {order.storeName}
                              </p>
                            )}
                            {order.items && order.items.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {order.items.length} item(s)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Customer */}
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {order.customer?.name || order.customerName || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.customer?.email || order.customerEmail || 'No email'}
                        </p>
                        {order.customer?.company && (
                          <p className="text-xs text-muted-foreground">
                            {order.customer.company}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Total */}
                      <div>
                        <p className="font-bold text-foreground">
                          {formatCurrency(order.total, order.currency)}
                        </p>
                      </div>

                      {/* Date */}
                      <div>
                        <p className="text-sm text-foreground">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <a
                          href={`/orders/${order.id}`}
                          className="px-3 py-1 bg-primary/10 text-primary rounded text-xs hover:bg-primary/20 transition-colors"
                        >
                          View
                        </a>
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          disabled={saving}
                          className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 animate-slide-up">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>
      </div>
    </ProtectedRoute>
  );
}