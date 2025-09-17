"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  settings?: any;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
  userCount?: number;
  orderCount?: number;
  totalRevenue?: number;
}

export default function TenantsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTenants, setTotalTenants] = useState(0);
  
  // Bulk operations
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Token is now handled by httpOnly cookies
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init
    });

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const t = null;
      if (!t) { 
        router.push('/login'); 
        return; 
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const r = await api(`/tenants?${params}`);
      if (!r.ok) {
        if (r.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch tenants');
      }
      
      const data = await r.json();
      setTenants(data?.data || []);
      setTotalPages(data?.totalPages || 1);
      setTotalTenants(data?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const impersonateTenant = async (tenantId: string) => {
    if (!confirm('Bu tenant\'ı taklit etmek istediğinizden emin misiniz?')) return;
    
    try {
      setSaving(true);
      setError(null);
      const r = await api(`/tenants/${tenantId}/impersonate`, { method: 'POST' });
      
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

  const deleteTenant = async (tenantId: string) => {
    if (!confirm('Bu tenant\'ı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    try {
      setSaving(true);
      setError(null);
      const r = await api(`/tenants/${tenantId}`, { method: 'DELETE' });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete tenant');
      }
      
      setSuccess('Tenant deleted successfully');
      await loadTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Seçilen ${selectedTenants.length} tenant\'ı silmek istediğinizden emin misiniz?`)) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const promises = selectedTenants.map(tenantId => 
        api(`/tenants/${tenantId}`, { method: 'DELETE' })
      );
      
      await Promise.all(promises);
      setSuccess(`${selectedTenants.length} tenants deleted successfully`);
      setSelectedTenants([]);
      setShowBulkActions(false);
      await loadTenants();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to delete tenants');
    } finally {
      setSaving(false);
    }
  };

  const toggleTenantSelection = (tenantId: string) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId) 
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const clearSelection = () => {
    setSelectedTenants([]);
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadTenants();
    } else {
      router.push('/dashboard');
    }
  }, [user, currentPage, search, statusFilter]);

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
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading tenants...</div>
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
            <h1 className="h1 text-primary">Tenant Management</h1>
            <p className="text-secondary mobile-text">
              Manage tenants, domains, and settings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              {totalTenants} tenants total
            </span>
            <a 
              href="/tenants/create"
              className="btn btn-primary btn-md btn-animate"
            >
              + Create Tenant
            </a>
          </div>
        </div>

        {/* Messages */}
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

        {success && (
          <div className="alert alert-success animate-slide-down">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card p-4 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tenants by name or slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedTenants.length > 0 && (
          <div className="bg-accent/20 p-4 rounded-lg border border-border animate-slide-down">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {selectedTenants.length} tenant(s) selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={bulkDelete}
                  disabled={saving}
                  className="px-3 py-1 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tenants List */}
        <div className="space-y-4 animate-slide-up">
          {tenants.length === 0 ? (
            <div className="bg-card p-8 rounded-lg border border-border text-center">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No tenants found</h3>
              <p className="text-muted-foreground">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating your first tenant'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tenants.map((tenant, index) => (
                <div
                  key={tenant.id}
                  className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 card-hover animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-4">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedTenants.includes(tenant.id)}
                      onChange={() => toggleTenantSelection(tenant.id)}
                      className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                    />

                    {/* Tenant Avatar */}
                    <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🏢</span>
                    </div>

                    {/* Tenant Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {tenant.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(tenant)}`}>
                          {getStatusText(tenant)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span>Slug: {tenant.slug}</span>
                        {tenant.domain && <span>Domain: {tenant.domain}</span>}
                        <span>
                          Created: {new Date(tenant.createdAt).toLocaleDateString()}
                        </span>
                        {tenant.userCount !== undefined && (
                          <span>Users: {tenant.userCount}</span>
                        )}
                        {tenant.orderCount !== undefined && (
                          <span>Orders: {tenant.orderCount}</span>
                        )}
                        {tenant.totalRevenue !== undefined && (
                          <span>Revenue: {formatCurrency(tenant.totalRevenue)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <a
                        href={`/tenants/${tenant.id}`}
                        className="px-3 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                      >
                        View
                      </a>
                      <button
                        onClick={() => impersonateTenant(tenant.id)}
                        disabled={saving}
                        className="px-3 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50 btn-animate"
                      >
                        Impersonate
                      </button>
                      <button
                        onClick={() => deleteTenant(tenant.id)}
                        disabled={saving}
                        className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 btn-animate"
                      >
                        Delete
                      </button>
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

