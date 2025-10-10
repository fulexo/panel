'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useRBAC } from '@/hooks/useRBAC';
import { 
  useProducts, 
  useDeleteProduct, 
  useBulkUpdateProducts,
  useCreateProduct,
  useUpdateProduct,
  useStores,
  useProductSales
} from '@/hooks/useApi';
import ProtectedRoute from '@/components/ProtectedRoute';
import ProtectedComponent from '@/components/ProtectedComponent';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/patterns/MetricCard';
import { StatusPill } from '@/components/patterns/StatusPill';
import type { StatusTone } from '@/components/patterns/StatusPill';
import { ImagePlaceholder } from '@/components/patterns/ImagePlaceholder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/formatters';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  ChevronLeft, 
  ChevronRight,
  ShoppingBag,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  X
} from 'lucide-react';

// Product Sales Statistics Component
function ProductSalesStats({ productId }: { productId: string }) {
  const { data: salesData, isLoading, error } = useProductSales(productId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Sales Statistics</CardTitle>
          <CardDescription>Loading sales data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-6 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-accent/10 border-border">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Sales Statistics</CardTitle>
          <CardDescription>Failed to load sales data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-foreground">
            Error loading sales data. Please try again.
          </div>
        </CardContent>
      </Card>
    );
  }

  const sales = {
    totalSales: 0,
    totalRevenue: 0,
    lastSaleDate: null,
    monthlySales: 0,
    weeklySales: 0,
    dailySales: 0,
    ...(salesData as any)?.data
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Sales Statistics</CardTitle>
        <CardDescription>Product performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Total Sales"
            value={sales.totalSales.toString()}
            context="units sold"
            tone="default"
          />
          <MetricCard
            label="Total Revenue"
            value={`$${sales.totalRevenue}`}
            context="generated"
            tone="default"
          />
          <MetricCard
            label="Last Sale"
            value={sales.lastSaleDate ? new Date(sales.lastSaleDate).toLocaleDateString() : 'Never'}
            context="most recent"
            tone="default"
          />
          <MetricCard
            label="This Month"
            value={sales.monthlySales.toString()}
            context="units"
            tone="default"
          />
          <MetricCard
            label="This Week"
            value={sales.weeklySales.toString()}
            context="units"
            tone="default"
          />
          <MetricCard
            label="Today"
            value={sales.dailySales.toString()}
            context="units"
            tone="default"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const adminView = isAdmin();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<any | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    salePrice: 0,
    sku: '',
    stockQuantity: 0,
    category: '',
    productType: 'simple' as 'simple' | 'variable' | 'bundle' | 'grouped' | 'external',
    storeId: '',
    images: [] as string[],
  });
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // API hooks
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const bulkUpdateProducts = useBulkUpdateProducts();

  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
  // Fetch stores data (for admin store filter)
  const { data: storesData } = useStores();
  const stores = (storesData as any)?.data || [];
  
  // Fetch products data
  const {
    data: productsData,
    isLoading,
    error,
    refetch: refetchProducts,
  } = useProducts({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(adminView && storeFilter ? { storeId: storeFilter } : {}),
    ...(!adminView && userStoreId ? { storeId: userStoreId } : {}),
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

  // Form handlers
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev: any) => ({ ...prev, [field]: '' }));
    }
  };

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
    
    if (formData.images[index]) {
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, images: newImages }));
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return formData.images;
    
    const uploadedUrls: string[] = [...formData.images];
    
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
      console.error('Image upload failed:', error);
    }
    
    return uploadedUrls;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) errors['name'] = 'Product name is required';
    if (!formData.sku.trim()) errors['sku'] = 'SKU is required';
    if (formData.price <= 0) errors['price'] = 'Price must be greater than 0';
    if (formData.stockQuantity < 0) errors['stockQuantity'] = 'Stock quantity cannot be negative';
    if (!formData.storeId && !userStoreId) errors['storeId'] = 'Store selection is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      salePrice: 0,
      sku: '',
      stockQuantity: 0,
      category: '',
      productType: 'simple',
      storeId: '',
      images: [],
    });
    setFormErrors({});
    setImageFiles([]);
    setImagePreviewUrls([]);
  };

  const handleCreateProduct = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);
    
    try {
      const uploadedImageUrls = await uploadImages();
      
      const productData = {
        ...formData,
        storeId: formData.storeId || userStoreId || '',
        images: uploadedImageUrls,
        syncToWooCommerce: true,
      };
      
      await createProduct.mutateAsync(productData);
      setSuccess('Product created successfully and synced to WooCommerce!');
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Failed to create product:', error);
      setErrorMessage(error?.message || 'Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccess(null);
    
    try {
      const uploadedImageUrls = await uploadImages();
      
      const updateData = {
        ...formData,
        images: uploadedImageUrls,
        syncToWooCommerce: true,
      };
      
      await updateProduct.mutateAsync({ id: productId, data: updateData });
      setSuccess('Product updated successfully and synced to WooCommerce!');
      setEditingProduct(null);
      resetForm();
    } catch (error: any) {
      console.error('Failed to update product:', error);
      setErrorMessage(error?.message || 'Failed to update product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product.id);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      salePrice: product.salePrice || 0,
      sku: product.sku || '',
      stockQuantity: product.stockQuantity || 0,
      category: product.category || '',
      productType: product.productType || 'simple',
      storeId: product.storeId || product.store?.id || '',
      images: product.images || [],
    });
    
    setImagePreviewUrls(product.images || []);
    setImageFiles([]);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedProducts.length === 0) return;
    
    try {
      if (action === 'delete') {
        for (const productId of selectedProducts) {
          await deleteProduct.mutateAsync(productId);
        }
      } else {
        await bulkUpdateProducts.mutateAsync({
          productIds: selectedProducts,
          updates: { status: action }
        });
      }
      setSelectedProducts([]);
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const products = productsData?.data || [];
  const totalProducts = productsData?.pagination?.total || 0;
  const totalPages = productsData?.pagination?.pages || 1;

  const statusCounts = useMemo(() => {
    return products.reduce((acc: Record<string, number>, product: { status?: string }) => {
      if (!product.status) return acc;
      acc[product.status] = (acc[product.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [products]);

  const lowStockProducts = useMemo(
    () => products.filter((product: any) => product.stockQuantity <= 10),
    [products]
  );

  const productStatusMeta: Record<string, { label: string; tone: StatusTone }> = {
    active: { label: "Active", tone: "default" },
    draft: { label: "Draft", tone: "default" },
    archived: { label: "Archived", tone: "muted" },
    inactive: { label: "Inactive", tone: "muted" },
  };

  const storeOptions = useMemo(
    () =>
      stores.map((store: any) => ({
        value: store.id,
        label: store.name,
      })),
    [stores]
  );

  const categoryOptions = useMemo(
    () => [
      { value: "electronics", label: "Electronics" },
      { value: "clothing", label: "Clothing" },
      { value: "books", label: "Books" },
      { value: "home", label: "Home & Garden" },
      { value: "sports", label: "Sports & Outdoors" },
      { value: "beauty", label: "Beauty & Health" },
    ],
    []
  );

  const productSummaryCards = [
    {
      key: "total",
      label: "Total Products",
      value: totalProducts.toLocaleString(),
      context: adminView
        ? storeFilter
          ? "In selected store"
          : "Across all stores"
        : "In your store",
      icon: Package,
      tone: "default" as const,
    },
    {
      key: "active",
      label: "Active",
      value: (statusCounts["active"] ?? 0).toLocaleString(),
      context: "Currently selling",
      icon: TrendingUp,
      tone: "default" as const,
    },
    {
      key: "draft",
      label: "Draft",
      value: (statusCounts["draft"] ?? 0).toLocaleString(),
      context: "Pending publish",
      icon: Edit,
      tone: "default" as const,
    },
    {
      key: "low-stock",
      label: "Low Stock",
      value: lowStockProducts.length.toLocaleString(),
      context: "≤ 10 units remaining",
      icon: AlertTriangle,
      tone: "default" as const,
    },
  ];

  const handleExport = () => {
    if (products.length === 0) {
      setErrorMessage("No products to export.");
      return;
    }

    const csvData = products.map((p: any) => ({
      Name: p.name,
      SKU: p.sku,
      Price: p.price,
      Sale_Price: p.salePrice || "",
      Stock: p.stockQuantity,
      Status: p.status,
      Category: p.category || "",
      Store: p.wooStore?.name || "",
      Total_Sales: p.salesData?.totalSales || 0,
      Total_Revenue: p.salesData?.totalRevenue || 0,
      Last_Sale: p.salesData?.lastSaleDate
        ? new Date(p.salesData.lastSaleDate).toLocaleDateString()
        : "Never",
      Monthly_Sales: p.salesData?.monthlySales || 0,
      Weekly_Sales: p.salesData?.weeklySales || 0,
      Daily_Sales: p.salesData?.dailySales || 0,
    }));

    const csv =
      csvData.length > 0 && csvData[0]
        ? [
            Object.keys(csvData[0]).join(","),
            ...csvData.map((row) => Object.values(row || {}).join(",")),
          ].join("\n")
        : "No data to export";

    const blob = new window.Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading products...</p>
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
              <CardTitle>Error loading products</CardTitle>
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
            title="Products"
            description={adminView ? 'Manage all products across all stores' : 'View your store products'}
            icon={Package}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Product</span>
                  <span className="sm:hidden">Add</span>
                </Button>
                <Link href="/inventory">
                  <Button variant="outline" size="sm" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Inventory</span>
                    <span className="sm:hidden">Stock</span>
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
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

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
              <CardDescription>Refine the product list by keyword, category or store</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search products by name, SKU, or description"
                    className="pl-10"
                  />
                </div>
                <div className="relative w-full sm:w-48">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Select value={category} onValueChange={(value) => {
                    setCategory(value);
                    setPage(1);
                  }}>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="books">Books</SelectItem>
                      <SelectItem value="home">Home & Garden</SelectItem>
                      <SelectItem value="sports">Sports & Outdoors</SelectItem>
                      <SelectItem value="beauty">Beauty & Health</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {adminView && (
                  <div className="relative w-full sm:w-52">
                    <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Select value={storeFilter} onValueChange={(value) => {
                      setStoreFilter(value);
                      setPage(1);
                    }}>
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder={`All Stores (${stores.length})`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Stores ({stores.length})</SelectItem>
                        {stores.map((store: any) => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                    setStoreFilter("");
                    setSelectedProducts([]);
                    setPage(1);
                    refetchProducts();
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {productSummaryCards.map((card) => (
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

          {/* Bulk Actions */}
          {selectedProducts.length > 0 && (
            <Card className="bg-accent/10 border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <span className="text-sm font-medium">
                    {selectedProducts.length} product(s) selected
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <ProtectedComponent permission="products.manage">
                      <Button type="button" size="sm" variant="outline" onClick={() => handleBulkAction('active')}>
                        Activate
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => handleBulkAction('draft')}>
                        Draft
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => handleBulkAction('delete')}>
                        Delete
                      </Button>
                    </ProtectedComponent>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">All Products</CardTitle>
              <CardDescription>
                {storeFilter
                  ? `Products from selected store`
                  : adminView
                  ? `Products from all stores`
                  : `Products from your store`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">No products found</p>
                  <p className="text-sm text-muted-foreground text-center">
                    {search || category || storeFilter ? 
                      'Try adjusting your filters to see more products.' :
                      'Get started by adding your first product.'
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
                          <th className="text-left p-3">
                            <Checkbox
                              checked={selectedProducts.length === products.length && products.length > 0}
                              onCheckedChange={(checked: boolean) => {
                                if (checked) {
                                  setSelectedProducts(products.map((p: any) => p.id));
                                } else {
                                  setSelectedProducts([]);
                                }
                              }}
                            />
                          </th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Product</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">SKU</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Price</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Stock</th>
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                          {adminView && (
                            <th className="text-left p-3 text-sm font-medium text-muted-foreground">Store</th>
                          )}
                          <th className="text-left p-3 text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product: any) => (
                          <tr key={product.id} className="border-b border-border hover:bg-muted/20">
                            <td className="p-3">
                              <Checkbox
                                checked={selectedProducts.includes(product.id)}
                                onCheckedChange={(checked: boolean) => {
                                  if (checked) {
                                    setSelectedProducts([...selectedProducts, product.id]);
                                  } else {
                                    setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                                  {product.images?.[0] ? (
                                    <img
                                      src={product.images[0]}
                                      alt={product.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <ImagePlaceholder className="h-full w-full" labelHidden />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {product.name}
                                  </p>
                                  {product.category && (
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {product.category}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm font-mono text-foreground">{product.sku}</div>
                            </td>
                            <td className="p-3">
                              <div>
                                <div className="text-sm font-semibold text-foreground">
                                  {formatCurrency(product.price)}
                                </div>
                                {product.salePrice && (
                                  <div className="text-xs font-medium text-foreground">
                                    Sale: {formatCurrency(Number(product.salePrice))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className={`text-sm font-bold ${
                                product.stockQuantity <= 10 ? 'text-muted-foreground' : 
                                product.stockQuantity <= 50 ? 'text-muted-foreground' : 
                                'text-foreground'
                              }`}>
                                {product.stockQuantity}
                              </div>
                            </td>
                            <td className="p-3">
                              <StatusPill
                                label={(productStatusMeta[product.status]?.label ?? product.status) ?? ""}
                                tone={productStatusMeta[product.status]?.tone ?? "muted"}
                              />
                            </td>
                            {adminView && (
                              <td className="p-3">
                                <div className="text-sm text-foreground">{product.wooStore?.name || 'N/A'}</div>
                              </td>
                            )}
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditProduct(product)}
                                  className="gap-1"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline">Edit</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingProduct(product)}
                                  className="gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline">View</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteProduct.mutate(product.id)}
                                  className="gap-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span className="hidden xl:inline">Delete</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {products.map((product: any) => (
                      <Card key={product.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-4 sm:pt-6">
                          <div className="space-y-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedProducts.includes(product.id)}
                                onCheckedChange={(checked: boolean) => {
                                  if (checked) {
                                    setSelectedProducts([...selectedProducts, product.id]);
                                  } else {
                                    setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                  }
                                }}
                                className="mt-1"
                              />
                              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                                {product.images?.[0] ? (
                                  <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <ImagePlaceholder className="h-full w-full" labelHidden />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1 line-clamp-2">
                                  {product.name}
                                </h3>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {product.sku}
                                  </Badge>
                                  {product.category && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {product.category}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg font-bold text-foreground">
                                    {formatCurrency(product.price)}
                                  </span>
                                  {product.salePrice && (
                                    <span className="text-sm font-medium text-foreground">
                                      Sale: {formatCurrency(Number(product.salePrice))}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                  <span className={`text-sm font-bold ${
                                    product.stockQuantity <= 10 ? 'text-muted-foreground' : 
                                    product.stockQuantity <= 50 ? 'text-muted-foreground' : 
                                    'text-foreground'
                                  }`}>
                                    Stock: {product.stockQuantity}
                                  </span>
                                  <StatusPill
                                    label={(productStatusMeta[product.status]?.label ?? product.status) ?? ""}
                                    tone={productStatusMeta[product.status]?.tone ?? "muted"}
                                  />
                                </div>
                                {adminView && (
                                  <div className="text-sm text-muted-foreground mb-3">
                                    Store: {product.wooStore?.name || 'N/A'}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                                className="gap-2 flex-1 sm:flex-none"
                              >
                                <Edit className="h-4 w-4" />
                                <span>Edit</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingProduct(product)}
                                className="gap-2 flex-1 sm:flex-none"
                              >
                                <Eye className="h-4 w-4" />
                                <span>View</span>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => deleteProduct.mutate(product.id)}
                                className="gap-2 flex-1 sm:flex-none"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                      <div className="text-sm text-muted-foreground text-center sm:text-left">
                        Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalProducts)} of {totalProducts} products
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="gap-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Prev</span>
                        </Button>
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                            return (
                              <Button
                                type="button"
                                key={pageNum}
                                variant={page === pageNum ? "outline" : "outline"}
                                size="sm"
                                onClick={() => setPage(pageNum)}
                                className={cn(
                                  "min-w-[40px] px-3",
                                  page === pageNum ? "shadow-sm" : "text-muted-foreground"
                                )}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="gap-2"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Create Product Modal */}
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-lg">
                    <Plus className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <div>Create New Product</div>
                    <DialogDescription>Add a new product to your inventory and sync to WooCommerce</DialogDescription>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreateProduct();
              }} className="space-y-6">
                {adminView && (
                  <div className="space-y-2">
                    <Label htmlFor="storeId">Store *</Label>
                    <Select value={formData.storeId} onValueChange={(value) => handleInputChange('storeId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a store" />
                      </SelectTrigger>
                      <SelectContent>
                        {storeOptions.map((option: any) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors['storeId'] && (
                      <p className="text-sm text-foreground">{formErrors['storeId']}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="images">Product Images</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-ring/50 transition-colors duration-200">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files)}
                      className="hidden"
                      id="image-upload-create"
                    />
                    <label htmlFor="image-upload-create" className="cursor-pointer">
                      <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Click to upload images</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5 images</p>
                    </label>
                  </div>

                  {imagePreviewUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                      {imagePreviewUrls.map((url: string, index: number) => (
                        <div key={url} className="group relative">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="h-24 w-full rounded-lg border border-border object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background opacity-0 shadow-lg transition-all duration-200 hover:bg-muted-foreground group-hover:opacity-100"
                            aria-label="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter product name"
                      required
                    />
                    {formErrors['name'] && (
                      <p className="text-sm text-foreground">{formErrors['name']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU *</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="Enter SKU"
                      required
                    />
                    {formErrors['sku'] && (
                      <p className="text-sm text-foreground">{formErrors['sku']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      required
                    />
                    {formErrors['price'] && (
                      <p className="text-sm text-foreground">{formErrors['price']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="salePrice">Sale Price</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.salePrice}
                      onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                    <Input
                      id="stockQuantity"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.stockQuantity}
                      onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                      required
                    />
                    {formErrors['stockQuantity'] && (
                      <p className="text-sm text-foreground">{formErrors['stockQuantity']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    placeholder="Enter product description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting || createProduct.isPending}
                    className="flex-1 gap-2"
                  >
                    {isSubmitting || createProduct.isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Creating Product...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create & Sync to WooCommerce
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
                    disabled={isSubmitting || createProduct.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Product Modal */}
          <Dialog open={!!editingProduct} onOpenChange={(open) => {
            if (!open) {
              setEditingProduct(null);
              resetForm();
            }
          }}>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-lg">
                    <Edit className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <div>Edit Product</div>
                    <DialogDescription>Update product information and sync to WooCommerce</DialogDescription>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                if (editingProduct) handleUpdateProduct(editingProduct);
              }} className="space-y-6">
                {adminView && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-storeId">Store *</Label>
                    <Select value={formData.storeId} onValueChange={(value) => handleInputChange('storeId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a store" />
                      </SelectTrigger>
                      <SelectContent>
                        {storeOptions.map((option: any) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors['storeId'] && (
                      <p className="text-sm text-foreground">{formErrors['storeId']}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit-images">Product Images</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-ring/50 transition-colors duration-200">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e.target.files)}
                      className="hidden"
                      id="image-upload-edit"
                    />
                    <label htmlFor="image-upload-edit" className="cursor-pointer">
                      <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Click to upload images</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5 images</p>
                    </label>
                  </div>

                  {(formData.images.length > 0 || imagePreviewUrls.length > 0) && (
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                      {formData.images.map((url: string, index: number) => (
                        <div key={`existing-${index}`} className="group relative">
                          <img
                            src={url}
                            alt={`Product ${index + 1}`}
                            className="h-24 w-full rounded-lg border border-border object-cover"
                          />
                          <span className="absolute left-1 top-1 rounded bg-foreground px-1 text-xs text-background">
                            Current
                          </span>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background opacity-0 shadow-lg transition-all duration-200 hover:bg-muted-foreground group-hover:opacity-100"
                            aria-label="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {imagePreviewUrls.slice(formData.images.length).map((url: string, index: number) => (
                        <div key={`new-${index}`} className="group relative">
                          <img
                            src={url}
                            alt={`New ${index + 1}`}
                            className="h-24 w-full rounded-lg border border-border object-cover"
                          />
                          <span className="absolute left-1 top-1 rounded bg-foreground px-1 text-xs text-background">
                            New
                          </span>
                          <button
                            type="button"
                            onClick={() => removeImage(formData.images.length + index)}
                            className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background opacity-0 shadow-lg transition-all duration-200 hover:bg-muted-foreground group-hover:opacity-100"
                            aria-label="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Product Name *</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter product name"
                      required
                    />
                    {formErrors['name'] && (
                      <p className="text-sm text-foreground">{formErrors['name']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-sku">SKU *</Label>
                    <Input
                      id="edit-sku"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="Enter SKU"
                      required
                    />
                    {formErrors['sku'] && (
                      <p className="text-sm text-foreground">{formErrors['sku']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Price *</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      required
                    />
                    {formErrors['price'] && (
                      <p className="text-sm text-foreground">{formErrors['price']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-salePrice">Sale Price</Label>
                    <Input
                      id="edit-salePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.salePrice}
                      onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-stockQuantity">Stock Quantity *</Label>
                    <Input
                      id="edit-stockQuantity"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.stockQuantity}
                      onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                      required
                    />
                    {formErrors['stockQuantity'] && (
                      <p className="text-sm text-foreground">{formErrors['stockQuantity']}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    rows={3}
                    placeholder="Enter product description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting || updateProduct.isPending}
                    className="flex-1 gap-2"
                  >
                    {isSubmitting || updateProduct.isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4" />
                        Save & Sync to WooCommerce
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingProduct(null);
                      resetForm();
                    }}
                    disabled={isSubmitting || updateProduct.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* View Product Modal */}
          <Dialog open={!!viewingProduct} onOpenChange={(open) => {
            if (!open) setViewingProduct(null);
          }}>
            <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto mx-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="p-2 bg-accent rounded-lg">
                    <Eye className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <div>Product Details</div>
                    <DialogDescription>View product information and images</DialogDescription>
                  </div>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Product Images */}
                {viewingProduct?.images && viewingProduct.images.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium text-foreground mb-3">Product Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {viewingProduct.images.map((url: string, index: number) => (
                        <img 
                          key={index}
                          src={url} 
                          alt={`${viewingProduct.name} ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-border hover:scale-105 transition-transform duration-200 cursor-pointer"
                          onClick={() => window.open(url, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Product Name</label>
                      <p className="text-lg font-semibold text-foreground">{viewingProduct?.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">SKU</label>
                      <p className="text-lg font-mono text-foreground">{viewingProduct?.sku}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <p className="text-lg text-foreground capitalize">{viewingProduct?.category || 'Uncategorized'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <StatusPill
                        label={(productStatusMeta[viewingProduct?.status]?.label ?? viewingProduct?.status) ?? ""}
                        tone={productStatusMeta[viewingProduct?.status]?.tone ?? "muted"}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Price</label>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-foreground">${viewingProduct?.price}</p>
                        {viewingProduct?.salePrice && (
                          <p className="text-lg text-foreground font-medium">Sale: ${viewingProduct.salePrice}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Stock Quantity</label>
                      <p className={`text-2xl font-bold ${
                        viewingProduct?.stockQuantity <= 10 ? 'text-muted-foreground' : 
                        viewingProduct?.stockQuantity <= 50 ? 'text-muted-foreground' : 
                        'text-foreground'
                      }`}>
                        {viewingProduct?.stockQuantity} units
                      </p>
                    </div>
                    {adminView && viewingProduct?.store && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Store</label>
                        <p className="text-lg text-foreground">{viewingProduct.wooStore?.name || 'N/A'}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <p className="text-lg text-foreground">{new Date(viewingProduct?.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Product Description */}
                {viewingProduct?.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <div className="mt-2 p-4 bg-muted/20 rounded-lg">
                      <p className="text-foreground whitespace-pre-wrap">{viewingProduct.description}</p>
                    </div>
                  </div>
                )}

                {/* Sales Statistics */}
                {viewingProduct && <ProductSalesStats productId={viewingProduct.id} />}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border">
                <Button
                  type="button"
                  onClick={() => {
                    setViewingProduct(null);
                    handleEditProduct(viewingProduct);
                  }}
                  className="flex-1 gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Product
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setViewingProduct(null)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </ProtectedRoute>
  );
}