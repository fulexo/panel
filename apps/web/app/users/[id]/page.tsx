"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000'}${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  const loadUser = async () => {
    const r = await api(`/users/${params.id}`);
    if (r.ok) {
      const data = await r.json();
      setUser(data);
    } else if (r.status === 401) {
      router.push('/login');
    }
  };

  const loadTenants = async () => {
    const r = await api('/tenants');
    if (r.ok) {
      const data = await r.json();
      setTenants(data?.data || []);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const r = await api(`/users/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          email: user.email,
          role: user.role,
          tenantId: user.tenantId
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

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
      const r = await api(`/users/${params.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword })
      });

      if (r.ok) {
        alert('Şifre başarıyla sıfırlandı');
      } else {
        const errorData = await r.json();
        alert('Hata: ' + errorData.message);
      }
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  useEffect(() => {
    if (currentUser && ['FULEXO_ADMIN', 'FULEXO_STAFF', 'CUSTOMER_ADMIN'].includes(currentUser.role)) {
      Promise.all([loadUser(), loadTenants()]).finally(() => setLoading(false));
    } else {
      router.push('/dashboard');
    }
  }, [currentUser, params.id]);

  const roleOptions = [
    { value: 'FULEXO_ADMIN', label: 'Fulexo Admin', disabled: currentUser?.role !== 'FULEXO_ADMIN' },
    { value: 'FULEXO_STAFF', label: 'Fulexo Staff', disabled: currentUser?.role !== 'FULEXO_ADMIN' },
    { value: 'CUSTOMER_ADMIN', label: 'Customer Admin', disabled: false },
    { value: 'CUSTOMER_USER', label: 'Customer User', disabled: false }
  ];

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
  if (!user) return <div className="min-h-screen bg-gray-900 text-white p-8">User not found</div>;

  const selectedTenant = tenants.find(t => t.id === user.tenantId);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <a
            href="/users"
            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded"
          >
            ← Back
          </a>
          <h1 className="text-3xl font-bold">User Details</h1>
          <div className="ml-auto flex gap-2">
            {!editMode ? (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Edit
                </button>
                {currentUser?.role === 'FULEXO_ADMIN' && (
                  <button
                    onClick={resetPassword}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded"
                  >
                    Reset Password
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => setEditMode(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6">
          {editMode ? (
            <form onSubmit={handleSave}>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={user.email}
                    onChange={(e) => setUser((prev: any) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select
                    value={user.role}
                    onChange={(e) => setUser((prev: any) => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
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

                <div>
                  <label className="block text-sm font-medium mb-2">Tenant</label>
                  <select
                    value={user.tenantId}
                    onChange={(e) => setUser((prev: any) => ({ ...prev, tenantId: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
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

              <div className="mt-6 flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">User Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <span className="ml-2">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Role:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      user.role === 'FULEXO_ADMIN' ? 'bg-red-600' :
                      user.role === 'FULEXO_STAFF' ? 'bg-orange-600' :
                      user.role === 'CUSTOMER_ADMIN' ? 'bg-blue-600' :
                      'bg-gray-600'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Tenant:</span>
                    <span className="ml-2">{selectedTenant?.name || 'Unknown'} ({selectedTenant?.slug})</span>
                  </div>
                  <div>
                    <span className="text-gray-400">2FA:</span>
                    <span className="ml-2">
                      {user.twofaEnabled ? (
                        <span className="text-green-400">✓ Enabled</span>
                      ) : (
                        <span className="text-gray-400">Disabled</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Activity</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Last Login:</span>
                    <span className="ml-2">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <span className="ml-2">{new Date(user.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Updated:</span>
                    <span className="ml-2">{new Date(user.updatedAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Failed Attempts:</span>
                    <span className="ml-2">{user.failedAttempts || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
