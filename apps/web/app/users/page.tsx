"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const token = () => localStorage.getItem('access_token');
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      ...init
    });

  const loadUsers = async () => {
    const t = token();
    if (!t) { router.push('/login'); return; }
    
    const r = await api('/users');
    if (!r.ok) {
      if (r.status === 401) router.push('/login');
      return;
    }
    const data = await r.json();
    setUsers(data?.data || []);
  };

  const loadTenants = async () => {
    const r = await api('/tenants');
    if (r.ok) {
      const data = await r.json();
      setTenants(data?.data || []);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    
    const r = await api(`/users/${userId}`, { method: 'DELETE' });
    if (r.ok) {
      await loadUsers();
    }
  };

  useEffect(() => {
    if (user && ['FULEXO_ADMIN', 'FULEXO_STAFF', 'CUSTOMER_ADMIN'].includes(user.role)) {
      Promise.all([loadUsers(), loadTenants()]).finally(() => setLoading(false));
    } else {
      router.push('/dashboard');
    }
  }, [user]);

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">User Management</h1>
          <a 
            href="/users/create"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
          >
            Create User
          </a>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search users by email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          />
        </div>

        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Tenant</th>
                <th className="px-6 py-3 text-left">2FA</th>
                <th className="px-6 py-3 text-left">Last Login</th>
                <th className="px-6 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const tenant = tenants.find(t => t.id === u.tenantId);
                return (
                  <tr key={u.id} className="border-t border-gray-700">
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        u.role === 'FULEXO_ADMIN' ? 'bg-red-600' :
                        u.role === 'FULEXO_STAFF' ? 'bg-orange-600' :
                        u.role === 'CUSTOMER_ADMIN' ? 'bg-blue-600' :
                        'bg-gray-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">{tenant?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      {u.twofaEnabled ? (
                        <span className="text-green-400">✓ Enabled</span>
                      ) : (
                        <span className="text-gray-400">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <a
                          href={`/users/${u.id}`}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                        >
                          Edit
                        </a>
                        {user?.role === 'FULEXO_ADMIN' && (
                          <button
                            onClick={() => deleteUser(u.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No users found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
