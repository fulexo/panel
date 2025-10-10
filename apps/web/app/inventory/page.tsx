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
  X,
  MapPin,
  Users,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { MetricCard } from "@/components/patterns/MetricCard";

export default function InventoryPage() {
  const { user } = useAuth();
  const { isAdmin, isCustomer } = useRBAC();
  const { addNotification } = useApp();
  
  // State management
  const [activeTab, setActiveTab] = useState<'requests' | 'stock-adjustment' | 'new-product' | 'bulk-operations'>('requests');
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateStockModal, setShowCreateStockModal] = useState(false);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

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
    } else {
      setSelectedStore("all");
    }
  }, [user]);

  // Fetch stores data
  const { data: storesData } = useStores();
  const stores = (storesData as any)?.data || [];

  // Fetch data
  const { data: productsData } = useProducts({
    storeId: selectedStore === "all" ? undefined : selectedStore,
    limit: 100,
    ...(search ? { search } : {}),
  });

  const { data: requestsData } = useInventoryRequests({
    storeId: selectedStore === "all" ? undefined : selectedStore,
    ...(statusFilter && statusFilter !== "all" ? { status: statusFilter } : {}),
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
      // Process CSV data based on activeTab
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
        type: 'info',
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
    
    if (selectedStore === "all" || !stockForm.productId) {
      addNotification({
        type: 'info',
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
        type: 'info',
        title: 'Başarılı',
        message: 'Stok düzenleme talebi oluşturuldu'
      });
      
      setShowCreateStockModal(false);
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
    
    if (selectedStore === "all" || !productForm.name || !productForm.sku) {
      addNotification({
        type: 'info',
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
        type: 'info',
        title: 'Başarılı',
        message: 'Yeni ürün talebi oluşturuldu'
      });
      
      setShowCreateProductModal(false);
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
          type: 'info',
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
          {/* Page Header */}
          <PageHeader
            title={isAdmin() ? 'Inventory Management' : 'Inventory Requests'}
            description={isAdmin() ? 'Review and approve inventory requests from all stores' : 'Request inventory changes for your store'}
            icon={Package}
            actions={
              <div className="flex gap-2">
                {isAdmin() && (
                  <>
                    <Button
                      onClick={() => {
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
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Report</span>
                    </Button>
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Refresh</span>
                    </Button>
                  </>
                )}
              </div>
            }
          />

          {/* Store Selection for Admin */}
          {isAdmin() && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Store Selection
                </CardTitle>
                <CardDescription>Choose a store to manage its inventory requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🏪 All Stores ({stores.length})</SelectItem>
                    {stores.map((store: any) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} ({store._count?.inventoryRequests || 0} requests)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Customer Store Info */}
          {isCustomer() && user?.stores?.[0] && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Package className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Store: {user.stores[0].name}</p>
                    <p className="text-xs text-muted-foreground">Managing inventory for your store</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              title="Total Requests"
              value={(stats as any)?.total || 0}
              description="All inventory requests"
              icon={FileText}
              tone="default"
            />
            <MetricCard
              title="Pending"
              value={(stats as any)?.pending || 0}
              description="Awaiting approval"
              icon={Clock}
              tone="default"
            />
            <MetricCard
              title="Approved"
              value={(stats as any)?.approved || 0}
              description="Successfully approved"
              icon={CheckCircle}
              tone="default"
            />
            <MetricCard
              title="Rejected"
              value={(stats as any)?.rejected || 0}
              description="Needs revision"
              icon={AlertTriangle}
              tone="default"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1 h-auto">
              <TabsTrigger value="requests" className="text-xs sm:text-sm flex items-center justify-center gap-1 py-2 px-3">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Requests</span>
                <span className="xs:hidden">Req</span>
              </TabsTrigger>
              <TabsTrigger value="stock-adjustment" className="text-xs sm:text-sm flex items-center justify-center gap-1 py-2 px-3">
                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Stock Edit</span>
                <span className="xs:hidden">Stock</span>
              </TabsTrigger>
              <TabsTrigger value="new-product" className="text-xs sm:text-sm flex items-center justify-center gap-1 py-2 px-3">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">New Product</span>
                <span className="xs:hidden">New</span>
              </TabsTrigger>
              <TabsTrigger value="bulk-operations" className="text-xs sm:text-sm flex items-center justify-center gap-1 py-2 px-3">
                <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Bulk CSV</span>
                <span className="xs:hidden">Bulk</span>
              </TabsTrigger>
            </TabsList>

            {/* Requests Tab */}
            <TabsContent value="requests" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle>
                        {isAdmin() ? 'All Inventory Requests' : 'My Inventory Requests'}
                      </CardTitle>
                      <CardDescription>
                        {isAdmin() ? 'Review and approve requests from all stores' : 'Track your inventory requests status'}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search requests..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-10 w-full"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {requests.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="No requests found"
                      description={isAdmin() ? 'No inventory requests to review' : 'Create your first inventory request'}
                      action={
                        isCustomer() ? (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setActiveTab('stock-adjustment')}
                              variant="outline"
                              size="sm"
                            >
                              Request Stock Edit
                            </Button>
                            <Button
                              onClick={() => setActiveTab('new-product')}
                              variant="outline"
                              size="sm"
                            >
                              Request New Product
                            </Button>
                          </div>
                        ) : undefined
                      }
                    />
                  ) : (
                    <div className="space-y-4">
                      {requests.map((request: any) => (
                        <Card key={request.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-4 sm:pt-6">
                            <div className="space-y-4">
                              <div className="flex flex-col gap-3">
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {request.type === 'stock_adjustment' ? 'Stock Edit' : 
                                     request.type === 'new_product' ? 'New Product' : request.type}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {request.status}
                                  </Badge>
                                </div>
                                <div>
                                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">{request.title}</h3>
                                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{request.description}</p>
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                                  {isAdmin() && (
                                    <>
                                      <div>Store: {request.store?.name || 'N/A'}</div>
                                      <div>Customer: {request.customer?.name || request.customer?.email || 'N/A'}</div>
                                    </>
                                  )}
                                  <div>Created: {new Date(request.createdAt).toLocaleDateString()}</div>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  onClick={() => {
                                    addNotification({
                                      type: 'info',
                                      title: 'Request Details',
                                      message: `Viewing ${request.title}. Detailed view coming soon!`
                                    });
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="gap-2 flex-1 sm:flex-none"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>View</span>
                                </Button>
                                
                                {/* Admin approval buttons */}
                                {isAdmin() && request.status === 'pending' && (
                                  <>
                                    <Button
                                      onClick={() => {
                                        addNotification({
                                          type: 'info',
                                          title: 'Request Approved',
                                          message: `${request.title} has been approved. Sync to WooCommerce pending.`
                                        });
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="gap-2 flex-1 sm:flex-none"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      <span>Approve</span>
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        addNotification({
                                          type: 'info',
                                          title: 'Request Rejected',
                                          message: `${request.title} has been rejected. Customer will be notified.`
                                        });
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="gap-2 flex-1 sm:flex-none"
                                    >
                                      <X className="h-4 w-4" />
                                      <span>Reject</span>
                                    </Button>
                                  </>
                                )}
                                
                                {/* Customer delete button for pending requests */}
                                {isCustomer() && request.status === 'pending' && (
                                  <Button
                                    onClick={() => handleDeleteRequest(request.id)}
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 flex-1 sm:flex-none"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Delete</span>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Stock Adjustment Tab */}
            <TabsContent value="stock-adjustment" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle>Stock Adjustment</CardTitle>
                      <CardDescription>Request changes to product stock levels</CardDescription>
                    </div>
                    <Dialog open={showCreateStockModal} onOpenChange={setShowCreateStockModal}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          <span>New Stock Request</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto mx-auto">
                        <DialogHeader>
                          <DialogTitle>Create Stock Adjustment Request</DialogTitle>
                          <DialogDescription>Request changes to product stock levels</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateStockAdjustment} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="product">Product *</Label>
                            <Select
                              value={stockForm.productId}
                              onValueChange={(value) => {
                                const product = products.find((p: any) => p.id === value);
                                setStockForm(prev => ({
                                  ...prev,
                                  productId: value,
                                  currentStock: product?.stockQuantity || 0
                                }));
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product: any) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.sku}) - Current: {product.stockQuantity}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="currentStock">Current Stock</Label>
                              <Input
                                id="currentStock"
                                type="number"
                                value={stockForm.currentStock}
                                readOnly
                                className="bg-muted/20"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="requestedStock">Requested Stock *</Label>
                              <Input
                                id="requestedStock"
                                type="number"
                                value={stockForm.requestedStock}
                                onChange={(e) => setStockForm(prev => ({ ...prev, requestedStock: parseInt(e.target.value) || 0 }))}
                                required
                                min="0"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="stockDifference">Stock Difference</Label>
                            <Input
                              id="stockDifference"
                              type="text"
                              value={stockForm.requestedStock - stockForm.currentStock > 0 ? 
                                `+${stockForm.requestedStock - stockForm.currentStock}` : 
                                `${stockForm.requestedStock - stockForm.currentStock}`}
                              readOnly
                              className="bg-muted/20"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="adjustmentReason">Adjustment Reason *</Label>
                            <Textarea
                              id="adjustmentReason"
                              value={stockForm.adjustmentReason}
                              onChange={(e) => setStockForm(prev => ({ ...prev, adjustmentReason: e.target.value }))}
                              rows={3}
                              placeholder="Explain why this stock adjustment is needed..."
                              required
                            />
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button
                              type="submit"
                              disabled={isSubmitting || selectedStore === "all"}
                              className="flex-1 gap-2"
                            >
                              {isSubmitting ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  <span>Submitting...</span>
                                </>
                              ) : (
                                <>
                                  <BarChart3 className="h-4 w-4" />
                                  <span>Submit Request</span>
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setShowCreateStockModal(false)}
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={Edit}
                    title="No stock adjustment requests"
                    description="Create your first stock adjustment request to get started"
                    action={
                      <Button
                        onClick={() => setShowCreateStockModal(true)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create Stock Request</span>
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* New Product Tab */}
            <TabsContent value="new-product" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle>New Product Request</CardTitle>
                      <CardDescription>Request to add a new product to your store</CardDescription>
                    </div>
                    <Dialog open={showCreateProductModal} onOpenChange={setShowCreateProductModal}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          <span>New Product Request</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
                        <DialogHeader>
                          <DialogTitle>Create New Product Request</DialogTitle>
                          <DialogDescription>Request to add a new product to your store</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateNewProduct} className="space-y-4">
                          {/* Product Images */}
                          <div className="space-y-2">
                            <Label>Product Images</Label>
                            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-border transition-colors duration-200">
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
                                    <Button
                                      type="button"
                                      onClick={() => removeImage(index)}
                                      size="sm"
                                      variant="destructive"
                                      className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="productName">Product Name *</Label>
                              <Input
                                id="productName"
                                type="text"
                                value={productForm.name}
                                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter product name"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sku">SKU *</Label>
                              <Input
                                id="sku"
                                type="text"
                                value={productForm.sku}
                                onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                                placeholder="Enter SKU"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="price">Price *</Label>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                value={productForm.price}
                                onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                placeholder="0.00"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="regularPrice">Regular Price</Label>
                              <Input
                                id="regularPrice"
                                type="number"
                                step="0.01"
                                value={productForm.regularPrice}
                                onChange={(e) => setProductForm(prev => ({ ...prev, regularPrice: parseFloat(e.target.value) || 0 }))}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="stockQuantity">Initial Stock Quantity *</Label>
                              <Input
                                id="stockQuantity"
                                type="number"
                                value={productForm.stockQuantity}
                                onChange={(e) => setProductForm(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))}
                                placeholder="0"
                                required
                                min="0"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="weight">Weight (kg)</Label>
                              <Input
                                id="weight"
                                type="number"
                                step="0.01"
                                value={productForm.weight}
                                onChange={(e) => setProductForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="shortDescription">Short Description</Label>
                            <Input
                              id="shortDescription"
                              type="text"
                              value={productForm.shortDescription}
                              onChange={(e) => setProductForm(prev => ({ ...prev, shortDescription: e.target.value }))}
                              placeholder="Brief product description"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={productForm.description}
                              onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                              rows={4}
                              placeholder="Detailed product description"
                            />
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button
                              type="submit"
                              disabled={isSubmitting || selectedStore === "all"}
                              className="flex-1 gap-2"
                            >
                              {isSubmitting ? (
                                <>
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  <span>Submitting...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4" />
                                  <span>Submit Request</span>
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => setShowCreateProductModal(false)}
                              variant="outline"
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={Plus}
                    title="No new product requests"
                    description="Create your first new product request to get started"
                    action={
                      <Button
                        onClick={() => setShowCreateProductModal(true)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create Product Request</span>
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bulk Operations Tab */}
            <TabsContent value="bulk-operations" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Operations</CardTitle>
                  <CardDescription>
                    {isAdmin() ? 'Process CSV files for bulk inventory operations' : 'Upload CSV files for bulk inventory requests'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* CSV Upload for Stock Adjustments */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Bulk Stock Adjustments</CardTitle>
                        <CardDescription>Upload CSV file for bulk stock updates</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-border transition-colors duration-200">
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
                        <Button
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
                          variant="outline"
                          size="sm"
                          className="w-full mt-4 gap-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Template</span>
                        </Button>
                      </CardContent>
                    </Card>

                    {/* CSV Upload for New Products */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Bulk New Products</CardTitle>
                        <CardDescription>Upload CSV file for bulk product creation</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-border transition-colors duration-200">
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
                        <Button
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
                          variant="outline"
                          size="sm"
                          className="w-full mt-4 gap-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Template</span>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      {/* CSV Preview Modal */}
      {showCsvPreview && (
        <Dialog open={showCsvPreview} onOpenChange={setShowCsvPreview}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-auto">
            <DialogHeader>
              <DialogTitle>CSV Preview</DialogTitle>
              <DialogDescription>Preview and confirm your CSV data before processing</DialogDescription>
            </DialogHeader>
            
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
            
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
              <Button
                onClick={processCsvData}
                disabled={isSubmitting}
                className="flex-1 gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Process {csvPreviewData.length} Records</span>
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowCsvPreview(false);
                  setCsvFile(null);
                  setCsvPreviewData([]);
                }}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </ProtectedRoute>
  );
}