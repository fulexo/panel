'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Store {
  id: string;
  name: string;
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  apiVersion: string;
  webhookSecret: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create store form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [consumerKey, setConsumerKey] = useState('');
  const [consumerSecret, setConsumerSecret] = useState('');
  const [apiVersion, setApiVersion] = useState('v3');
  const [webhookSecret, setWebhookSecret] = useState('');
  
  // Edit store
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editName, setEditName] = useState('');
  const [editBaseUrl, setEditBaseUrl] = useState('');
  const [editConsumerKey, setEditConsumerKey] = useState('');
  const [editConsumerSecret, setEditConsumerSecret] = useState('');
  const [editApiVersion, setEditApiVersion] = useState('v3');
  const [editWebhookSecret, setEditWebhookSecret] = useState('');
  
  // Store actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : '');
  const api = (path: string, init?: RequestInit) => fetch(`/api${path}`, { 
    headers: { 
      , 
      'Content-Type': 'application/json' 
    }, 
    ...init 
  });

  useEffect(() => {
    if (!t) {
      router.push('/login');
      return;
    }
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!t) {
        router.push('/login');
        return;
      }
      const response = await api('/woo/stores');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch stores');
      }
      const data = await response.json();
      setStores(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const createStore = async () => {
    if (!name || !baseUrl || !consumerKey || !consumerSecret) return;
    
    try {
      setCreateLoading(true);
      setError(null);
      const response = await api('/woo/stores', {
        method: 'POST',
        body: JSON.stringify({
          name,
          baseUrl,
          consumerKey,
          consumerSecret,
          apiVersion,
          webhookSecret: webhookSecret || undefined
        })
      });

      if (response.ok) {
        setName('');
        setBaseUrl('');
        setConsumerKey('');
        setConsumerSecret('');
        setApiVersion('v3');
        setWebhookSecret('');
        setShowCreateForm(false);
        await loadStores();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create store');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create store');
    } finally {
      setCreateLoading(false);
    }
  };

  const startEdit = (store: Store) => {
    setEditingStore(store);
    setEditName(store.name);
    setEditBaseUrl(store.baseUrl);
    setEditConsumerKey(store.consumerKey);
    setEditConsumerSecret(store.consumerSecret);
    setEditApiVersion(store.apiVersion);
    setEditWebhookSecret(store.webhookSecret || '');
  };

  const updateStore = async () => {
    if (!editingStore) return;
    
    try {
      setActionLoading(editingStore.id);
      setError(null);
      const response = await api(`/woo/stores/${editingStore.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          baseUrl: editBaseUrl,
          consumerKey: editConsumerKey,
          consumerSecret: editConsumerSecret,
          apiVersion: editApiVersion,
          webhookSecret: editWebhookSecret || undefined
        })
      });

      if (response.ok) {
        setEditingStore(null);
        await loadStores();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update store');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update store');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteStore = async (id: string) => {
    if (!confirm('Are you sure you want to delete this store? This action cannot be undone.')) return;
    
    try {
      setActionLoading(id);
      setError(null);
      const response = await api(`/woo/stores/${id}`, { method: 'DELETE' });
      
      if (response.ok) {
        await loadStores();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete store');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete store');
    } finally {
      setActionLoading(null);
    }
  };

  const testConnection = async (id: string) => {
    try {
      setActionLoading(id);
      setError(null);
      const response = await api(`/woo/stores/${id}/test`, { method: 'POST' });
      const result = await response.json();
      
      if (result.ok) {
        alert('✅ Connection test successful!');
      } else {
        alert(`❌ Connection test failed: ${result.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`❌ Connection test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const registerWebhooks = async (id: string) => {
    try {
      setActionLoading(id);
      setError(null);
      const response = await api(`/woo/stores/${id}/register-webhooks`, { method: 'POST' });
      const result = await response.json();
      
      if (result.results) {
        alert(`✅ Webhooks registered successfully!\n\nResults:\n${JSON.stringify(result.results, null, 2)}`);
      } else {
        alert(`❌ Failed to register webhooks: ${result.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`❌ Failed to register webhooks: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const syncNow = async (id: string) => {
    try {
      setActionLoading(id);
      setError(null);
      
      const [ordersResponse, productsResponse] = await Promise.all([
        api('/jobs', { 
          method: 'POST', 
          body: JSON.stringify({ name: 'woo-sync-orders', data: { storeId: id } }) 
        }),
        api('/jobs', { 
          method: 'POST', 
          body: JSON.stringify({ name: 'woo-sync-products', data: { storeId: id } }) 
        })
      ]);

      if (ordersResponse.ok && productsResponse.ok) {
        alert('✅ Sync jobs queued successfully! Orders and products will be synchronized in the background.');
      } else {
        alert('❌ Failed to queue sync jobs. Please try again.');
      }
    } catch (err) {
      alert(`❌ Failed to queue sync jobs: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (active: boolean) => {
    return active 
      ? 'badge-success'
      : 'badge-error';
  };

  const getStatusIcon = (active: boolean) => {
    return active ? '🟢' : '🔴';
  };

  if (loading) {
    return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading stores...</div>
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
            <h1 className="h1 text-primary">WooCommerce Stores</h1>
            <p className="text-secondary mobile-text">
              Manage your WooCommerce store integrations ({stores.length} stores)
            </p>
          </div>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-primary btn-md btn-animate"
          >
            + Add Store
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error animate-slide-down">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Create Store Form */}
        {showCreateForm && (
          <div className="card p-6 animate-slide-down">
            <h2 className="h4 text-primary mb-4">Add New WooCommerce Store</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Store Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My WooCommerce Store"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Base URL</label>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://yourstore.com"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Consumer Key</label>
                <input
                  value={consumerKey}
                  onChange={(e) => setConsumerKey(e.target.value)}
                  placeholder="ck_..."
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Consumer Secret</label>
                <input
                  type="password"
                  value={consumerSecret}
                  onChange={(e) => setConsumerSecret(e.target.value)}
                  placeholder="cs_..."
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">API Version</label>
                <select
                  value={apiVersion}
                  onChange={(e) => setApiVersion(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                >
                  <option value="v3">v3 (Recommended)</option>
                  <option value="v2">v2</option>
                  <option value="v1">v1</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Webhook Secret (Optional)</label>
                <input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="Webhook secret for security"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={createStore}
                disabled={createLoading || !name || !baseUrl || !consumerKey || !consumerSecret}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
              >
                {createLoading ? 'Creating...' : 'Create Store'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors btn-animate"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stores Grid */}
        <div className="space-y-4 animate-slide-up">
          {stores.length === 0 ? (
            <div className="bg-card p-8 rounded-lg border border-border text-center">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No stores found</h3>
              <p className="text-muted-foreground">
                Get started by adding your first WooCommerce store
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {stores.map((store, index) => (
                <div
                  key={store.id}
                  className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 card-hover animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg mb-1">
                        {store.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2 break-all">
                        {store.baseUrl}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(store.active)}`}>
                          {getStatusIcon(store.active)} {store.active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          API v{store.apiVersion}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>🔑</span>
                      <span className="font-mono text-xs">
                        {store.consumerKey.substring(0, 8)}...
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>📅</span>
                      <span>Added {new Date(store.createdAt).toLocaleDateString()}</span>
                    </div>
                    {store.webhookSecret && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>🔐</span>
                        <span>Webhook secured</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => testConnection(store.id)}
                      disabled={actionLoading === store.id}
                      className="px-3 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === store.id ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      onClick={() => registerWebhooks(store.id)}
                      disabled={actionLoading === store.id}
                      className="px-3 py-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === store.id ? 'Registering...' : 'Webhooks'}
                    </button>
                    <button
                      onClick={() => syncNow(store.id)}
                      disabled={actionLoading === store.id}
                      className="px-3 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === store.id ? 'Syncing...' : 'Sync'}
                    </button>
                    <button
                      onClick={() => startEdit(store)}
                      disabled={actionLoading === store.id}
                      className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => deleteStore(store.id)}
                      disabled={actionLoading === store.id}
                      className="w-full px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === store.id ? 'Deleting...' : 'Delete Store'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Store Modal */}
        {editingStore && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card p-6 rounded-lg border border-border w-full max-w-2xl animate-scale-in">
              <h2 className="text-lg font-semibold text-foreground mb-4">Edit Store</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Store Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Base URL</label>
                  <input
                    value={editBaseUrl}
                    onChange={(e) => setEditBaseUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Consumer Key</label>
                  <input
                    value={editConsumerKey}
                    onChange={(e) => setEditConsumerKey(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Consumer Secret</label>
                  <input
                    type="password"
                    value={editConsumerSecret}
                    onChange={(e) => setEditConsumerSecret(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">API Version</label>
                  <select
                    value={editApiVersion}
                    onChange={(e) => setEditApiVersion(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  >
                    <option value="v3">v3 (Recommended)</option>
                    <option value="v2">v2</option>
                    <option value="v1">v1</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Webhook Secret</label>
                  <input
                    type="password"
                    value={editWebhookSecret}
                    onChange={(e) => setEditWebhookSecret(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateStore}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
                >
                  Update Store
                </button>
                <button
                  onClick={() => setEditingStore(null)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors btn-animate"
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