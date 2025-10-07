"use client";

import { logger } from "@/lib/logger";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useStores, useCreateStore, useDeleteStore, useSyncStore, useTestStoreConnection } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError, apiClient } from "@/lib/api-client";
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
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function StoresPage() {
  useAuth();
  const { isAdmin, isCustomer } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
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
  
  // Fetch stores data
  const { 
    data: storesData, 
    isLoading,
    error
  } = useStores({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  }) as { data: { data: Array<{ id: string; name: string; url: string; status: string; lastSync?: string; customer?: { email: string; firstName: string; lastName: string } }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: ApiError | null };

  const createStore = useCreateStore();
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
      logger.error('Failed to sync store:', error);
    }
  };

  const handleTestConnection = async (storeId: string) => {
    setTestingConnection(storeId);
    try {
      await testConnection.mutateAsync(storeId);
    } catch (error) {
      logger.error('Failed to test connection:', error);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleCreateStore = async () => {
    if (!createForm.name || !createForm.url || !createForm.customerEmail || !createForm.consumerKey || !createForm.consumerSecret) {
      window.alert('Please fill in all required fields.');
      return;
    }

    try {
      // First, find customer by email using apiClient
      const customersData = await apiClient.getCustomers({
        search: createForm.customerEmail,
        limit: 1
      });
      let customer = customersData.data?.find((c: any) => c.email === createForm.customerEmail);
      
      // If customer not found, create a new one
      if (!customer) {
        try {
          const newCustomer = await apiClient.createCustomer({
            firstName: createForm.customerEmail.split('@')[0], // Use email prefix as first name
            lastName: '',
            email: createForm.customerEmail,
            phone: '',
            company: '',
            addressLine1: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'TR'
          });
          customer = newCustomer;
        } catch (createError) {
          logger.error('Failed to create customer:', createError);
          window.alert('Failed to create customer. Please try again.');
          return;
        }
      }

      // Create store with customer ID
      await createStore.mutateAsync({
        name: createForm.name,
        url: createForm.url,
        customerId: customer.id,
        consumerKey: createForm.consumerKey,
        consumerSecret: createForm.consumerSecret
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

  const handleExportStores = () => {
    if (!storesData?.data || storesData.data.length === 0) {
      window.alert('No stores to export.');
      return;
    }
    
    const csvData = storesData.data.map((store: any) => ({
      Name: store.name || 'Unknown',
      URL: store.url || 'No URL',
      Status: store.status || 'Unknown',
      Customer: store.customer ? `${store.customer.firstName || ''} ${store.customer.lastName || ''}`.trim() || store.customer.email : 'No customer',
      LastSync: store.lastSync ? new Date(store.lastSync).toLocaleDateString() : 'Never',
      Created: store.createdAt ? new Date(store.createdAt).toLocaleDateString() : 'N/A'
    }));
    
    const csv = csvData.length > 0 && csvData[0] ? [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row || {}).join(','))
    ].join('\n') : 'No data to export';
    
    const blob = new window.Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stores-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkSync = async () => {
    if (!storesData?.data || storesData.data.length === 0) {
      window.alert('No stores to sync.');
      return;
    }

    const connectedStores = storesData.data.filter((store: any) => store.status === 'connected');
    
    if (connectedStores.length === 0) {
      window.alert('No connected stores to sync.');
      return;
    }

    if (!window.confirm(`Sync ${connectedStores.length} connected stores? This may take a few minutes.`)) {
      return;
    }

    try {
      const syncPromises = connectedStores.map((store: any) => 
        syncStore.mutateAsync(store.id).catch(error => {
          logger.error(`Failed to sync store ${store.name}:`, error);
          return { store: store.name, error: error.message };
        })
      );

      const results = await Promise.allSettled(syncPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      window.alert(`Bulk sync completed!\nSuccessful: ${successful}\nFailed: ${failed}`);
    } catch (error) {
      logger.error('Bulk sync failed:', error);
      window.alert('Bulk sync failed. Please try again.');
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
        <div className="bg-background">
          <main className="mobile-container py-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div className="space-y-1">
                <h1 className="mobile-heading text-foreground flex items-center gap-3">
                  <Building className="h-10 w-10 text-primary" />
                  {isAdmin() ? 'Stores Management' : 'My Stores'}
                </h1>
                <p className="text-muted-foreground mobile-text">
                  {isAdmin() 
                    ? 'Manage all customer stores and their WooCommerce connections'
                    : 'Manage your stores and WooCommerce connections'
                  }
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button 
                  onClick={handleExportStores}
                  className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16"
                >
                  <Download className="h-6 w-6" />
                  <span className="text-xs font-medium leading-tight">Export</span>
                </button>
                <button 
                  onClick={handleBulkSync}
                  className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16"
                >
                  <RefreshCw className="h-6 w-6" />
                  <span className="text-xs font-medium leading-tight">Bulk Sync</span>
                </button>
                {(isAdmin() || isCustomer()) && (
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="btn btn-primary btn-md flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16"
                  >
                    <Plus className="h-6 w-6" />
                    <span className="text-xs font-medium leading-tight">{isAdmin() ? 'Add Store' : 'Add My Store'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Enhanced Filters */}
            <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search stores by name, URL, or customer..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    />
                  </div>
                  <div className="relative w-full sm:w-auto sm:min-w-[160px]">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="">All Status</option>
                      <option value="connected">Connected</option>
                      <option value="disconnected">Disconnected</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-card/50 p-4 rounded-lg border border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Total Stores</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{totalStores}</div>
                <div className="text-xs text-muted-foreground">all stores</div>
              </div>

              <div className="bg-white dark:bg-card/50 p-4 rounded-lg border border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Connected</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{statusCounts['connected'] || 0}</div>
                <div className="text-xs text-muted-foreground">active connections</div>
              </div>

              <div className="bg-white dark:bg-card/50 p-4 rounded-lg border border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Disconnected</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{statusCounts['disconnected'] || 0}</div>
                <div className="text-xs text-muted-foreground">inactive connections</div>
              </div>

              <div className="bg-white dark:bg-card/50 p-4 rounded-lg border border-border/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Errors</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{statusCounts['error'] || 0}</div>
                <div className="text-xs text-muted-foreground">connection errors</div>
              </div>
            </div>

            {/* Error Stores Alert */}
            {errorStores.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-800 dark:text-red-200">Connection Errors ({errorStores.length})</h3>
                </div>
                <div className="space-y-2">
                  {errorStores.slice(0, 3).map((store: { id: string; name: string; url: string; status: string; lastSync?: string; customer?: { email: string; firstName: string; lastName: string } }) => (
                    <div key={store.id} className="flex justify-between items-center p-3 bg-white dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800/20">
                      <div>
                        <div className="font-medium text-red-800 dark:text-red-200">{store.name}</div>
                        <div className="text-sm text-red-600 dark:text-red-400">{store.url}</div>
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

            {/* Stores Table */}
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">All Stores</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={handleExportStores}
                    className="btn btn-outline btn-sm"
                  >
                    Export
                  </button>
                  <button 
                    onClick={handleBulkSync}
                    className="btn btn-outline btn-sm"
                  >
                    Bulk Sync
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[200px]">
                        Store
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[150px]">
                        URL
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[150px]">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[100px]">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[120px]">
                        Last Sync
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[200px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {stores.map((store: { id: string; name: string; url: string; status: string; lastSync?: string; customer?: { email: string; firstName: string; lastName: string } }) => (
                      <tr key={store.id} className="hover:bg-muted/20 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                                  {store.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  ID: {store.id.slice(0, 8)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a 
                            href={store.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm font-mono"
                          >
                            {store.url}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-foreground">{store.customer?.firstName} {store.customer?.lastName}</div>
                            <div className="text-xs text-muted-foreground">{store.customer?.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${
                            store.status === 'connected' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            store.status === 'disconnected' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            store.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
                          }`}>
                            {store.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-muted-foreground">
                            {store.lastSync ? new Date(store.lastSync).toLocaleDateString() : 'Never'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setEditingStore(store.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleTestConnection(store.id)}
                              disabled={testingConnection === store.id}
                              className="inline-flex items-center px-3 py-1.5 border border-border text-xs font-medium rounded-md text-foreground bg-background hover:bg-muted/50 dark:hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200"
                            >
                              <TestTube className="h-3 w-3 mr-1" />
                              {testingConnection === store.id ? 'Testing...' : 'Test'}
                            </button>
                            <button
                              onClick={() => handleSyncStore(store.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-800 bg-blue-100 hover:bg-blue-200 dark:text-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-background transition-all duration-200"
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Sync
                            </button>
                            <button
                              onClick={() => deleteStore.mutate(store.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 dark:text-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-background transition-all duration-200"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {stores.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Building className="h-16 w-16 text-muted-foreground/40 mb-4" />
                            <p className="text-lg font-medium text-muted-foreground mb-2">No stores found</p>
                            <p className="text-sm text-muted-foreground">
                              {search || statusFilter ? 
                                'Try adjusting your filters to see more stores.' :
                                'Get started by adding your first store.'
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
                  <div className="text-sm text-muted-foreground text-center sm:text-left">
                    Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalStores)} of {totalStores} stores
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="btn btn-outline btn-sm flex items-center gap-2 hover:bg-accent/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] h-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="text-xs font-medium">Prev</span>
                    </button>
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 min-w-[32px] h-8 ${
                              page === pageNum
                                ? 'bg-primary text-primary-foreground shadow-lg'
                                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="btn btn-outline btn-sm flex items-center gap-2 hover:bg-accent/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] h-8"
                    >
                      <span className="text-xs font-medium">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Create Store Modal */}
            {showCreateModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-card p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Plus className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">Create New Store</h3>
                        <p className="text-sm text-muted-foreground">Add a new store and connect it to WooCommerce</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Store Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter store name"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Store URL *</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder="https://example.com"
                        value={createForm.url}
                        onChange={(e) => setCreateForm({ ...createForm, url: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">Customer Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="customer@example.com"
                        value={createForm.customerEmail}
                        onChange={(e) => setCreateForm({ ...createForm, customerEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">WooCommerce Consumer Key *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter consumer key"
                        value={createForm.consumerKey}
                        onChange={(e) => setCreateForm({ ...createForm, consumerKey: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label">WooCommerce Consumer Secret *</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Enter consumer secret"
                        value={createForm.consumerSecret}
                        onChange={(e) => setCreateForm({ ...createForm, consumerSecret: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
                    <button 
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                    <button 
                      onClick={handleCreateStore}
                      disabled={createStore.isPending}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {createStore.isPending ? 'Creating...' : 'Create Store'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Store Modal */}
            {editingStore && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-card p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Edit className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">Edit Store</h3>
                        <p className="text-sm text-muted-foreground">Update store information and settings</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingStore(null)}
                      className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
                    >
                      <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </div>
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
                  <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
                    <button 
                      onClick={() => setEditingStore(null)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </button>
                    <button 
                      onClick={() => setEditingStore(null)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Update Store
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
