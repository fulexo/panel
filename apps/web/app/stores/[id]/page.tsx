"use client";

import { logger } from "@/lib/logger";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { Package, ClipboardList, Users } from 'lucide-react';
import { useStore, useUpdateStore, useDeleteStore, useSyncStore, useTestStoreConnection, useStoreStats, useStoreSyncLogs } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function StoreDetailPage() {
  const params = useParams();
  useAuth();
  useRBAC();
  const storeId = params['id'] as string;
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    url: "",
    consumerKey: "",
    consumerSecret: "",
    description: "",
  });

  const { 
    data: store, 
    isLoading,
    error
  } = useStore(storeId) as { data: { 
    id: string; 
    name: string; 
    url: string; 
    consumerKey: string; 
    consumerSecret: string; 
    description: string; 
    status: string; 
    lastSync: string; 
    createdAt: string; 
    updatedAt: string; 
    connectionStatus: string; 
    syncStatus: string; 
  } | undefined; isLoading: boolean; error: ApiError | null };

  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();
  const syncStore = useSyncStore();
  const testConnection = useTestStoreConnection();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading store details...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !store) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-500 text-lg">Error loading store</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Store not found'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const handleEdit = () => {
    setEditData({
      name: store.name,
      url: store.url,
      consumerKey: store.consumerKey,
      consumerSecret: store.consumerSecret,
      description: store.description,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    try {
      await updateStore.mutateAsync({
        id: storeId,
        data: editData
      });
      setShowEditModal(false);
    } catch (error) {
      logger.error('Failed to update store:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteStore.mutateAsync(storeId);
      // Redirect to stores list
      window.location.href = '/stores';
    } catch (error) {
      logger.error('Failed to delete store:', error);
    }
  };

  const handleSync = async () => {
    try {
      await syncStore.mutateAsync(storeId);
    } catch (error) {
      logger.error('Failed to sync store:', error);
    }
  };

  const handleTestConnection = async () => {
    try {
      await testConnection.mutateAsync(storeId);
    } catch (error) {
      logger.error('Failed to test connection:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'bg-green-100 text-green-800';
      case 'syncing': return 'bg-blue-100 text-blue-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get real store statistics from API
  const { data: storeStats } = useStoreStats(storeId);
  const { data: syncLogs } = useStoreSyncLogs(storeId);

  // Fallback data structure for display
  const displayStats = {
    totalProducts: (storeStats as any)?.totalProducts || 0,
    totalOrders: (storeStats as any)?.totalOrders || 0,
    totalCustomers: (storeStats as any)?.totalCustomers || 0,
    totalRevenue: (storeStats as any)?.totalRevenue || 0,
    lastSync: store.lastSync,
    syncFrequency: '15 minutes',
  };

  const displaySyncLogs = Array.isArray(syncLogs) ? syncLogs : [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">{store.name}</h1>
              <p className="text-muted-foreground mobile-text">
                Store details and management
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleTestConnection}
                className="btn btn-outline"
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? 'Testing...' : 'Test Connection'}
              </button>
              <button 
                onClick={handleSync}
                className="btn btn-outline"
                disabled={syncStore.isPending}
              >
                {syncStore.isPending ? 'Syncing...' : 'Sync Now'}
              </button>
              <ProtectedComponent permission="stores.manage">
                <button 
                  onClick={handleEdit}
                  className="btn btn-primary"
                >
                  Edit Store
                </button>
              </ProtectedComponent>
              <ProtectedComponent permission="stores.manage">
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-destructive"
                >
                  Delete
                </button>
              </ProtectedComponent>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Store Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Store Status */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Store Status</h3>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(store.status)}`}>
                      {store.status.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getConnectionStatusColor(store.connectionStatus)}`}>
                      {store.connectionStatus.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSyncStatusColor(store.syncStatus)}`}>
                      {store.syncStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Store URL</p>
                    <p className="font-medium text-blue-600">
                      <a href={store.url} target="_blank" rel="noopener noreferrer">
                        {store.url}
                      </a>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Sync</p>
                    <p className="font-medium">
                      {store.lastSync ? new Date(store.lastSync).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(store.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Updated</p>
                    <p className="font-medium">{new Date(store.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Store Description */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Store Description</h3>
                <p className="text-foreground">{store.description || 'No description available'}</p>
              </div>

              {/* API Configuration */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">API Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Consumer Key</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={store.consumerKey}
                        readOnly
                        className="form-input flex-1"
                      />
                      <button className="btn btn-sm btn-outline">Show</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Consumer Secret</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={store.consumerSecret}
                        readOnly
                        className="form-input flex-1"
                      />
                      <button className="btn btn-sm btn-outline">Show</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Logs */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Sync Logs</h3>
                <div className="space-y-3">
                  {displaySyncLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-lg">
                          {log.type === 'products' ? <Package className="w-5 h-5" /> : 
                           log.type === 'orders' ? <ClipboardList className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{log.type}</p>
                          <p className="text-sm text-muted-foreground">{log.timestamp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{log.count} items</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Store Statistics */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Store Statistics</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {displayStats.totalProducts}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Products</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Orders</span>
                      <span className="font-medium">{displayStats.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customers</span>
                      <span className="font-medium">{displayStats.totalCustomers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-medium">₺{displayStats.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Information */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Sync Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Sync</span>
                    <span className="font-medium">
                      {displayStats.lastSync ? new Date(displayStats.lastSync).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium">{displayStats.syncFrequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getSyncStatusColor(store.syncStatus)}`}>
                      {store.syncStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <ProtectedComponent permission="stores.manage">
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button 
                      onClick={handleSync}
                      className="btn btn-outline w-full"
                      disabled={syncStore.isPending}
                    >
                      {syncStore.isPending ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button 
                      onClick={handleTestConnection}
                      className="btn btn-outline w-full"
                      disabled={testConnection.isPending}
                    >
                      {testConnection.isPending ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button className="btn btn-outline w-full">View Products</button>
                    <button className="btn btn-outline w-full">View Orders</button>
                  </div>
                </div>
              </ProtectedComponent>

              {/* Store Health */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Store Health</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Connection</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        store.connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">{store.connectionStatus}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sync Status</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        store.syncStatus === 'synced' ? 'bg-green-500' : 
                        store.syncStatus === 'syncing' ? 'bg-blue-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium">{store.syncStatus}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Health</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium">Healthy</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Store Modal */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-foreground mb-4">Edit Store</h3>
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Store Name</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Store URL</label>
                    <input
                      type="url"
                      value={editData.url}
                      onChange={(e) => setEditData({...editData, url: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Consumer Key</label>
                    <input
                      type="text"
                      value={editData.consumerKey}
                      onChange={(e) => setEditData({...editData, consumerKey: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Consumer Secret</label>
                    <input
                      type="password"
                      value={editData.consumerSecret}
                      onChange={(e) => setEditData({...editData, consumerSecret: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Description</label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      className="form-textarea"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleUpdate}
                    className="btn btn-primary"
                  >
                    Update Store
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-md">
                <h3 className="text-lg font-semibold text-foreground mb-4">Delete Store</h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete "{store.name}"? This action cannot be undone and will remove all associated data.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="btn btn-destructive"
                  >
                    Delete Store
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
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
    </ProtectedRoute>
  );
}