"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
import { useProducts } from "@/hooks/useProducts";
import { useStores } from "@/hooks/useApi";
import { 
  useInventoryRequests, 
  useInventoryRequestStats,
  useCreateInventoryRequest,
  useDeleteInventoryRequest
} from "@/hooks/useInventoryRequests";
import { 
  Package, 
  Plus,
  Search,
  Download,
  Upload,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  FileText,
  AlertTriangle,
  Settings,
  CheckCircle,
  Clock,
  X
} from "lucide-react";

export default function InventoryPage() {
  const { user } = useAuth();
  const { isAdmin, isCustomer } = useRBAC();
  const { addNotification } = useApp();
  
  // State management
  const [activeTab, setActiveTab] = useState<'requests' | 'stock-adjustment' | 'new-product' | 'bulk-operations'>('requests');
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Form states
  const [stockForm, setStockForm] = useState({
    productId: '',
    currentStock: 0,
    requestedStock: 0,
    adjustmentReason: '',
  });
  
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    price: 0,
    regularPrice: 0,
    description: '',
    shortDescription: '',
    weight: 0,
    stockQuantity: 0,
    categories: [] as string[],
    tags: [] as string[],
    images: [] as string[],
  });

  // Image upload states
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // CSV states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  // Get user's store ID
  useEffect(() => {
    if (user?.stores?.[0]?.id) {
      setSelectedStore(user.stores[0].id);
    }
  }, [user]);

  // Fetch stores data
  const { data: storesData } = useStores();
  const stores = (storesData as any)?.data || [];

  // Fetch data
  const { data: productsData } = useProducts({
    storeId: selectedStore,
    limit: 100,
    ...(search ? { search } : {}),
  });

  const { data: requestsData } = useInventoryRequests({
    storeId: selectedStore,
    ...(statusFilter ? { status: statusFilter } : {}),
  });

  const { data: statsData } = useInventoryRequestStats();

  // Mutations
  const createRequestMutation = useCreateInventoryRequest();
  const deleteRequestMutation = useDeleteInventoryRequest();

  // Image upload handlers
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).slice(0, 5 - imageFiles.length);
    const newImageFiles = [...imageFiles, ...newFiles];
    setImageFiles(newImageFiles);
    
    const newPreviewUrls = newFiles.map(file => window.URL.createObjectURL(file));
    setImagePreviewUrls([...imagePreviewUrls, ...newPreviewUrls]);
  };

  const removeImage = (index: number) => {
    const newImageFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviewUrls = imagePreviewUrls.filter((_, i) => i !== index);
    
    if (imagePreviewUrls[index]) {
      window.URL.revokeObjectURL(imagePreviewUrls[index]);
    }
    
    setImageFiles(newImageFiles);
    setImagePreviewUrls(newPreviewUrls);
  };

  // CSV handlers
  const handleCsvUpload = (file: File) => {
    setCsvFile(file);
    
    const reader = new window.FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0]?.split(',') || [];
      const data = lines.slice(1, 6).map(line => {
        const values = line.split(',');
        return headers.reduce((obj: any, header, index) => {
          obj[header.trim()] = values[index]?.trim() || '';
          return obj;
        }, {});
      });
      setCsvPreviewData(data);
      setShowCsvPreview(true);
    };
    reader.readAsText(file);
  };

  const processCsvData = async () => {
    if (!csvFile) return;
    
    setIsSubmitting(true);
    try {
      // Process CSV data based on active tab
      if (activeTab === 'stock-adjustment') {
        // Process stock adjustments
        for (const row of csvPreviewData) {
          if (row.SKU && row.NewStock) {
            await createRequestMutation.mutateAsync({
              storeId: selectedStore,
              type: 'stock_adjustment',
              title: `Bulk Stock Update - ${row.SKU}`,
              description: `CSV bulk update: ${row.Reason || 'No reason provided'}`,
              currentStock: parseInt(row.CurrentStock) || 0,
              requestedStock: parseInt(row.NewStock) || 0,
              adjustmentReason: row.Reason || 'Bulk CSV update',
            });
          }
        }
      } else if (activeTab === 'new-product') {
        // Process new products
        for (const row of csvPreviewData) {
          if (row.Name && row.SKU && row.Price) {
            await createRequestMutation.mutateAsync({
              storeId: selectedStore,
              type: 'new_product',
              title: `New Product - ${row.Name}`,
              description: `CSV bulk product creation`,
              productData: {
                name: row.Name,
                sku: row.SKU,
                price: parseFloat(row.Price) || 0,     
                description: row.Description || '',
              },
            });
          }
        }
      }
      
      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: `${csvPreviewData.length} adet kayıt işleme alındı`
      });
      
      setShowCsvPreview(false);
      setCsvFile(null);
      setCsvPreviewData([]);
    } catch (error) {
      logger.error("CSV processing failed", error);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'CSV işleme sırasında hata oluştu'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStore || !stockForm.productId) {
      addNotification({
        type: 'warning',
        title: 'Eksik Bilgi',
        message: 'Lütfen mağaza ve ürün seçin'
      });
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        storeId: selectedStore,
        type: 'stock_adjustment',
        title: `Stok Düzenleme - ${(productsData as any)?.data?.find((p: any) => p.id === stockForm.productId)?.name}`,
        description: stockForm.adjustmentReason,
        productId: stockForm.productId,
        currentStock: stockForm.currentStock,
        requestedStock: stockForm.requestedStock,
        adjustmentReason: stockForm.adjustmentReason,
      });
      
      setStockForm({
        productId: '',
        currentStock: 0,
        requestedStock: 0,
        adjustmentReason: '',
      });
      
      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Stok düzenleme talebi oluşturuldu'
      });
    } catch (error) {
      logger.error("Stock adjustment request failed", error);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Stok düzenleme talebi oluşturulamadı'
      });
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];
    
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of imageFiles) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });
        
        if (response.ok) {
          const result = await response.json();
          uploadedUrls.push(result.url);
        }
      }
    } catch (error) {
      logger.error('Image upload failed', error);
    }
    
    return uploadedUrls;
  };

  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStore || !productForm.name || !productForm.sku) {
      addNotification({
        type: 'warning',
        title: 'Eksik Bilgi',
        message: 'Lütfen gerekli alanları doldurun'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images first
      const uploadedImageUrls = await uploadImages();
      
      await createRequestMutation.mutateAsync({
        storeId: selectedStore,
        type: 'new_product',
        title: `Yeni Ürün - ${productForm.name}`,
        description: productForm.shortDescription || productForm.description,
        productData: {
          ...productForm,
          images: uploadedImageUrls,
        },
      });
      
      setProductForm({
        name: '',
        sku: '',
        price: 0,
        regularPrice: 0,
        description: '',
        shortDescription: '',
        weight: 0,
        stockQuantity: 0,
        categories: [],
        tags: [],
        images: [],
      });
      setImageFiles([]);
      setImagePreviewUrls([]);
      
      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Yeni ürün talebi oluşturuldu'
      });
    } catch (error) {
      logger.error("New product request failed", error);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Yeni ürün talebi oluşturulamadı'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm("Bu talebi silmek istediğinizden emin misiniz?")) {
      try {
        await deleteRequestMutation.mutateAsync(id);
        addNotification({
          type: 'success',
          title: 'Başarılı',
          message: 'Talep silindi'
        });
      } catch {
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Talep silinirken bir hata oluştu'
        });
      }
    }
  };

  const requests = (requestsData as any)?.data || [];
  const products = (productsData as any)?.data || [];
  const stats = statsData || { total: 0, pending: 0, approved: 0, rejected: 0 };

  return (
    <ProtectedRoute>
      <div className="bg-background">
        <main className="mobile-container py-6 space-y-6">
          {/* Header and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1">
              <h1 className="mobile-heading text-foreground flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                {isAdmin() ? 'Inventory Management' : 'Inventory Requests'}
              </h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Review and approve inventory requests from all stores' : 'Request inventory changes for your store'}
              </p>
          </div>

            {/* Admin View - Approval focused */}
            {isAdmin() && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setActiveTab('requests')}
                  className={`btn btn-md flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16 ${
                    activeTab === 'requests' ? 'btn-warning' : 'btn-outline hover:bg-accent/50'
                  }`}
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Pending Requests</span>
            </button>
                <button 
                  onClick={() => {
                    // Export all requests
                    const csvData = requests.map((r: any) => ({
                      Type: r.type,
                      Title: r.title,
                      Status: r.status,
                      Store: r.store?.name || '',
                      Customer: r.customer?.name || '',
                      Created: new Date(r.createdAt).toLocaleDateString()
                    }));
                    
                    if (csvData.length > 0) {
                      const csv = [
                        Object.keys(csvData[0]).join(','),
                        ...csvData.map((row: any) => Object.values(row).join(','))
                      ].join('\n');
                      
                      const blob = new window.Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `inventory-requests-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }
                  }}
                  className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16"
                >
                  <Download className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Export Report</span>
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16"
                >
                  <RefreshCw className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Refresh</span>
                </button>
              </div>
            )}

            {/* Customer View - Request creation focused */}
            {isCustomer() && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setActiveTab('stock-adjustment')}
                  className={`btn btn-md flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16 ${
                    activeTab === 'stock-adjustment' ? 'btn-primary' : 'btn-outline hover:bg-accent/50'
                  }`}
                >
                  <Edit className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Stock Edit</span>
            </button>
            <button
              onClick={() => setActiveTab('new-product')}
                  className={`btn btn-md flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16 ${
                    activeTab === 'new-product' ? 'btn-primary' : 'btn-outline hover:bg-accent/50'
                  }`}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">New Product</span>
                </button>
                <button 
                  onClick={() => setActiveTab('bulk-operations')}
                  className={`btn btn-md flex flex-col items-center justify-center gap-1 transition-all duration-200 w-full h-16 ${
                    activeTab === 'bulk-operations' ? 'btn-primary shadow-lg' : 'btn-outline hover:bg-accent/50'
                  }`}
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Bulk CSV</span>
                </button>
                <button 
                  onClick={() => setActiveTab('requests')}
                  className={`btn btn-md flex flex-col items-center justify-center gap-1 transition-all duration-200 w-full h-16 ${
                    activeTab === 'requests' ? 'btn-warning shadow-lg' : 'btn-outline hover:bg-accent/50'
                  }`}
                >
                  <Clock className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">My Requests</span>
            </button>
              </div>
            )}
          </div>

          {/* Store Selection for Admin */}
          {isAdmin() && (
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Settings className="h-5 w-5 text-primary" />
                </div>
                        <div>
                    <label className="text-sm font-medium text-foreground">Store Selection</label>
                    <p className="text-xs text-muted-foreground">Choose a store to manage its inventory requests</p>
                        </div>
                </div>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="flex-1 max-w-md px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                >
                  <option value="">🏪 All Stores ({stores.length})</option>
                  {stores.map((store: any) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store._count?.inventoryRequests || 0} requests)
                    </option>
                  ))}
                </select>
                        </div>
                      </div>
          )}

          {/* Customer Store Info */}
          {isCustomer() && user?.stores?.[0] && (
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Store: {user.stores[0].name}</p>
                  <p className="text-xs text-muted-foreground">Managing inventory for your store</p>
                </div>
              </div>
                        </div>
                      )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                        </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{(stats as any)?.total || 0}</div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">All inventory requests</p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-600">{(stats as any)?.pending || 0}</div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
              <p className="text-xs text-yellow-600">Awaiting approval</p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{(stats as any)?.approved || 0}</div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
              <p className="text-xs text-green-600">Successfully approved</p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{(stats as any)?.rejected || 0}</div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
              <p className="text-xs text-red-600">Needs revision</p>
            </div>
          </div>

          {/* Content based on active tab */}
          <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
            {activeTab === 'requests' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {isAdmin() ? 'All Inventory Requests' : 'My Inventory Requests'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isAdmin() ? 'Review and approve requests from all stores' : 'Track your inventory requests status'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search requests..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground w-64 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50 dark:bg-muted/20">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">Title</th>
                        {isAdmin() && (
                          <>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">Store</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">Customer</th>
                          </>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-background divide-y divide-border">
                      {requests.map((request: any) => (
                        <tr key={request.id} className="hover:bg-muted/20 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${
                              request.type === 'stock_adjustment' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                              request.type === 'new_product' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
                            }`}>
                              {request.type === 'stock_adjustment' ? 'Stock Edit' : 
                               request.type === 'new_product' ? 'New Product' : request.type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground">{request.title}</div>
                            <div className="text-sm text-muted-foreground">{request.description}</div>
                          </td>
                          {isAdmin() && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-foreground">{request.store?.name || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-foreground">{request.customer?.name || request.customer?.email || 'N/A'}</div>
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${
                              request.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              request.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  addNotification({
                                    type: 'info',
                                    title: 'Request Details',
                                    message: `Viewing ${request.title}. Detailed view coming soon!`
                                  });
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-border text-xs font-medium rounded-md text-foreground bg-background hover:bg-muted/50 dark:hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </button>
                              
                              {/* Admin approval buttons */}
                              {isAdmin() && request.status === 'pending' && (
                                <>
                                  <button 
                                    onClick={() => {
                                      addNotification({
                                        type: 'success',
                                        title: 'Request Approved',
                                        message: `${request.title} has been approved. Sync to WooCommerce pending.`
                                      });
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-800 bg-green-100 hover:bg-green-200 dark:text-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => {
                                      addNotification({
                                        type: 'warning',
                                        title: 'Request Rejected',
                                        message: `${request.title} has been rejected. Customer will be notified.`
                                      });
                                    }}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 dark:text-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Reject
                                  </button>
                                </>
                              )}
                              
                              {/* Customer delete button for pending requests */}
                              {isCustomer() && request.status === 'pending' && (
                                <button 
                                  onClick={() => handleDeleteRequest(request.id)}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 dark:text-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </button>
                        )}
                      </div>
                          </td>
                        </tr>
                  ))}
                  {requests.length === 0 && (
                        <tr>
                          <td colSpan={isAdmin() ? 7 : 5} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                              <p className="text-lg font-medium text-muted-foreground mb-2">No requests found</p>
                              <p className="text-sm text-muted-foreground">
                                {isAdmin() ? 'No inventory requests to review' : 'Create your first inventory request'}
                              </p>
                              {isCustomer() && (
                                <div className="mt-4 flex gap-2">
                                  <button
                                    onClick={() => setActiveTab('stock-adjustment')}
                                    className="btn btn-primary btn-sm"
                                  >
                                    Request Stock Edit
                                  </button>
                                  <button
                                    onClick={() => setActiveTab('new-product')}
                                    className="btn btn-outline btn-sm"
                                  >
                                    Request New Product
                                  </button>
                    </div>
                  )}
                </div>
                          </td>
                        </tr>
              )}
                    </tbody>
                  </table>
                </div>
            </div>
          )}

          {activeTab === 'stock-adjustment' && (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Stock Adjustment</h3>
                    <p className="text-sm text-muted-foreground">Request changes to product stock levels</p>
                  </div>
                </div>

                <form onSubmit={handleCreateStockAdjustment} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                      <label className="form-label">Product *</label>
                  <select
                    value={stockForm.productId}
                    onChange={(e) => {
                          const productId = e.target.value;
                          const product = products.find((p: any) => p.id === productId);
                      setStockForm(prev => ({
                        ...prev,
                            productId,
                            currentStock: product?.stockQuantity || 0
                      }));
                    }}
                        className="form-select"
                    required
                  >
                        <option value="">Select a product</option>
                    {products.map((product: any) => (
                      <option key={product.id} value={product.id}>
                            {product.name} ({product.sku}) - Current: {product.stockQuantity}
                      </option>
                    ))}
                  </select>
                </div>
                  <div>
                      <label className="form-label">Current Stock</label>
                    <input
                      type="number"
                      value={stockForm.currentStock}
                        readOnly
                        className="form-input bg-muted/20"
                    />
                  </div>
                  <div>
                      <label className="form-label">Requested Stock *</label>
                    <input
                      type="number"
                      value={stockForm.requestedStock}
                      onChange={(e) => setStockForm(prev => ({ ...prev, requestedStock: parseInt(e.target.value) || 0 }))}
                        className="form-input"
                      required
                        min="0"
                    />
                  </div>
                <div>
                      <label className="form-label">Stock Difference</label>
                      <input
                        type="text"
                        value={stockForm.requestedStock - stockForm.currentStock > 0 ? 
                          `+${stockForm.requestedStock - stockForm.currentStock}` : 
                          `${stockForm.requestedStock - stockForm.currentStock}`}
                        readOnly
                        className={`form-input ${
                          stockForm.requestedStock - stockForm.currentStock > 0 ? 'text-green-600' : 
                          stockForm.requestedStock - stockForm.currentStock < 0 ? 'text-red-600' : 
                          'text-gray-600'
                        }`}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label">Adjustment Reason *</label>
                  <textarea
                    value={stockForm.adjustmentReason}
                    onChange={(e) => setStockForm(prev => ({ ...prev, adjustmentReason: e.target.value }))}
                        className="form-textarea"
                    rows={3}
                        placeholder="Explain why this stock adjustment is needed..."
                        required
                  />
                    </div>
                </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                <button
                  type="submit"
                      disabled={isSubmitting || !selectedStore}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Submit Stock Adjustment Request
                        </>
                      )}
                </button>
                    <button
                      type="button"
                      onClick={() => setStockForm({
                        productId: '',
                        currentStock: 0,
                        requestedStock: 0,
                        adjustmentReason: '',
                      })}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset Form
                    </button>
                  </div>
              </form>
            </div>
          )}

          {activeTab === 'new-product' && (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">New Product Request</h3>
                    <p className="text-sm text-muted-foreground">Request to add a new product to your store</p>
                  </div>
                </div>

                <form onSubmit={handleCreateNewProduct} className="space-y-6">
                  {/* Product Images */}
                  <div>
                    <label className="form-label">Product Images</label>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors duration-200">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e.target.files)}
                          className="hidden"
                          id="product-image-upload"
                        />
                        <label htmlFor="product-image-upload" className="cursor-pointer">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-foreground font-medium">Click to upload product images</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5 images</p>
                    </label>
                      </div>

                      {imagePreviewUrls.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {imagePreviewUrls.map((url: string, index: number) => (
                            <div key={index} className="relative group">
                              <img 
                                src={url} 
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-border"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                        className="form-input"
                        placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div>
                      <label className="form-label">SKU *</label>
                    <input
                      type="text"
                      value={productForm.sku}
                      onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                        className="form-input"
                        placeholder="Enter SKU"
                        required
                    />
                  </div>
                  <div>
                      <label className="form-label">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                        className="form-input"
                        placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                      <label className="form-label">Regular Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={productForm.regularPrice}
                      onChange={(e) => setProductForm(prev => ({ ...prev, regularPrice: parseFloat(e.target.value) || 0 }))}
                        className="form-input"
                        placeholder="0.00"
                    />
                  </div>
                  <div>
                      <label className="form-label">Initial Stock Quantity *</label>
                    <input
                      type="number"
                      value={productForm.stockQuantity}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))}
                        className="form-input"
                        placeholder="0"
                        required
                        min="0"
                    />
                  </div>
                <div>
                      <label className="form-label">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productForm.weight}
                        onChange={(e) => setProductForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                        className="form-input"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label">Short Description</label>
                      <input
                        type="text"
                        value={productForm.shortDescription}
                        onChange={(e) => setProductForm(prev => ({ ...prev, shortDescription: e.target.value }))}
                        className="form-input"
                        placeholder="Brief product description"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label">Description</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                        className="form-textarea"
                    rows={4}
                        placeholder="Detailed product description"
                  />
                    </div>
                </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                    <button
                      type="submit"
                      disabled={isSubmitting || !selectedStore}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting Request...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Submit New Product Request
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductForm({
                          name: '',
                          sku: '',
                          price: 0,
                          regularPrice: 0,
                          description: '',
                          shortDescription: '',
                          weight: 0,
                          stockQuantity: 0,
                          categories: [],
                          tags: [],
                          images: [],
                        });
                        setImageFiles([]);
                        setImagePreviewUrls([]);
                      }}
                      disabled={isSubmitting}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset Form
                    </button>
                </div>
                </form>
              </div>
            )}

            {activeTab === 'bulk-operations' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Bulk Operations</h3>
                    <p className="text-sm text-muted-foreground">
                      {isAdmin() ? 'Process CSV files for bulk inventory operations' : 'Upload CSV files for bulk inventory requests'}
                    </p>
                  </div>
                  {!selectedStore && isCustomer() && (
                    <div className="text-sm text-red-600">
                      Please ensure your store is selected
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CSV Upload for Stock Adjustments */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-foreground">Bulk Stock Adjustments</h4>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors duration-200">
                  <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setActiveTab('stock-adjustment');
                            handleCsvUpload(file);
                          }
                        }}
                        className="hidden"
                        id="stock-csv-upload"
                      />
                      <label htmlFor="stock-csv-upload" className="cursor-pointer">
                        <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-foreground font-medium">Upload Stock CSV</p>
                        <p className="text-xs text-muted-foreground">Format: SKU, CurrentStock, NewStock, Reason</p>
                      </label>
                    </div>
                    <button
                      onClick={() => {
                        const csvContent = 'SKU,CurrentStock,NewStock,Reason\nSAMPLE-001,10,25,Restock from supplier\nSAMPLE-002,5,0,Discontinued product';
                        const blob = new window.Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'stock-adjustment-template.csv';
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }}
                      className="btn btn-outline btn-sm w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </button>
                </div>

                  {/* CSV Upload for New Products */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-foreground">Bulk New Products</h4>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors duration-200">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setActiveTab('new-product');
                            handleCsvUpload(file);
                          }
                        }}
                        className="hidden"
                        id="product-csv-upload"
                      />
                      <label htmlFor="product-csv-upload" className="cursor-pointer">
                        <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-foreground font-medium">Upload Products CSV</p>
                        <p className="text-xs text-muted-foreground">Format: Name, SKU, Price, Stock, Description, Category</p>
                      </label>
                    </div>
                <button
                      onClick={() => {
                        const csvContent = 'Name,SKU,Price,Stock,Description,Category\nSample Phone,PHONE-001,299.99,50,Premium smartphone,Electronics\nSample Case,CASE-001,29.99,100,Protective phone case,Accessories';
                        const blob = new window.Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'new-products-template.csv';
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }}
                      className="btn btn-outline btn-sm w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                </button>
                  </div>
                </div>
            </div>
          )}
          </div>
        </main>
      </div>

      {/* CSV Preview Modal */}
      {showCsvPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">CSV Preview</h3>
                  <p className="text-sm text-muted-foreground">Preview and confirm your CSV data before processing</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCsvPreview(false);
                  setCsvFile(null);
                  setCsvPreviewData([]);
                }}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  File: <span className="font-medium text-foreground">{csvFile?.name}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Rows: <span className="font-medium text-foreground">{csvPreviewData.length}</span>
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      {csvPreviewData[0] && Object.keys(csvPreviewData[0]).map((header) => (
                        <th key={header} className="px-4 py-2 text-left text-xs font-medium text-foreground uppercase">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {csvPreviewData.map((row, index) => (
                      <tr key={index} className="hover:bg-muted/20">
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-2 text-sm text-foreground">
                            {value as string}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-border">
              <button
                onClick={processCsvData}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing CSV Data...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Process {csvPreviewData.length} Records
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowCsvPreview(false);
                  setCsvFile(null);
                  setCsvPreviewData([]);
                }}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}