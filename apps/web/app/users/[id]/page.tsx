"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";
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

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
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

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await api(`/users/${params.id}`);
      if (r.ok) {
        const data = await r.json();
        setUser(data);
      } else if (r.status === 401) {
        router.push('/login');
      } else {
        throw new Error('Failed to load user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const r = await api(`/users/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          email: user?.email,
          role: user?.role,
          tenantId: user?.tenantId
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      setSuccess('User updated successfully');
      setEditMode(false);
      await loadUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetPassword = async () => {
    if (!confirm('Bu kullanıcının şifresini sıfırlamak istediğinizden emin misiniz?')) return;
    
    const newPassword = prompt('Yeni şifre (min 8 karakter):');
    if (!newPassword || newPassword.length < 8) return;

    try {
      setSaving(true);
      setError('');
      const r = await api(`/users/${params.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword })
      });

      if (r.ok) {
        setSuccess('Password reset successfully');
      } else {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async () => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    try {
      setSaving(true);
      setError('');
      const r = await api(`/users/${params.id}`, { method: 'DELETE' });
      
      if (r.ok) {
        setSuccess('User deleted successfully. Redirecting...');
        setTimeout(() => {
          router.push('/users');
        }, 1500);
      } else {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete user');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'ADMIN') {
      Promise.all([loadUser(), loadTenants()]);
    } else {
      router.push('/dashboard');
    }
  }, [currentUser, params.id]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'CUSTOMER': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
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
      return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
    if (user.lastLoginAt) {
      const lastLogin = new Date(user.lastLoginAt);
      const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLogin > 30) {
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      }
      return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
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
          <div className="text-lg text-foreground">Loading user...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-4">The user you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/users')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  const selectedTenant = tenants.find(t => t.id === user.tenantId);
  const roleOptions = [
    { value: 'ADMIN', label: 'Admin', description: 'Full system access', disabled: currentUser?.role !== 'ADMIN' },
    { value: 'CUSTOMER', label: 'Customer', description: 'Limited access to own data', disabled: false }
  ];

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'activity', name: 'Activity', icon: '📊' },
    { id: 'security', name: 'Security', icon: '🔒' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/users')}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                <span className="text-2xl">{getRoleIcon(user.role)}</span>
              </div>
              <div>
                <h1 className="mobile-heading text-foreground">{user.email}</h1>
                <p className="text-muted-foreground mobile-text">
                  {selectedTenant?.name || 'Unknown Tenant'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(user.role)}`}>
              {user.role}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(user)}`}>
              {getStatusText(user)}
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
                  {currentUser?.role === 'ADMIN' && (
                    <button
                      onClick={resetPassword}
                      disabled={saving}
                      className="px-4 py-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors disabled:opacity-50 btn-animate"
                    >
                      Reset Password
                    </button>
                  )}
                  {currentUser?.role === 'ADMIN' && (
                    <button
                      onClick={deleteUser}
                      disabled={saving}
                      className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 btn-animate"
                    >
                      Delete
                    </button>
                  )}
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
                        <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                        <input
                          type="email"
                          required
                          value={user.email}
                          onChange={(e) => setUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                          className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                        <select
                          value={user.role}
                          onChange={(e) => setUser(prev => prev ? { ...prev, role: e.target.value } : null)}
                          className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                        >
                          {roleOptions.map(option => (
                            <option 
                              key={option.value} 
                              value={option.value}
                              disabled={option.disabled}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-2">Tenant</label>
                        <select
                          value={user.tenantId}
                          onChange={(e) => setUser(prev => prev ? { ...prev, tenantId: e.target.value } : null)}
                          className="w-full px-4 py-3 bg-input border border-border rounded-lg form-input text-foreground"
                          required
                        >
                          {tenants.map(tenant => (
                            <option key={tenant.id} value={tenant.id}>
                              {tenant.name} ({tenant.slug})
                            </option>
                          ))}
                        </select>
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
                    {/* User Info */}
                    <div className="bg-accent/20 p-4 rounded-lg">
                      <h3 className="font-semibold text-foreground mb-3">User Information</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="text-foreground font-mono">{user.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Role:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tenant:</span>
                          <span className="text-foreground">{selectedTenant?.name || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">2FA:</span>
                          <span className="text-foreground">
                            {user.twofaEnabled ? '✓ Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Info */}
                    <div className="bg-accent/20 p-4 rounded-lg">
                      <h3 className="font-semibold text-foreground mb-3">Status</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(user)}`}>
                            {getStatusText(user)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Login:</span>
                          <span className="text-foreground">
                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Failed Attempts:</span>
                          <span className="text-foreground">{user.failedAttempts || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="bg-accent/20 p-4 rounded-lg">
                      <h3 className="font-semibold text-foreground mb-3">Timeline</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="text-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="text-foreground">
                            {new Date(user.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-foreground">User Activity</h3>
                
                <div className="space-y-4">
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div>
                        <div className="font-medium text-foreground">Account Created</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {user.lastLoginAt && (
                    <div className="bg-accent/20 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-foreground">Last Login</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(user.lastLoginAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-accent/20 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-foreground">Account Updated</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(user.updatedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {user.failedAttempts && user.failedAttempts > 0 && (
                    <div className="bg-accent/20 p-4 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-foreground">Failed Login Attempts</div>
                          <div className="text-sm text-muted-foreground">
                            {user.failedAttempts} failed attempts
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-3">Authentication</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">2FA Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          user.twofaEnabled 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                        }`}>
                          {user.twofaEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Failed Attempts:</span>
                        <span className="text-foreground font-medium">{user.failedAttempts || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-3">Account Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(user)}`}>
                          {getStatusText(user)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Activity:</span>
                        <span className="text-foreground font-medium">
                          {user.lastLoginAt 
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {currentUser?.role === 'ADMIN' && (
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-foreground mb-3">Admin Actions</h4>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={resetPassword}
                        disabled={saving}
                        className="px-4 py-2 bg-orange-500/10 text-orange-500 rounded-lg hover:bg-orange-500/20 transition-colors disabled:opacity-50 btn-animate"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={deleteUser}
                        disabled={saving}
                        className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 btn-animate"
                      >
                        Delete User
                      </button>
                    </div>
                  </div>
                )}
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
