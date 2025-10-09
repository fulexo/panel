"use client";

import { logger } from "@/lib/logger";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useStores, useStore, useCreateStore, useUpdateStore, useDeleteStore, useSyncStore, useTestStoreConnection } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { SectionShell } from "@/components/patterns/SectionShell";
import { MetricCard } from "@/components/patterns/MetricCard";
import { StatusPill } from "@/components/patterns/StatusPill";
import type { StatusTone } from "@/components/patterns/StatusPill";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/FormField";
import { FormSelect } from "@/components/forms/FormSelect";
import { ApiError, apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  Building,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  TestTube,
  Edit,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Globe,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";

export default function StoresPage() {
  const { user } = useAuth();
  const { hasPermission } = useRBAC();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    url: '',
    customerEmail: '',
    consumerKey: '',
    consumerSecret: ''
  });
  const [editForm, setEditForm] = useState({
    name: '',
    url: '',
    consumerKey: '',
    consumerSecret: ''
  });

  const { data: storesData, isLoading, error, refetch } = useStores({
    search: searchTerm,
  });

  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();
  const syncStore = useSyncStore();
  const testConnection = useTestStoreConnection();

  // Fetch store data for editing
  const { data: storeData, isLoading: storeLoading } = useStore(editingStore || '');

  // Update edit form when store data is loaded
  useEffect(() => {
    if (storeData && editingStore) {
      setEditForm({
        name: (storeData as any).name || '',
        url: (storeData as any).url || '',
        consumerKey: (storeData as any).consumerKey || '',
        consumerSecret: (storeData as any).consumerSecret || ''
      });
    }
  }, [storeData, editingStore]);

  const handleCreateStore = async () => {
    if (!createForm.name || !createForm.url || !createForm.consumerKey || !createForm.consumerSecret) {
      window.alert('Please fill in all required fields.');
      return;
    }

    try {
      await createStore.mutateAsync({
        name: createForm.name,
        url: createForm.url,
        consumerKey: createForm.consumerKey,
        consumerSecret: createForm.consumerSecret,
        customerId: user?.id || 'default-customer-id'
      });
      
      // Reset form and close modal
      setCreateForm({
        name: '',
        url: '',
        customerEmail: '',
        consumerKey: '',
        consumerSecret: ''
      });
      setShowCreateModal(false);
      
      window.alert('Store created successfully!');
    } catch (error) {
      logger.error('Failed to create store:', error);
      window.alert('Failed to create store. Please try again.');
    }
  };

  const handleUpdateStore = async () => {
    if (!editingStore || !editForm.name || !editForm.url || !editForm.consumerKey || !editForm.consumerSecret) {
      window.alert('Please fill in all required fields.');
      return;
    }
    
    try {
      await updateStore.mutateAsync({
        id: editingStore,
        data: {
          name: editForm.name,
          url: editForm.url,
          consumerKey: editForm.consumerKey,
          consumerSecret: editForm.consumerSecret
        }
      });
      
      // Reset form and close modal
      setEditForm({
        name: '',
        url: '',
        consumerKey: '',
        consumerSecret: ''
      });
      setEditingStore(null);
      
      window.alert('Store updated successfully!');
    } catch (error) {
      logger.error('Failed to update store:', error);
      window.alert('Failed to update store. Please try again.');
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!window.confirm('Are you sure you want to delete this store?')) {
      return;
    }

    try {
      await deleteStore.mutateAsync(storeId);
      window.alert('Store deleted successfully!');
    } catch (error) {
      logger.error('Failed to delete store:', error);
      window.alert('Failed to delete store. Please try again.');
    }
  };

  const handleSyncStore = async (storeId: string) => {
    try {
      await syncStore.mutateAsync(storeId);
      window.alert('Store synced successfully!');
    } catch (error) {
      logger.error('Failed to sync store:', error);
      window.alert('Failed to sync store. Please try again.');
    }
  };

  const handleTestConnection = async (storeId: string) => {
    setTestingConnection(storeId);
    try {
      await testConnection.mutateAsync(storeId);
      window.alert('Connection test successful!');
    } catch (error) {
      logger.error('Connection test failed:', error);
      window.alert('Connection test failed. Please check your credentials.');
    } finally {
      setTestingConnection(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/stores/export?' + new URLSearchParams({
        search: searchTerm,
        status: statusFilter
      }));
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stores-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export stores:', error);
      window.alert('Failed to export stores. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { tone: StatusTone; icon: any }> = {
      connected: { tone: "success", icon: CheckCircle },
      disconnected: { tone: "destructive", icon: AlertCircle },
      syncing: { tone: "warning", icon: RefreshCw },
    };

    const config = statusConfig[status] || statusConfig.disconnected;
    const Icon = config.icon;

    return (
      <StatusPill label={status} tone={config.tone} icon={Icon} />
    );
  };

  if (!hasPermission('stores:read')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <ProtectedComponent 
        role="ADMIN" 
        fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
        }
      >
        <div className="space-y-6">
          {/* Header */}
          <SectionShell
            title="Stores Management"
            description="Manage your connected stores and their settings"
            actions={
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                {hasPermission('stores:create') && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Store
                  </Button>
                )}
              </div>
            }
          />

          {/* Filters */}
          <SectionShell>
                <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                      type="text"
                    placeholder="Search stores by name or URL..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
              </div>
              <div className="flex gap-2">
                <FormSelect
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: "", label: "All Status" },
                    { value: "connected", label: "Connected" },
                    { value: "disconnected", label: "Disconnected" },
                    { value: "syncing", label: "Syncing" },
                  ]}
                  className="min-w-[140px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                  </div>
                </div>
          </SectionShell>

          {/* Stats */}
          {storesData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Stores"
                value={storesData.pagination?.total || 0}
                icon={Building}
                trend={null}
              />
              <MetricCard
                title="Connected"
                value={storesData.data?.filter(store => store.status === 'connected').length || 0}
                icon={CheckCircle}
                trend={null}
              />
              <MetricCard
                title="Disconnected"
                value={storesData.data?.filter(store => store.status === 'disconnected').length || 0}
                icon={AlertCircle}
                trend={null}
              />
              <MetricCard
                title="Syncing"
                value={storesData.data?.filter(store => store.status === 'syncing').length || 0}
                icon={RefreshCw}
                trend={null}
              />
              </div>
            )}

            {/* Stores Table */}
          <SectionShell title="Stores">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="spinner"></div>
                    <div className="text-lg text-foreground">Loading stores...</div>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Stores</h3>
                    <p className="text-muted-foreground mb-4">There was an error loading the stores data.</p>
                    <Button
                      onClick={() => refetch()}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                </div>
              ) : !storesData?.data || storesData.data.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Stores Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || statusFilter
                        ? "No stores match your current filters."
                        : "You haven't added any stores yet."}
                    </p>
                    {hasPermission('stores:create') && (
                      <Button
                        onClick={() => setShowCreateModal(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Store
                      </Button>
                    )}
                </div>
              </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Store
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        URL
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Last Sync
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {storesData.data.map((store) => (
                      <tr key={store.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building className="h-5 w-5 text-primary" />
                              </div>
                              </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-foreground">{store.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {store.customer?.email || 'No customer assigned'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Globe className="w-4 h-4 text-muted-foreground mr-2" />
                          <a 
                            href={store.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                              className="text-sm text-primary hover:text-primary/80 flex items-center"
                          >
                            {store.url}
                              <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(store.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {store.lastSyncAt
                            ? new Date(store.lastSyncAt).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestConnection(store.id)}
                              disabled={testingConnection === store.id}
                            >
                              <TestTube className="w-3 h-3 mr-1" />
                              {testingConnection === store.id ? 'Testing...' : 'Test'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncStore(store.id)}
                              disabled={syncStore.isPending}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Sync
                            </Button>
                            {hasPermission('stores:update') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingStore(store.id)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            )}
                            {hasPermission('stores:delete') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteStore(store.id)}
                                className="text-red-700 border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                              Delete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </SectionShell>

            {/* Create Store Modal */}
            {showCreateModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <h3 className="text-lg font-semibold text-foreground">Add New Store</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                      onClick={() => setShowCreateModal(false)}
                    >
                    <X className="w-5 h-5" />
                  </Button>
                  </div>
                <div className="p-6 space-y-4">
                  <FormField
                    label="Store Name"
                    required
                        type="text"
                        placeholder="Enter store name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      />
                  <FormField
                    label="Store URL"
                    required
                        type="url"
                        placeholder="https://example.com"
                        value={createForm.url}
                        onChange={(e) => setCreateForm({ ...createForm, url: e.target.value })}
                      />
                  <FormField
                    label="Customer Email"
                        type="email"
                        placeholder="customer@example.com"
                        value={createForm.customerEmail}
                        onChange={(e) => setCreateForm({ ...createForm, customerEmail: e.target.value })}
                      />
                  <FormField
                    label="WooCommerce Consumer Key"
                    required
                        type="text"
                        placeholder="Enter consumer key"
                        value={createForm.consumerKey}
                        onChange={(e) => setCreateForm({ ...createForm, consumerKey: e.target.value })}
                      />
                  <FormField
                    label="WooCommerce Consumer Secret"
                    required
                        type="password"
                        placeholder="Enter consumer secret"
                        value={createForm.consumerSecret}
                        onChange={(e) => setCreateForm({ ...createForm, consumerSecret: e.target.value })}
                      />
                    </div>
                <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-border">
                  <Button
                    variant="outline"
                      onClick={() => setShowCreateModal(false)}
                    className="flex-1 sm:flex-none"
                    >
                      Cancel
                  </Button>
                  <Button
                      onClick={handleCreateStore}
                      disabled={createStore.isPending}
                    className="flex-1 sm:flex-none"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {createStore.isPending ? 'Creating...' : 'Create Store'}
                  </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Store Modal */}
            {editingStore && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-background rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <h3 className="text-lg font-semibold text-foreground">Edit Store</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingStore(null)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                      </div>
                {storeLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="spinner"></div>
                      <div className="text-lg text-foreground">Loading store data...</div>
                      </div>
                    </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-6 space-y-4">
                      <FormField
                        label="Store Name"
                        required
                        type="text"
                        placeholder="Enter store name"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                      <FormField
                        label="Store URL"
                        required
                        type="url"
                        placeholder="https://example.com"
                        value={editForm.url}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                      />
                      <FormField
                        label="WooCommerce Consumer Key"
                        required
                        type="text"
                        placeholder="Enter consumer key"
                        value={editForm.consumerKey}
                        onChange={(e) => setEditForm({ ...editForm, consumerKey: e.target.value })}
                      />
                      <FormField
                        label="WooCommerce Consumer Secret"
                        required
                        type="password"
                        placeholder="Enter consumer secret"
                        value={editForm.consumerSecret}
                        onChange={(e) => setEditForm({ ...editForm, consumerSecret: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-border">
                      <Button
                        variant="outline"
                      onClick={() => setEditingStore(null)}
                        className="flex-1 sm:flex-none"
                    >
                      Cancel
                      </Button>
                      <Button 
                        onClick={handleUpdateStore}
                        disabled={updateStore.isPending || storeLoading}
                        className="flex-1 sm:flex-none"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                        {updateStore.isPending ? 'Updating...' : 'Update Store'}
                      </Button>
                </div>
              </div>
            )}
              </div>
            </div>
          )}
        </div>
      </ProtectedComponent>
    </ProtectedRoute>
  );
}