"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";

export default function CreateUserPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'CUSTOMER',
    tenantId: ''
  });
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  const loadTenants = async () => {
    const r = await api('/tenants');
    if (r.ok) {
      const data = await r.json();
      setTenants(data?.data || []);
      if (data?.data?.length > 0) {
        setFormData(prev => ({ ...prev, tenantId: data.data[0].id }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const r = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      router.push('/users');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      loadTenants();
    } else {
      router.push('/dashboard');
    }
  }, [user]);

  const roleOptions = [
    { value: 'ADMIN', label: 'Admin', disabled: user?.role !== 'ADMIN' },
    { value: 'CUSTOMER', label: 'Customer', disabled: false }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <a
            href="/users"
            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded"
          >
            ← Back
          </a>
          <h1 className="text-3xl font-bold">Create New User</h1>
        </div>

        {error && (
          <div className="bg-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                placeholder="Minimum 8 characters"
              />
              <p className="text-sm text-gray-400 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
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
                value={formData.tenantId}
                onChange={(e) => setFormData(prev => ({ ...prev, tenantId: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                required
              >
                <option value="">Select a tenant</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
              <a
                href="/users"
                className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
              >
                Cancel
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
