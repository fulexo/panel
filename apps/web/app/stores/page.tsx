'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRBAC } from '@/hooks/useRBAC';
import { useStores, useStore, useCreateStore, useUpdateStore, useDeleteStore, useSyncStore, useTestStoreConnection } from '@/hooks/useApi';
import ProtectedRoute from '@/components/ProtectedRoute';
import ProtectedComponent from '@/components/ProtectedComponent';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/patterns/MetricCard';
import { StatusPill } from '@/components/patterns/StatusPill';
import type { StatusTone } from '@/components/patterns/StatusPill';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';
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
  Globe,
  Key,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function StoresPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const adminView = isAdmin();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    consumerKey: '',
    consumerSecret: '',
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // API hooks
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();
  const syncStore = useSyncStore();
  const testConnection = useTestStoreConnection();

  // Fetch stores data
  const {
    data: storesData,
    isLoading,
    error,
    refetch: refetchStores,
  } = useStores({
    search,
    ...(statusFilter ? { status: statusFilter } : {}),
  }) as {
    data:
      | {
          data: Array<any>;
          pagination: { total: number; pages: number };
        }
      | undefined;
    isLoading: boolean;
    error: ApiError | null;
    refetch: () => Promise<unknown>;
  };

  // Fetch store data for editing
  const { data: storeData, isLoading: storeLoading } = useStore(editingStore || '');

  // Update form when store data is loaded
  useEffect(() => {
    if (storeData && editingStore) {
      setFormData({
        name: (storeData as any).name || '',
        url: (storeData as any).url || '',
        consumerKey: (storeData as any).consumerKey || '',
        consumerSecret: (storeData as any).consumerSecret || '',
      });
    }
  }, [storeData, editingStore]);

  // Form handlers
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev: any) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) errors['name'] = 'Store name is required';
    if (!formData.url.trim()) errors['url'] = 'Store URL is required';
    if (!formData.consumerKey.trim()) errors['consumerKey'] = 'Consumer key is required';
    if (!formData.consumerSecret.trim()) errors['consumerSecret'] = 'Consumer secret is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      consumerKey: '',
      consumerSecret: '',
    });
    setFormErrors({});
  };

  const handleCreateStore = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);

    try {
      await createStore.mutateAsync({
        name: formData.name,
        url: formData.url,
        consumerKey: formData.consumerKey,
        consumerSecret: formData.consumerSecret,
        customerId: user?.id || 'default-customer-id'
      });
      
      setSuccess('Store created successfully!');
      setShowCreateModal(false);
      resetForm();
      refetchStores();
    } catch (error: any) {
      console.error('Failed to create store:', error);
      setErrorMessage(error?.message || 'Failed to create store. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStore = async () => {
    if (!editingStore || !validateForm()) return;
    
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);
    
    try {
      await updateStore.mutateAsync({
        id: editingStore,
        data: {
          name: formData.name,
          url: formData.url,
          consumerKey: formData.consumerKey,
          consumerSecret: formData.consumerSecret,
        }
      });
      
      setSuccess('Store updated successfully!');
      setEditingStore(null);
      resetForm();
      refetchStores();
    } catch (error: any) {
      console.error('Failed to update store:', error);
      setErrorMessage(error?.message || 'Failed to update store. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (window.confirm('Are you sure you want to delete this store?')) {
      try {
        await deleteStore.mutateAsync(storeId);
        setSuccess('Store deleted successfully!');
        refetchStores();
      } catch (error: any) {
        console.error('Failed to delete store:', error);
        setErrorMessage(error?.message || 'Failed to delete store. Please try again.');
      }
    }
  };

  const handleSyncStore = async (storeId: string) => {
    try {
      setSuccess('Syncing store data, this may take a moment...');
      await syncStore.mutateAsync(storeId);
      setSuccess('Store synced successfully!');
      refetchStores();
    } catch (error: any) {
      console.error('Failed to sync store:', error);
      setErrorMessage(error?.message || 'Failed to sync store. Please check connection and try again.');
    }
  };

  const handleTestConnection = async (storeId: string) => {
    setTestingConnection(storeId);
    try {
      const result = await testConnection.mutateAsync(storeId) as any;
      if (result.success) {
        setSuccess('Connection successful!');
      } else {
        setErrorMessage(`Connection failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Failed to test connection:', error);
      setErrorMessage(`Connection failed: ${error.message || 'Please check store URL and API keys.'}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/stores/export?' + new URLSearchParams({
        search,
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
      setSuccess('Stores exported successfully!');
    } catch (error) {
      console.error('Failed to export stores:', error);
      setErrorMessage('Failed to export stores. Please try again.');
    }
  };

  const stores = storesData?.data || [];
  const totalStores = storesData?.pagination?.total || 0;

  const statusCounts = {
    connected: stores.filter((store: any) => store.status === 'connected').length,
    disconnected: stores.filter((store: any) => store.status === 'disconnected').length,
    syncing: stores.filter((store: any) => store.status === 'syncing').length,
  };

  const storeStatusMeta: Record<string, { label: string; tone: StatusTone }> = {
    connected: { label: "Connected", tone: "default" },
    disconnected: { label: "Disconnected", tone: "muted" },
    syncing: { label: "Syncing", tone: "default" },
  };

  const getStatusBadge = (status: string) => {
    const config = storeStatusMeta[status] || storeStatusMeta.disconnected;
    return (
      <StatusPill 
        label={config.label} 
        tone={config.tone} 
      />
    );
  };

  const storeSummaryCards = [
    {
      key: "total",
      label: "Total Stores",
      value: totalStores.toLocaleString(),
      context: "All stores",
      icon: Building,
      tone: "default" as const,
    },
    {
      key: "connected",
      label: "Connected",
      value: statusCounts.connected.toLocaleString(),
      context: "Active connections",
      icon: CheckCircle,
      tone: "default" as const,
    },
    {
      key: "disconnected",
      label: "Disconnected",
      value: statusCounts.disconnected.toLocaleString(),
      context: "Needs attention",
      icon: AlertCircle,
      tone: "default" as const,
    },
    {
      key: "syncing",
      label: "Syncing",
      value: statusCounts.syncing.toLocaleString(),
      context: "In progress",
      icon: RefreshCw,
      tone: "default" as const,
    },
  ];

  if (isLoading) {
    return (
      <ProtectedRoute>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading stores...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Error loading stores</CardTitle>
              <CardDescription>
                {error instanceof ApiError ? error.message : 'Database operation failed'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()} variant="outline">
                Retry
              </Button>
            </CardContent>
          </Card>
      </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
          <main className="mobile-container py-6 space-y-6">
          <PageHeader
            title="Stores"
            description="Manage your connected WooCommerce stores and their settings"
            icon={Building}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => refetchStores()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <ProtectedComponent permission="stores:create">
                  <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Store</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </ProtectedComponent>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </div>
            }
          />

          {/* Error/Success Messages */}
          {errorMessage && (
            <Card className="bg-accent/10 border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-foreground">{errorMessage}</div>
                  <Button variant="outline" size="sm" onClick={() => setErrorMessage(null)}>
                    <X className="h-4 w-4" />
                  </Button>
              </div>
              </CardContent>
            </Card>
          )}

          {success && (
            <Card className="bg-accent/10 border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-foreground">{success}</div>
                  <Button variant="outline" size="sm" onClick={() => setSuccess(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {storeSummaryCards.map((card) => (
              <MetricCard
                key={card.key}
                label={card.label}
                value={card.value}
                context={card.context}
                tone={card.tone}
                icon={card.icon}
              />
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
              <CardDescription>Refine the store list by keyword or status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search stores by name or URL"
                    className="pl-10"
                  />
                  </div>
                <div className="relative w-full sm:w-48">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select value={statusFilter || "all"} onValueChange={(value) => {
                    setStatusFilter(value === "all" ? "" : value);
                  }}>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="connected">Connected</SelectItem>
                      <SelectItem value="disconnected">Disconnected</SelectItem>
                      <SelectItem value="syncing">Syncing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row mt-4">
                      <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setSelectedStores([]);
                    refetchStores();
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Filters
                      </Button>
                      </div>
            </CardContent>
          </Card>

          {/* Stores List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">All Stores</CardTitle>
              <CardDescription>
                Manage your connected WooCommerce stores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Building className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">No stores found</p>
                  <p className="text-sm text-muted-foreground text-center">
                    {search || statusFilter ? 
                      'Try adjusting your filters to see more stores.' :
                      'Get started by adding your first store.'
                    }
                  </p>
              </div>
                ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Store</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">URL</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Last Sync</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                      <tbody>
                        {stores.map((store: any) => (
                          <tr key={store.id} className="border-b border-border hover:bg-muted/20">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
                                  <Building className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {store.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                  {store.customer?.email || 'No customer assigned'}
                                  </p>
                            </div>
                          </div>
                        </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={store.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                                  className="text-sm text-foreground hover:text-muted-foreground flex items-center gap-1"
                          >
                            {store.url}
                                  <ExternalLink className="h-3 w-3" />
                          </a>
                          </div>
                        </td>
                            <td className="p-3">
                            {getStatusBadge(store.status)}
                        </td>
                            <td className="p-3">
                              <div className="text-sm text-muted-foreground">
                            {store.lastSyncAt
                              ? new Date(store.lastSyncAt).toLocaleDateString()
                              : 'Never'}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTestConnection(store.id)}
                                  disabled={testingConnection === store.id}
                                  className="gap-1"
                                >
                                  <TestTube className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline">
                                    {testingConnection === store.id ? 'Testing...' : 'Test'}
                                  </span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSyncStore(store.id)}
                                  disabled={syncStore.isPending}
                                  className="gap-1"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline">Sync</span>
                                </Button>
                                <ProtectedComponent permission="stores:update">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingStore(store.id)}
                                    className="gap-1"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                    <span className="hidden xl:inline">Edit</span>
                                  </Button>
                                </ProtectedComponent>
                                <ProtectedComponent permission="stores:delete">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteStore(store.id)}
                                    className="gap-1"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span className="hidden xl:inline">Delete</span>
                                  </Button>
                                </ProtectedComponent>
                              </div>
                        </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {stores.map((store: any) => (
                      <Card key={store.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted flex items-center justify-center">
                                <Building className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 line-clamp-2">
                                  {store.name}
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {store.customer?.email || 'No customer'}
                                  </Badge>
                                  {getStatusBadge(store.status)}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Globe className="h-4 w-4 text-muted-foreground" />
                                  <a 
                                    href={store.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm text-foreground hover:text-muted-foreground flex items-center gap-1"
                                  >
                                    {store.url}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                                <div className="text-sm text-muted-foreground mb-3">
                                  Last Sync: {store.lastSyncAt
                                    ? new Date(store.lastSyncAt).toLocaleDateString()
                                    : 'Never'}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                              onClick={() => handleTestConnection(store.id)}
                              disabled={testingConnection === store.id}
                                className="gap-2 flex-1 sm:flex-none"
                            >
                                <TestTube className="h-4 w-4" />
                                <span>{testingConnection === store.id ? 'Testing...' : 'Test'}</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                              onClick={() => handleSyncStore(store.id)}
                                disabled={syncStore.isPending}
                                className="gap-2 flex-1 sm:flex-none"
                              >
                                <RefreshCw className="h-4 w-4" />
                                <span>Sync</span>
                              </Button>
                              <ProtectedComponent permission="stores:update">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingStore(store.id)}
                                  className="gap-2 flex-1 sm:flex-none"
                                >
                                  <Edit className="h-4 w-4" />
                                  <span>Edit</span>
                                </Button>
                              </ProtectedComponent>
                              <ProtectedComponent permission="stores:delete">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteStore(store.id)}
                                  className="gap-2 flex-1 sm:flex-none"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Delete</span>
                                </Button>
                              </ProtectedComponent>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

            {/* Create Store Modal */}
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-lg">
                    <Plus className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <div>Add New Store</div>
                    <DialogDescription>Connect a new WooCommerce store to your account</DialogDescription>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateStore();
              }} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Store Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter store name"
                      required
                    />
                    {formErrors['name'] && (
                      <p className="text-sm text-foreground">{formErrors['name']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="url">Store URL *</Label>
                    <Input
                      id="url"
                      type="url"
                      value={formData.url}
                      onChange={(e) => handleInputChange('url', e.target.value)}
                      placeholder="https://example.com"
                      required
                    />
                    {formErrors['url'] && (
                      <p className="text-sm text-foreground">{formErrors['url']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="consumerKey">Consumer Key *</Label>
                    <Input
                      id="consumerKey"
                      value={formData.consumerKey}
                      onChange={(e) => handleInputChange('consumerKey', e.target.value)}
                      placeholder="Enter consumer key"
                      required
                    />
                    {formErrors['consumerKey'] && (
                      <p className="text-sm text-foreground">{formErrors['consumerKey']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="consumerSecret">Consumer Secret *</Label>
                    <Input
                      id="consumerSecret"
                      type="password"
                      value={formData.consumerSecret}
                      onChange={(e) => handleInputChange('consumerSecret', e.target.value)}
                      placeholder="Enter consumer secret"
                      required
                      />
                    {formErrors['consumerSecret'] && (
                      <p className="text-sm text-foreground">{formErrors['consumerSecret']}</p>
                    )}
                  </div>
                    </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting || createStore.isPending}
                    className="flex-1 gap-2"
                  >
                    {isSubmitting || createStore.isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Creating Store...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Store
                      </>
                    )}
                  </Button>
                    <Button
                    type="button"
                      variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    disabled={isSubmitting || createStore.isPending}
                    className="flex-1"
                    >
                      Cancel
                    </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

            {/* Edit Store Modal */}
          <Dialog open={!!editingStore} onOpenChange={(open) => {
            if (!open) {
              setEditingStore(null);
              resetForm();
            }
          }}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-lg">
                    <Edit className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <div>Edit Store</div>
                    <DialogDescription>Update store information and connection settings</DialogDescription>
                      </div>
                </DialogTitle>
              </DialogHeader>
              
                  {storeLoading ? (
                    <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading store data...</p>
                      </div>
                    </div>
                  ) : (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (editingStore) handleUpdateStore();
                }} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Store Name *</Label>
                      <Input
                        id="edit-name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter store name"
                        required
                      />
                      {formErrors['name'] && (
                        <p className="text-sm text-foreground">{formErrors['name']}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-url">Store URL *</Label>
                      <Input
                        id="edit-url"
                        type="url"
                        value={formData.url}
                        onChange={(e) => handleInputChange('url', e.target.value)}
                        placeholder="https://example.com"
                        required
                      />
                      {formErrors['url'] && (
                        <p className="text-sm text-foreground">{formErrors['url']}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-consumerKey">Consumer Key *</Label>
                      <Input
                        id="edit-consumerKey"
                        value={formData.consumerKey}
                        onChange={(e) => handleInputChange('consumerKey', e.target.value)}
                        placeholder="Enter consumer key"
                        required
                      />
                      {formErrors['consumerKey'] && (
                        <p className="text-sm text-foreground">{formErrors['consumerKey']}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-consumerSecret">Consumer Secret *</Label>
                      <Input
                        id="edit-consumerSecret"
                        type="password"
                        value={formData.consumerSecret}
                        onChange={(e) => handleInputChange('consumerSecret', e.target.value)}
                        placeholder="Enter consumer secret"
                        required
                      />
                      {formErrors['consumerSecret'] && (
                        <p className="text-sm text-foreground">{formErrors['consumerSecret']}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting || updateStore.isPending}
                      className="flex-1 gap-2"
                    >
                      {isSubmitting || updateStore.isPending ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                        <Button
                      type="button"
                          variant="outline"
                      onClick={() => {
                        setEditingStore(null);
                        resetForm();
                      }}
                      disabled={isSubmitting || updateStore.isPending}
                      className="flex-1"
                    >
                      Cancel
                        </Button>
                      </div>
                </form>
                  )}
            </DialogContent>
          </Dialog>
          </main>
        </div>
    </ProtectedRoute>
  );
}