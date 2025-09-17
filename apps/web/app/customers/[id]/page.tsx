"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Customer {
  id: string;
  email?: string;
  name?: string;
  company?: string;
  phoneE164?: string;
  vatId?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  orders?: {
    id: string;
    externalOrderNo?: string;
    total: number;
    currency: string;
    status: string;
    createdAt: string;
  }[];
  orderStats?: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate?: string;
  };
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    company: '',
    phoneE164: '',
    vatId: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    notes: '',
    tags: '',
  });

  // Token is now handled by httpOnly cookies
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init
    });

  const loadCustomer = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await api(`/customers/${params.id}`);
      if (r.ok) {
        const data = await r.json();
        setCustomer(data);
        setEditForm({
          name: data.name || '',
          email: data.email || '',
          company: data.company || '',
          phoneE164: data.phoneE164 || '',
          vatId: data.vatId || '',
          addressLine1: data.addressLine1 || '',
          addressLine2: data.addressLine2 || '',
          city: data.city || '',
          state: data.state || '',
          postalCode: data.postalCode || '',
          country: data.country || '',
          notes: data.notes || '',
          tags: data.tags?.join(', ') || '',
        });
      } else if (r.status === 401) {
        router.push('/login');
      } else {
        throw new Error('Failed to load customer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  };

  const updateCustomer = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/customers/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name || undefined,
          email: editForm.email || undefined,
          company: editForm.company || undefined,
          phoneE164: editForm.phoneE164 || undefined,
          vatId: editForm.vatId || undefined,
          addressLine1: editForm.addressLine1 || undefined,
          addressLine2: editForm.addressLine2 || undefined,
          city: editForm.city || undefined,
          state: editForm.state || undefined,
          postalCode: editForm.postalCode || undefined,
          country: editForm.country || undefined,
          notes: editForm.notes || undefined,
          tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update customer');
      }

      setSuccess('Customer updated successfully');
      setShowEditModal(false);
      await loadCustomer();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async () => {
    if (!confirm('Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/customers/${params.id}`, { method: 'DELETE' });
      
      if (r.ok) {
        setSuccess('Customer deleted successfully. Redirecting...');
        setTimeout(() => {
          router.push('/customers');
        }, 1500);
      } else {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete customer');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCustomer();
    } else {
      router.push('/login');
    }
  }, [user, params.id]);

  const formatCurrency = (amount: number, currency: string = '₺') => {
    return `${amount.toFixed(2)} ${currency}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const getCountryFlag = (country?: string) => {
    if (!country) return '🌍';
    const flags: { [key: string]: string } = {
      'TR': '🇹🇷',
      'US': '🇺🇸',
      'GB': '🇬🇧',
      'DE': '🇩🇪',
      'FR': '🇫🇷',
      'IT': '🇮🇹',
      'ES': '🇪🇸',
      'NL': '🇳🇱',
      'CA': '🇨🇦',
      'AU': '🇦🇺',
    };
    return flags[country.toUpperCase()] || '🌍';
  };

  if (loading) {
    return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading customer details...</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Customer Not Found</h2>
          <p className="text-muted-foreground mb-4">The customer you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/customers')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '👤' },
    { id: 'orders', name: 'Orders', icon: '📦' },
    { id: 'address', name: 'Address', icon: '📍' },
    { id: 'notes', name: 'Notes', icon: '📝' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/customers')}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <h1 className="mobile-heading text-foreground">
                  {customer.name || 'Unnamed Customer'}
                </h1>
                <p className="text-muted-foreground mobile-text">
                  {customer.email || 'No email'} • {customer.company || 'No company'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
              >
                Edit
              </button>
              <button
                onClick={deleteCustomer}
                disabled={saving}
                className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 btn-animate"
              >
                Delete
              </button>
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
                  {/* Basic Info */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Contact Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="text-foreground">{customer.name || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="text-foreground">{customer.email || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="text-foreground">{customer.phoneE164 || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Company:</span>
                        <span className="text-foreground">{customer.company || 'Not set'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Stats */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Order Statistics</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Orders:</span>
                        <span className="text-foreground font-bold">
                          {customer.orderStats?.totalOrders || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Spent:</span>
                        <span className="text-foreground font-bold">
                          {customer.orderStats?.totalSpent 
                            ? formatCurrency(customer.orderStats.totalSpent) 
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Order Value:</span>
                        <span className="text-foreground font-bold">
                          {customer.orderStats?.averageOrderValue 
                            ? formatCurrency(customer.orderStats.averageOrderValue) 
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Order:</span>
                        <span className="text-foreground">
                          {customer.orderStats?.lastOrderDate 
                            ? formatDate(customer.orderStats.lastOrderDate) 
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Timeline</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer Since:</span>
                        <span className="text-foreground">
                          {formatDate(customer.createdAt)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated:</span>
                        <span className="text-foreground">
                          {formatDate(customer.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {customer.tags && customer.tags.length > 0 && (
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {customer.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {customer.notes && (
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Notes</h3>
                    <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {customer.notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Order History</h3>
                  <p className="text-muted-foreground">
                    {customer.orders && customer.orders.length > 0 
                      ? `${customer.orders.length} order(s) found`
                      : 'No orders found for this customer'
                    }
                  </p>
                </div>

                {customer.orders && customer.orders.length > 0 ? (
                  <div className="space-y-4">
                    {customer.orders.map((order, index) => (
                      <div
                        key={order.id}
                        className="bg-accent/20 p-4 rounded-lg hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-foreground">
                              Order #{order.externalOrderNo || order.id.slice(0, 8)}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(order.createdAt)} • {order.status}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">
                              {formatCurrency(order.total, order.currency)}
                            </p>
                            <a
                              href={`/orders/${order.id}`}
                              className="text-sm text-primary hover:underline"
                            >
                              View Details
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-accent/20 p-8 rounded-lg text-center">
                    <p className="text-muted-foreground mb-4">No orders found for this customer</p>
                    <a
                      href="/orders"
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
                    >
                      View All Orders
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Address Tab */}
            {activeTab === 'address' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="text-6xl mb-4">📍</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Address Information</h3>
                  <p className="text-muted-foreground">
                    {customer.addressLine1 || customer.city || customer.country
                      ? 'Address information available'
                      : 'No address information available'
                    }
                  </p>
                </div>

                {(customer.addressLine1 || customer.city || customer.country) ? (
                  <div className="bg-accent/20 p-6 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-4">Billing Address</h4>
                    <div className="space-y-2 text-sm">
                      {customer.addressLine1 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Address Line 1:</span>
                          <span className="text-foreground">{customer.addressLine1}</span>
                        </div>
                      )}
                      {customer.addressLine2 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Address Line 2:</span>
                          <span className="text-foreground">{customer.addressLine2}</span>
                        </div>
                      )}
                      {customer.city && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">City:</span>
                          <span className="text-foreground">{customer.city}</span>
                        </div>
                      )}
                      {customer.state && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">State:</span>
                          <span className="text-foreground">{customer.state}</span>
                        </div>
                      )}
                      {customer.postalCode && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Postal Code:</span>
                          <span className="text-foreground">{customer.postalCode}</span>
                        </div>
                      )}
                      {customer.country && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Country:</span>
                          <span className="text-foreground flex items-center gap-2">
                            {getCountryFlag(customer.country)} {customer.country}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-accent/20 p-8 rounded-lg text-center">
                    <p className="text-muted-foreground mb-4">No address information available</p>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
                    >
                      Add Address
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Customer Notes</h3>
                  <p className="text-muted-foreground">
                    {customer.notes 
                      ? 'Customer notes available'
                      : 'No notes available for this customer'
                    }
                  </p>
                </div>

                {customer.notes ? (
                  <div className="bg-accent/20 p-6 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-4">Notes</h4>
                    <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                      {customer.notes}
                    </div>
                  </div>
                ) : (
                  <div className="bg-accent/20 p-8 rounded-lg text-center">
                    <p className="text-muted-foreground mb-4">No notes available for this customer</p>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
                    >
                      Add Notes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg border border-border p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
              <h3 className="text-lg font-semibold text-foreground mb-4">Edit Customer</h3>
              
              <div className="space-y-6">
                {/* Contact Information */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="Customer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="customer@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={editForm.phoneE164}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phoneE164: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="+90 555 123 4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={editForm.company}
                        onChange={(e) => setEditForm(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        VAT ID
                      </label>
                      <input
                        type="text"
                        value={editForm.vatId}
                        onChange={(e) => setEditForm(prev => ({ ...prev, vatId: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="VAT ID"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Address Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Address Line 1
                      </label>
                      <input
                        type="text"
                        value={editForm.addressLine1}
                        onChange={(e) => setEditForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="Street address"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        value={editForm.addressLine2}
                        onChange={(e) => setEditForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="Apartment, suite, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={editForm.city}
                        onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        State
                      </label>
                      <input
                        type="text"
                        value={editForm.state}
                        onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="State"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={editForm.postalCode}
                        onChange={(e) => setEditForm(prev => ({ ...prev, postalCode: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="Postal code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={editForm.country}
                        onChange={(e) => setEditForm(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="Country"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes and Tags */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Notes and Tags</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Notes
                      </label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        rows={4}
                        placeholder="Customer notes..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        value={editForm.tags}
                        onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                        placeholder="vip, premium, wholesale"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateCustomer}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 btn-animate"
                >
                  {saving ? 'Updating...' : 'Update Customer'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  </ProtectedRoute>
);
}