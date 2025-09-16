"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  settings?: {
    timezone: string;
    currency: string;
    language: string;
    theme: string;
    notifications: boolean;
    analytics: boolean;
  };
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  userCount?: number;
  orderCount?: number;
  totalRevenue?: number;
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  const loadTenant = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await api(`/tenants/${params.id}`);
      if (r.ok) {
        const data = await r.json();
        setTenant(data);
      } else if (r.status === 401) {
        router.push('/login');
      } else {
        throw new Error('Failed to load tenant');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const r = await api(`/tenants/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify(tenant)
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update tenant');
      }

      setSuccess('Tenant updated successfully');
      setEditMode(false);
      await loadTenant();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const impersonateTenant = async () => {
    if (!confirm('Bu tenant\'ı taklit etmek istediğinizden emin misiniz?')) return;
    
    try {
      setSaving(true);
      setError(null);
      const r = await api(`/tenants/${params.id}/impersonate`, { method: 'POST' });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to impersonate tenant');
      }
      
      const result = await r.json();
      localStorage.setItem('access_token', result.tokens.access);
      localStorage.setItem('refresh_token', result.tokens.refresh);
      
      setSuccess('Successfully switched to tenant. Redirecting...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTenant = async () => {
    if (!confirm('Bu tenant\'ı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    try {
      setSaving(true);
      setError(null);
      const r = await api(`/tenants/${params.id}`, { method: 'DELETE' });
      
      if (r.ok) {
        setSuccess('Tenant deleted successfully. Redirecting...');
        setTimeout(() => {
          router.push('/tenants');
        }, 1500);
      } else {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete tenant');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'ADMIN') {
      loadTenant();
    } else {
      router.push('/dashboard');
    }
  }, [currentUser, params.id]);

  const getStatusColor = (tenant: Tenant) => {
    if (tenant.isActive === false) {
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
    return 'bg-green-500/10 text-green-500 border-green-500/20';
  };

  const getStatusText = (tenant: Tenant) => {
    return tenant.isActive === false ? 'Inactive' : 'Active';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: tenant?.settings?.currency || 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading tenant...</div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Tenant Not Found</h2>
          <p className="text-muted-foreground mb-4">The tenant you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/tenants')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
          >
            Back to Tenants
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
    { id: 'statistics', name: 'Statistics', icon: '📊' },
    { id: 'users', name: 'Users', icon: '👥' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/tenants')}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏢</span>
              </div>
              <div>
                <h1 className="mobile-heading text-foreground">{tenant.name}</h1>
                <p className="text-muted-foreground mobile-text">
                  {tenant.slug} {tenant.domain && `• ${tenant.domain}`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(tenant)}`}>
              {getStatusText(tenant)}
            </span>
            <div className="flex items-center gap-2">
              {!editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                  >
                    Edit
                  </button>
                  <button
                    onClick={impersonateTenant}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50 btn-animate"
                  >
                    Impersonate
                  </button>
                  <button
                    onClick={deleteTenant}
                    disabled={saving}
                    className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 btn-animate"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                >
                  Cancel
                </button>
              )}
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
                {editMode ? (
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                        <input
                          type="text"
                          required
                          value={tenant.name}
                          onChange={(e) => setTenant(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Slug</label>
                        <input
                          type="text"
                          required
                          value={tenant.slug}
                          onChange={(e) => setTenant(prev => prev ? { ...prev, slug: e.target.value } : null)}
                          className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-2">Domain</label>
                        <input
                          type="text"
                          value={tenant.domain || ''}
                          onChange={(e) => setTenant(prev => prev ? { ...prev, domain: e.target.value } : null)}
                          className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                          placeholder="example.com"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-animate"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Basic Info */}
                    <div className="bg-accent/20 p-4 rounded-lg">
                      <h3 className="font-semibold text-foreground mb-3">Basic Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Name:</span>
                          <span className="text-foreground font-medium">{tenant.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Slug:</span>
                          <span className="text-foreground font-mono">{tenant.slug}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Domain:</span>
                          <span className="text-foreground">{tenant.domain || 'Not set'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tenant)}`}>
                            {getStatusText(tenant)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="bg-accent/20 p-4 rounded-lg">
                      <h3 className="font-semibold text-foreground mb-3">Statistics</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Users:</span>
                          <span className="text-foreground font-medium">{tenant.userCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Orders:</span>
                          <span className="text-foreground font-medium">{tenant.orderCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Revenue:</span>
                          <span className="text-foreground font-medium">
                            {tenant.totalRevenue ? formatCurrency(tenant.totalRevenue) : '$0.00'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-accent/20 p-4 rounded-lg">
                      <h3 className="font-semibold text-foreground mb-3">Timeline</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="text-foreground">
                            {new Date(tenant.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="text-foreground">
                            {new Date(tenant.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-foreground">Tenant Settings</h3>
                
                {tenant.settings && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-accent/20 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-3">Localization</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Timezone:</span>
                          <span className="text-foreground">{tenant.settings.timezone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Currency:</span>
                          <span className="text-foreground">{tenant.settings.currency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Language:</span>
                          <span className="text-foreground">{tenant.settings.language}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-accent/20 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-3">Appearance</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Theme:</span>
                          <span className="text-foreground capitalize">{tenant.settings.theme}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-accent/20 p-4 rounded-lg">
                      <h4 className="font-semibold text-foreground mb-3">Features</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Notifications:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tenant.settings.notifications 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-gray-500/10 text-gray-500'
                          }`}>
                            {tenant.settings.notifications ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Analytics:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tenant.settings.analytics 
                              ? 'bg-green-500/10 text-green-500' 
                              : 'bg-gray-500/10 text-gray-500'
                          }`}>
                            {tenant.settings.analytics ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Statistics Tab */}
            {activeTab === 'statistics' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-foreground">Tenant Statistics</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-accent/20 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-foreground mb-2">{tenant.userCount || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  
                  <div className="bg-accent/20 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-foreground mb-2">{tenant.orderCount || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Orders</div>
                  </div>
                  
                  <div className="bg-accent/20 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-foreground mb-2">
                      {tenant.totalRevenue ? formatCurrency(tenant.totalRevenue) : '$0.00'}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                  </div>
                  
                  <div className="bg-accent/20 p-6 rounded-lg text-center">
                    <div className="text-3xl font-bold text-foreground mb-2">
                      {tenant.orderCount && tenant.userCount ? 
                        Math.round(tenant.orderCount / tenant.userCount) : 0
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Orders/User</div>
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Tenant Users</h3>
                  <a
                    href={`/users?tenant=${tenant.id}`}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
                  >
                    View All Users
                  </a>
                </div>
                
                <div className="bg-accent/20 p-8 rounded-lg text-center">
                  <div className="text-4xl mb-4">👥</div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    {tenant.userCount || 0} Users
                  </h4>
                  <p className="text-muted-foreground mb-4">
                    This tenant has {tenant.userCount || 0} registered users
                  </p>
                  <a
                    href={`/users?tenant=${tenant.id}`}
                    className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                  >
                    Manage Users
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}