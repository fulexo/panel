"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";

interface Customer {
  id: string;
  name?: string;
  email?: string;
  phoneE164?: string;
  company?: string;
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
  orderStats?: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lastOrderDate?: string;
  };
}

interface CustomersResponse {
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function CustomersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  
  // Create customer form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phoneE164: '',
    company: '',
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
  
  // Edit customer
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  useEffect(() => {
    if (user) {
      fetchCustomers();
    } else {
      router.push('/login');
    }
  }, [user, currentPage, searchTerm, statusFilter, tagFilter]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const t = token();
      if (!t) { 
        router.push('/login'); 
        return; 
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(tagFilter !== 'all' && { tag: tagFilter }),
      });

      const r = await api(`/customers?${params}`);
      if (!r.ok) {
        if (r.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch customers');
      }
      
      const data: CustomersResponse = await r.json();
      setCustomers(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCustomers(data.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers();
  };

  const createCustomer = async () => {
    if (!createForm.name.trim() && !createForm.email.trim()) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name || undefined,
          email: createForm.email || undefined,
          phoneE164: createForm.phoneE164 || undefined,
          company: createForm.company || undefined,
          vatId: createForm.vatId || undefined,
          addressLine1: createForm.addressLine1 || undefined,
          addressLine2: createForm.addressLine2 || undefined,
          city: createForm.city || undefined,
          state: createForm.state || undefined,
          postalCode: createForm.postalCode || undefined,
          country: createForm.country || undefined,
          notes: createForm.notes || undefined,
          tags: createForm.tags ? createForm.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to create customer');
      }

      setSuccess('Customer created successfully');
      setShowCreateForm(false);
      setCreateForm({
        name: '',
        email: '',
        phoneE164: '',
        company: '',
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
      await fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setCreateForm({
      name: customer.name || '',
      email: customer.email || '',
      phoneE164: customer.phoneE164 || '',
      company: customer.company || '',
      vatId: customer.vatId || '',
      addressLine1: customer.addressLine1 || '',
      addressLine2: customer.addressLine2 || '',
      city: customer.city || '',
      state: customer.state || '',
      postalCode: customer.postalCode || '',
      country: customer.country || '',
      notes: customer.notes || '',
      tags: customer.tags?.join(', ') || '',
    });
  };

  const updateCustomer = async () => {
    if (!editingCustomer) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/customers/${editingCustomer.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: createForm.name || undefined,
          email: createForm.email || undefined,
          phoneE164: createForm.phoneE164 || undefined,
          company: createForm.company || undefined,
          vatId: createForm.vatId || undefined,
          addressLine1: createForm.addressLine1 || undefined,
          addressLine2: createForm.addressLine2 || undefined,
          city: createForm.city || undefined,
          state: createForm.state || undefined,
          postalCode: createForm.postalCode || undefined,
          country: createForm.country || undefined,
          notes: createForm.notes || undefined,
          tags: createForm.tags ? createForm.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update customer');
      }

      setSuccess('Customer updated successfully');
      setEditingCustomer(null);
      setCreateForm({
        name: '',
        email: '',
        phoneE164: '',
        company: '',
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
      await fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm('Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/customers/${id}`, { method: 'DELETE' });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete customer');
      }

      setSuccess('Customer deleted successfully');
      await fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

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

  const bulkAddTag = async (tag: string) => {
    if (selectedCustomers.length === 0) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const promises = selectedCustomers.map(customerId => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return Promise.resolve();
        
        const currentTags = customer.tags || [];
        const newTags = [...currentTags, tag].filter((t, i, arr) => arr.indexOf(t) === i); // Remove duplicates
        
        return api(`/customers/${customerId}`, {
          method: 'PUT',
          body: JSON.stringify({ tags: newTags })
        });
      });

      await Promise.all(promises);
      setSuccess(`${selectedCustomers.length} customers tagged with "${tag}" successfully`);
      setSelectedCustomers([]);
      await fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkRemoveTag = async (tag: string) => {
    if (selectedCustomers.length === 0) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const promises = selectedCustomers.map(customerId => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return Promise.resolve();
        
        const currentTags = customer.tags || [];
        const newTags = currentTags.filter(t => t !== tag);
        
        return api(`/customers/${customerId}`, {
          method: 'PUT',
          body: JSON.stringify({ tags: newTags })
        });
      });

      await Promise.all(promises);
      setSuccess(`Tag "${tag}" removed from ${selectedCustomers.length} customers successfully`);
      setSelectedCustomers([]);
      await fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedCustomers.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedCustomers.length} customers? This action cannot be undone.`)) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const promises = selectedCustomers.map(customerId => 
        api(`/customers/${customerId}`, { method: 'DELETE' })
      );

      await Promise.all(promises);
      setSuccess(`${selectedCustomers.length} customers deleted successfully`);
      setSelectedCustomers([]);
      await fetchCustomers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    setSelectedCustomers(
      selectedCustomers.length === customers.length 
        ? [] 
        : customers.map(customer => customer.id)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading customers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="mobile-heading text-foreground">Customer Management</h1>
            <p className="text-muted-foreground mobile-text">
              Manage your customer database ({totalCustomers} customers)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalCustomers} customers total
            </span>
            <button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
            >
              + Add Customer
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

        {/* Search and Filters */}
        <div className="bg-card p-4 rounded-lg border border-border animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search customers by name, email, company, or phone..."
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
                <option value="all">All Customers</option>
                <option value="with_orders">With Orders</option>
                <option value="no_orders">No Orders</option>
                <option value="vip">VIP Customers</option>
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Tags</option>
                <option value="vip">VIP</option>
                <option value="premium">Premium</option>
                <option value="wholesale">Wholesale</option>
                <option value="retail">Retail</option>
                <option value="new">New</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCustomers.length > 0 && (
          <div className="bg-accent/20 p-4 rounded-lg border border-accent animate-slide-down">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {selectedCustomers.length} customer(s) selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const tag = prompt('Enter tag to add:');
                    if (tag) bulkAddTag(tag);
                  }}
                  disabled={saving}
                  className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded text-sm hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  Add Tag
                </button>
                <button
                  onClick={() => {
                    const tag = prompt('Enter tag to remove:');
                    if (tag) bulkRemoveTag(tag);
                  }}
                  disabled={saving}
                  className="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded text-sm hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                >
                  Remove Tag
                </button>
                <button
                  onClick={bulkDelete}
                  disabled={saving}
                  className="px-3 py-1 bg-destructive/10 text-destructive rounded text-sm hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  Delete All
                </button>
                <button
                  onClick={() => setSelectedCustomers([])}
                  className="px-3 py-1 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/80 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <span className="text-xl">👥</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-xl font-bold text-foreground">{totalCustomers}</p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-foreground">
                  {customers.reduce((sum, c) => sum + (c.orderStats?.totalSpent || 0), 0).toFixed(2)} ₺
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <span className="text-xl">📦</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold text-foreground">
                  {customers.reduce((sum, c) => sum + (c.orderStats?.totalOrders || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <span className="text-xl">⭐</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">VIP Customers</p>
                <p className="text-xl font-bold text-foreground">
                  {customers.filter(c => c.tags?.includes('vip')).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Customer Form */}
        {showCreateForm && (
          <div className="bg-card p-6 rounded-lg border border-border animate-slide-down">
            <h2 className="text-lg font-semibold text-foreground mb-4">Add New Customer</h2>
            
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                    <input
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Customer name"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="customer@example.com"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                    <input
                      value={createForm.phoneE164}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, phoneE164: e.target.value }))}
                      placeholder="+90 555 123 4567"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Company</label>
                    <input
                      value={createForm.company}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Company name"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">VAT ID</label>
                    <input
                      value={createForm.vatId}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, vatId: e.target.value }))}
                      placeholder="VAT ID"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Address Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">Address Line 1</label>
                    <input
                      value={createForm.addressLine1}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, addressLine1: e.target.value }))}
                      placeholder="Street address"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">Address Line 2</label>
                    <input
                      value={createForm.addressLine2}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, addressLine2: e.target.value }))}
                      placeholder="Apartment, suite, etc."
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">City</label>
                    <input
                      value={createForm.city}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">State</label>
                    <input
                      value={createForm.state}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Postal Code</label>
                    <input
                      value={createForm.postalCode}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="Postal code"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Country</label>
                    <input
                      value={createForm.country}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, country: e.target.value }))}
                      placeholder="Country"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Notes and Tags */}
              <div>
                <h4 className="font-semibold text-foreground mb-3">Notes and Tags</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                    <textarea
                      value={createForm.notes}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      rows={3}
                      placeholder="Customer notes..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Tags (comma separated)</label>
                    <input
                      value={createForm.tags}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="vip, premium, wholesale"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createCustomer}
                disabled={saving || (!createForm.name.trim() && !createForm.email.trim())}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
              >
                {saving ? 'Creating...' : 'Create Customer'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Customers Grid */}
        <div className="space-y-4 animate-slide-up">
          {customers.length === 0 ? (
            <div className="bg-card p-8 rounded-lg border border-border text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No customers found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first customer'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Select All Header */}
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === customers.length && customers.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    Select all customers ({customers.length})
                  </span>
                </div>
              </div>

              {/* Customers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 card-hover animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedCustomers.includes(customer.id)}
                          onChange={() => handleSelectCustomer(customer.id)}
                          className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary mt-1"
                        />
                        <div className="flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground text-lg">
                          {customer.name || 'Unnamed Customer'}
                        </h3>
                        {customer.tags?.includes('vip') && (
                          <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full text-xs font-medium">
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {customer.email || 'No email'}
                      </p>
                      {customer.company && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {customer.company}
                        </p>
                      )}
                      {customer.city && customer.country && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <span>{getCountryFlag(customer.country)}</span>
                          <span>{customer.city}, {customer.country}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">👤</span>
                    </div>
                  </div>

                  {/* Order Stats */}
                  {customer.orderStats && customer.orderStats.totalOrders > 0 && (
                    <div className="bg-accent/20 p-3 rounded-lg mb-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Orders:</span>
                          <span className="text-foreground font-semibold ml-1">
                            {customer.orderStats.totalOrders}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Spent:</span>
                          <span className="text-foreground font-semibold ml-1">
                            {formatCurrency(customer.orderStats.totalSpent)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {customer.tags && customer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {customer.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                      {customer.tags.length > 3 && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                          +{customer.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {customer.phoneE164 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>📞</span>
                        <span>{customer.phoneE164}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>📅</span>
                      <span>Joined {formatDate(customer.createdAt)}</span>
                    </div>
                    {customer.orderStats?.lastOrderDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>🛒</span>
                        <span>Last order {formatDate(customer.orderStats.lastOrderDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      className="flex-1 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => startEdit(customer)}
                      className="px-3 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteCustomer(customer.id)}
                      className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
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

        {/* Edit Customer Modal */}
        {editingCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg border border-border p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">Edit Customer</h2>
              
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
                        value={createForm.name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
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
                        value={createForm.email}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
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
                        value={createForm.phoneE164}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, phoneE164: e.target.value }))}
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
                        value={createForm.company}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, company: e.target.value }))}
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
                        value={createForm.vatId}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, vatId: e.target.value }))}
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
                        value={createForm.addressLine1}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, addressLine1: e.target.value }))}
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
                        value={createForm.addressLine2}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, addressLine2: e.target.value }))}
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
                        value={createForm.city}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, city: e.target.value }))}
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
                        value={createForm.state}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, state: e.target.value }))}
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
                        value={createForm.postalCode}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, postalCode: e.target.value }))}
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
                        value={createForm.country}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, country: e.target.value }))}
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
                        value={createForm.notes}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
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
                        value={createForm.tags}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, tags: e.target.value }))}
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
                  onClick={() => setEditingCustomer(null)}
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
  );
}

