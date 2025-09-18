"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useStores, useDeleteStore, useSyncStore, useTestStoreConnection } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function StoresPage() {
  const { } = useAuth();
  const { } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  
  // Fetch stores data
  const { 
    data: storesData, 
    isLoading,
    error
  } = useStores({
    page,
    limit: 10,
    ...(search ? { search } : {}),
  }) as { data: { data: Array<{ id: string; name: string; url: string; status: string; lastSync?: string; customer?: { email: string; firstName: string; lastName: string } }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: ApiError | null };

  const deleteStore = useDeleteStore();
  const syncStore = useSyncStore();
  const testConnection = useTestStoreConnection();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading stores...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-500 text-lg">Error loading stores</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const stores = storesData?.data || [];
  const totalStores = storesData?.pagination?.total || 0;
  const totalPages = storesData?.pagination?.pages || 1;

  // Calculate statistics
  const statusCounts = stores.reduce((acc: Record<string, number>, store: { id: string; name: string; url: string; status: string; lastSync?: string; customer?: { email: string; firstName: string; lastName: string } }) => {
    acc[store.status] = (acc[store.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const errorStores = stores.filter((store: { id: string; name: string; url: string; status: string; lastSync?: string; customer?: { email: string; firstName: string; lastName: string } }) => store.status === 'error');

  const handleSyncStore = async (storeId: string) => {
    try {
      await syncStore.mutateAsync(storeId);
    } catch (error) {
      console.error('Failed to sync store:', error);
    }
  };

  const handleTestConnection = async (storeId: string) => {
    setTestingConnection(storeId);
    try {
      await testConnection.mutateAsync(storeId);
    } catch (error) {
      console.error('Failed to test connection:', error);
    } finally {
      setTestingConnection(null);
    }
  };

  return (
    <ProtectedRoute>
      <ProtectedComponent role="ADMIN" fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      }>
        <div className="min-h-screen bg-background">
          <main className="mobile-container py-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="mobile-heading text-foreground">Stores Management</h1>
                <p className="text-muted-foreground mobile-text">
                  Manage all customer stores and their WooCommerce connections
                </p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Add Store
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search stores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2">Total Stores</h3>
                <div className="text-3xl font-bold text-primary">
                  {totalStores}
                </div>
                <p className="text-sm text-muted-foreground">All stores</p>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2">Connected</h3>
                <div className="text-3xl font-bold text-green-600">
                  {statusCounts['connected'] || 0}
                </div>
                <p className="text-sm text-muted-foreground">Active connections</p>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2">Disconnected</h3>
                <div className="text-3xl font-bold text-yellow-600">
                  {statusCounts['disconnected'] || 0}
                </div>
                <p className="text-sm text-muted-foreground">Inactive connections</p>
              </div>

              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-2">Errors</h3>
                <div className="text-3xl font-bold text-red-600">
                  {statusCounts['error'] || 0}
                </div>
                <p className="text-sm text-muted-foreground">Connection errors</p>
              </div>
            </div>

            {/* Error Stores Alert */}
            {errorStores.length > 0 && (
              <div className="bg-card p-6 rounded-lg border border-red-200">
                <h3 className="text-lg font-semibold text-red-800 mb-4">Connection Errors ({errorStores.length})</h3>
                <div className="space-y-3">
                  {errorStores.slice(0, 5).map((store: { id: string; name: string; url: string; status: string; lastSync?: string; customer?: { email: string; firstName: string; lastName: string } }) => (
                    <div key={store.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <div>
                        <div className="font-medium text-red-800">{store.name}</div>
                        <div className="text-sm text-red-600">{store.url}</div>
                        <div className="text-sm text-red-600">Customer: {store.customer?.firstName} {store.customer?.lastName}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTestConnection(store.id)}
                          disabled={testingConnection === store.id}
                          className="btn btn-sm btn-outline"
                        >
                          {testingConnection === store.id ? 'Testing...' : 'Test'}
                        </button>
                        <button
                          onClick={() => handleSyncStore(store.id)}
                          className="btn btn-sm btn-primary"
                        >
                          Sync
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card p-6 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">All Stores</h3>
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm">Export</button>
                  <button className="btn btn-outline btn-sm">Bulk Sync</button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3">Store</th>
                      <th className="text-left p-3">URL</th>
                      <th className="text-left p-3">Customer</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Last Sync</th>
                      <th className="text-left p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store: { id: string; name: string; url: string; status: string; lastSync?: string; customer?: { email: string; firstName: string; lastName: string } }) => (
                      <tr key={store.id} className="border-b border-border">
                        <td className="p-3">
                          <div className="font-medium">{store.name}</div>
                          <div className="text-sm text-muted-foreground">ID: {store.id.slice(0, 8)}</div>
                        </td>
                        <td className="p-3">
                          <a 
                            href={store.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {store.url}
                          </a>
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{store.customer?.firstName} {store.customer?.lastName}</div>
                            <div className="text-sm text-muted-foreground">{store.customer?.email}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-sm ${
                            store.status === 'connected' ? 'bg-green-100 text-green-800' :
                            store.status === 'disconnected' ? 'bg-yellow-100 text-yellow-800' :
                            store.status === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {store.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-muted-foreground">
                            {store.lastSync ? new Date(store.lastSync).toLocaleDateString() : 'Never'}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setEditingStore(store.id)}
                              className="btn btn-sm btn-outline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleTestConnection(store.id)}
                              disabled={testingConnection === store.id}
                              className="btn btn-sm btn-outline"
                            >
                              {testingConnection === store.id ? 'Testing...' : 'Test'}
                            </button>
                            <button
                              onClick={() => handleSyncStore(store.id)}
                              className="btn btn-sm btn-primary"
                            >
                              Sync
                            </button>
                            <button
                              onClick={() => deleteStore.mutate(store.id)}
                              className="btn btn-sm btn-destructive"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {stores.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No stores found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-outline btn-sm"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-outline btn-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Create Store Modal */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card p-6 rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Add Store</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Store Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter store name"
                      />
                    </div>
                    <div>
                      <label className="form-label">Store URL</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label className="form-label">Customer Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="customer@example.com"
                      />
                    </div>
                    <div>
                      <label className="form-label">WooCommerce Consumer Key</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter consumer key"
                      />
                    </div>
                    <div>
                      <label className="form-label">WooCommerce Consumer Secret</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Enter consumer secret"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button className="btn btn-primary">Add Store</button>
                    <button 
                      onClick={() => setShowCreateModal(false)}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Store Modal */}
            {editingStore && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card p-6 rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Edit Store</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Store Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter store name"
                      />
                    </div>
                    <div>
                      <label className="form-label">Store URL</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label className="form-label">WooCommerce Consumer Key</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter consumer key"
                      />
                    </div>
                    <div>
                      <label className="form-label">WooCommerce Consumer Secret</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Enter consumer secret"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button className="btn btn-primary">Update Store</button>
                    <button 
                      onClick={() => setEditingStore(null)}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </ProtectedComponent>
    </ProtectedRoute>
  );
}
