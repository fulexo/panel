"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface Order {
  id: string;
  orderNo?: string;
  externalOrderNo?: string;
  status: string;
  mappedStatus?: string;
  total: number;
  currency: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  shippingAddress?: any;
  billingAddress?: any;
  paymentMethod?: string;
  notes?: string;
  tags?: string[];
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
  serviceCharges?: ServiceCharge[];
  customer?: {
    id: string;
    name: string;
    email: string;
  };
}

interface OrderItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  price: number;
  total: number;
}

interface ServiceCharge {
  id: string;
  type: string;
  amount: number;
  currency: string;
  notes?: string;
  createdAt: string;
}

export default function OrderDetailPage() {
  const router = useRouter();
  // @ts-ignore
  const params = useParams();
  const id = (params?.id as string) || '';
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Form states
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' });
  const [newNote, setNewNote] = useState('');
  const [charge, setCharge] = useState({ type: '', amount: '', currency: '', notes: '' });

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch order');
      }

      const data = await response.json();
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!statusUpdate.status) return;
    
    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: statusUpdate.status,
          notes: statusUpdate.notes || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setSuccess('Order status updated successfully');
      setStatusUpdate({ status: '', notes: '' });
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const addCharge = async () => {
    if (!charge.type || !charge.amount) return;
    
    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`/api/orders/${id}/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: charge.type,
          amount: Number(charge.amount),
          currency: charge.currency || order?.currency,
          notes: charge.notes || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add charge');
      }

      setSuccess('Service charge added successfully');
      setCharge({ type: '', amount: '', currency: '', notes: '' });
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add charge');
    } finally {
      setSaving(false);
    }
  };

  const removeCharge = async (chargeId: string) => {
    try {
      setSaving(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`/api/orders/${id}/charges/${chargeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to remove charge');
      }

      setSuccess('Service charge removed successfully');
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove charge');
    } finally {
      setSaving(false);
    }
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

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  if (loading) {
    return (
  <ProtectedRoute>
    
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading order...</div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">The order you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/orders')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
          >
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'items', name: 'Items', icon: '📦' },
    { id: 'customer', name: 'Customer', icon: '👤' },
    { id: 'shipping', name: 'Shipping', icon: '🚚' },
    { id: 'timeline', name: 'Timeline', icon: '⏰' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/orders')}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="mobile-heading text-foreground">
                Order #{order.externalOrderNo || order.orderNo || order.id}
              </h1>
              <p className="text-muted-foreground mobile-text">
                {order.customerEmail || 'No email'} • {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
              <span className="mr-2">{getStatusIcon(order.status)}</span>
              {order.status}
            </span>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">
                {order.total ? `${order.total} ${order.currency}` : 'No amount'}
              </div>
            </div>
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

        {/* Tabs */}
        <div className="bg-card rounded-lg border border-border animate-slide-up">
          <div className="flex flex-wrap border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Order Summary */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Order ID:</span>
                        <span className="text-foreground font-mono">{order.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">External ID:</span>
                        <span className="text-foreground">{order.externalOrderNo || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="text-foreground font-semibold">
                          {order.total ? `${order.total} ${order.currency}` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="text-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Customer</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="text-foreground">{order.customerName || order.customer?.name || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="text-foreground">{order.customerEmail || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="text-foreground">{order.customerPhone || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Payment</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Method:</span>
                        <span className="text-foreground">{order.paymentMethod || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Currency:</span>
                        <span className="text-foreground">{order.currency || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Update */}
                <div className="bg-accent/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-3">Update Status</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={statusUpdate.status}
                      onChange={(e) => setStatusUpdate(prev => ({ ...prev, status: e.target.value }))}
                      className="px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    >
                      <option value="">Select Status</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <input
                      value={statusUpdate.notes}
                      onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notes (optional)"
                      className="flex-1 px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                    <button
                      onClick={updateStatus}
                      disabled={!statusUpdate.status || saving}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
                    >
                      {saving ? 'Updating...' : 'Update'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Items Tab */}
            {activeTab === 'items' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Order Items</h3>
                  <span className="text-sm text-muted-foreground">
                    {order.items?.length || 0} items
                  </span>
                </div>

                {order.items && order.items.length > 0 ? (
                  <div className="space-y-3">
                    {order.items.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-accent/20 p-4 rounded-lg animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{item.name || item.sku}</h4>
                            <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {item.qty} × {item.price} {order.currency}
                            </div>
                            <div className="font-semibold text-foreground">
                              {item.total} {order.currency}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📦</div>
                    <p className="text-muted-foreground">No items found</p>
                  </div>
                )}

                {/* Service Charges */}
                <div className="bg-accent/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-3">Service Charges</h3>
                  
                  {order.serviceCharges && order.serviceCharges.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {order.serviceCharges.map((charge) => (
                        <div key={charge.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                          <div>
                            <div className="font-medium text-foreground">{charge.type}</div>
                            {charge.notes && (
                              <div className="text-sm text-muted-foreground">{charge.notes}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-foreground">
                              {charge.amount} {charge.currency}
                            </span>
                            <button
                              onClick={() => removeCharge(charge.id)}
                              className="text-destructive hover:text-destructive/80 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm mb-4">No service charges</p>
                  )}

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        value={charge.type}
                        onChange={(e) => setCharge(prev => ({ ...prev, type: e.target.value }))}
                        placeholder="Charge type"
                        className="px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      />
                      <input
                        value={charge.amount}
                        onChange={(e) => setCharge(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="Amount"
                        type="number"
                        step="0.01"
                        className="px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        value={charge.currency}
                        onChange={(e) => setCharge(prev => ({ ...prev, currency: e.target.value }))}
                        placeholder="Currency (optional)"
                        className="px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      />
                      <input
                        value={charge.notes}
                        onChange={(e) => setCharge(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Notes (optional)"
                        className="px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      />
                    </div>
                    <button
                      onClick={addCharge}
                      disabled={!charge.type || !charge.amount || saving}
                      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
                    >
                      {saving ? 'Adding...' : 'Add Service Charge'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Tab */}
            {activeTab === 'customer' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-foreground">Customer Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-3">Contact Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Name</label>
                        <div className="text-foreground font-medium">
                          {order.customerName || order.customer?.name || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Email</label>
                        <div className="text-foreground font-medium">
                          {order.customerEmail || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Phone</label>
                        <div className="text-foreground font-medium">
                          {order.customerPhone || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-3">Order Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-muted-foreground">Order Source</label>
                        <div className="text-foreground font-medium">
                          {order.orderSource || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Payment Method</label>
                        <div className="text-foreground font-medium">
                          {order.paymentMethod || '—'}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Confirmed At</label>
                        <div className="text-foreground font-medium">
                          {order.confirmedAt ? new Date(order.confirmedAt).toLocaleString() : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Shipping Tab */}
            {activeTab === 'shipping' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-foreground">Shipping Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-3">Shipping Address</h4>
                    {order.shippingAddress ? (
                      <div className="space-y-2 text-sm">
                        <div className="text-foreground">
                          {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                        </div>
                        <div className="text-foreground">
                          {order.shippingAddress.address1}
                        </div>
                        {order.shippingAddress.address2 && (
                          <div className="text-foreground">
                            {order.shippingAddress.address2}
                          </div>
                        )}
                        <div className="text-foreground">
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postcode}
                        </div>
                        <div className="text-foreground">
                          {order.shippingAddress.country}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No shipping address provided</p>
                    )}
                  </div>

                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-3">Billing Address</h4>
                    {order.billingAddress ? (
                      <div className="space-y-2 text-sm">
                        <div className="text-foreground">
                          {order.billingAddress.firstName} {order.billingAddress.lastName}
                        </div>
                        <div className="text-foreground">
                          {order.billingAddress.address1}
                        </div>
                        {order.billingAddress.address2 && (
                          <div className="text-foreground">
                            {order.billingAddress.address2}
                          </div>
                        )}
                        <div className="text-foreground">
                          {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postcode}
                        </div>
                        <div className="text-foreground">
                          {order.billingAddress.country}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No billing address provided</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-foreground">Order Timeline</h3>
                
                <div className="space-y-4">
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div>
                        <div className="font-medium text-foreground">Order Created</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {order.confirmedAt && (
                    <div className="bg-accent/20 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-foreground">Order Confirmed</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.confirmedAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-accent/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-foreground">Status: {order.status}</div>
                        <div className="text-sm text-muted-foreground">
                          Last updated: {new Date(order.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  </ProtectedRoute>
);
  );
}

