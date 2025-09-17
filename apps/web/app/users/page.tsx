"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

interface User {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  twofaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  failedAttempts?: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Bulk operations
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Token is now handled by httpOnly cookies
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init
    });

  const loadUsers = async () => {
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
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(tenantFilter !== 'all' && { tenantId: tenantFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const r = await api(`/users?${params}`);
      if (!r.ok) {
        if (r.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch users');
      }
      
      const data = await r.json();
      setUsers(data?.data || []);
      setTotalPages(data?.totalPages || 1);
      setTotalUsers(data?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadTenants = async () => {
    try {
      const r = await api('/tenants');
      if (r.ok) {
        const data = await r.json();
        setTenants(data?.data || []);
      }
    } catch (err) {
      // Failed to load tenants
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    
    try {
      setSaving(true);
      setError(null);
      const r = await api(`/users/${userId}`, { method: 'DELETE' });
      if (!r.ok) {
        throw new Error('Failed to delete user');
      }
      setSuccess('User deleted successfully');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = async () => {
    if (!confirm(`Seçilen ${selectedUsers.length} kullanıcıyı silmek istediğinizden emin misiniz?`)) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const promises = selectedUsers.map(userId => 
        api(`/users/${userId}`, { method: 'DELETE' })
      );
      
      await Promise.all(promises);
      setSuccess(`${selectedUsers.length} users deleted successfully`);
      setSelectedUsers([]);
      setShowBulkActions(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete users');
    } finally {
      setSaving(false);
    }
  };

  const bulkUpdateRole = async (newRole: string) => {
    if (!confirm(`Seçilen ${selectedUsers.length} kullanıcının rolünü ${newRole} olarak değiştirmek istediğinizden emin misiniz?`)) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const promises = selectedUsers.map(userId => 
        api(`/users/${userId}`, { 
          method: 'PUT',
          body: JSON.stringify({ role: newRole })
        })
      );
      
      await Promise.all(promises);
      setSuccess(`${selectedUsers.length} users updated successfully`);
      setSelectedUsers([]);
      setShowBulkActions(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update users');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(u => u.id));
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      Promise.all([loadUsers(), loadTenants()]);
    } else {
      router.push('/dashboard');
    }
  }, [user, currentPage, search, roleFilter, tenantFilter, statusFilter]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'badge-error';
      case 'CUSTOMER': return 'badge-primary';
      default: return 'badge-default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return '👑';
      case 'CUSTOMER': return '👤';
      default: return '❓';
    }
  };

  const getStatusColor = (user: User) => {
    if (user.failedAttempts && user.failedAttempts >= 5) {
      return 'badge-error';
    }
    if (user.lastLoginAt) {
      const lastLogin = new Date(user.lastLoginAt);
      const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLogin > 30) {
        return 'badge-warning';
      }
      return 'badge-success';
    }
    return 'badge-default';
  };

  const getStatusText = (user: User) => {
    if (user.failedAttempts && user.failedAttempts >= 5) {
      return 'Locked';
    }
    if (user.lastLoginAt) {
      const lastLogin = new Date(user.lastLoginAt);
      const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLogin > 30) {
        return 'Inactive';
      }
      return 'Active';
    }
    return 'Never Logged In';
  };

  if (loading) {
    return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading users...</div>
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
            <h1 className="h1 text-primary">User Management</h1>
            <p className="text-secondary mobile-text">
              Manage users, roles, and permissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              {totalUsers} users total
            </span>
            <a 
              href="/users/create"
              className="btn btn-primary btn-md btn-animate"
            >
              + Create User
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users by email or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="CUSTOMER">Customer</option>
              </select>
            </div>

            {/* Tenant Filter */}
            <div>
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Tenants</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="bg-accent/20 p-4 rounded-lg border border-border animate-slide-down">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {selectedUsers.length} user(s) selected
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
                  onClick={() => bulkUpdateRole('CUSTOMER')}
                  disabled={saving}
                  className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  Make Customer
                </button>
                <button
                  onClick={() => bulkUpdateRole('ADMIN')}
                  disabled={saving}
                  className="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  Make Admin
                </button>
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

        {/* Users List */}
        <div className="space-y-4 animate-slide-up">
          {users.length === 0 ? (
            <div className="bg-card p-8 rounded-lg border border-border text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {search || roleFilter !== 'all' || tenantFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by creating your first user'
                }
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {users.map((user, index) => {
                const tenant = tenants.find(t => t.id === user.tenantId);
                return (
                  <div
                    key={user.id}
                    className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 card-hover animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Selection Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                      />

                      {/* User Avatar */}
                      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                        <span className="text-xl">{getRoleIcon(user.role)}</span>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {user.email}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(user)}`}>
                            {getStatusText(user)}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>Tenant: {tenant?.name || 'Unknown'}</span>
                          <span>2FA: {user.twofaEnabled ? '✓ Enabled' : 'Disabled'}</span>
                          <span>
                            Last Login: {user.lastLoginAt 
                              ? new Date(user.lastLoginAt).toLocaleDateString()
                              : 'Never'
                            }
                          </span>
                          {user.failedAttempts && user.failedAttempts > 0 && (
                            <span className="text-red-500">
                              Failed: {user.failedAttempts}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <a
                          href={`/users/${user.id}`}
                          className="px-3 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
                        >
                          Edit
                        </a>
                        <button
                          onClick={() => deleteUser(user.id)}
                          disabled={saving}
                          className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 btn-animate"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
