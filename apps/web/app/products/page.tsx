"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { 
  useProducts, 
  useDeleteProduct, 
  useBulkUpdateProducts,
  useCreateProduct,
  useUpdateProduct,
  useStores,
  useProductSales
} from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";
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
  DollarSign,
  ShoppingCart,
  Calendar
} from "lucide-react";

// Product Sales Statistics Component
function ProductSalesStats({ productId }: { productId: string }) {
  const { data: salesData, isLoading, error } = useProductSales(productId);

  if (isLoading) {
    return (
      <div className="bg-muted/20 p-6 rounded-xl border border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-foreground">Sales Statistics</h4>
            <p className="text-sm text-muted-foreground">Loading sales data...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-6 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800/30">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-red-800 dark:text-red-200">Sales Statistics</h4>
            <p className="text-sm text-red-600 dark:text-red-400">Failed to load sales data</p>
          </div>
        </div>
      </div>
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
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800/30">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h4 className="text-lg font-semibold text-foreground">Sales Statistics</h4>
          <p className="text-sm text-muted-foreground">Product performance metrics</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-card/50 p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ShoppingCart className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total Sales</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{sales.totalSales}</div>
          <div className="text-xs text-muted-foreground">units sold</div>
        </div>

        <div className="bg-white dark:bg-card/50 p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
          </div>
          <div className="text-2xl font-bold text-foreground">${sales.totalRevenue}</div>
          <div className="text-xs text-muted-foreground">generated</div>
        </div>

        <div className="bg-white dark:bg-card/50 p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Last Sale</span>
          </div>
          <div className="text-lg font-semibold text-foreground">
            {sales.lastSaleDate ? new Date(sales.lastSaleDate).toLocaleDateString() : 'Never'}
          </div>
          <div className="text-xs text-muted-foreground">most recent</div>
        </div>

        <div className="bg-white dark:bg-card/50 p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">This Month</span>
          </div>
          <div className="text-xl font-bold text-foreground">{sales.monthlySales}</div>
          <div className="text-xs text-muted-foreground">units</div>
        </div>

        <div className="bg-white dark:bg-card/50 p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <BarChart3 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">This Week</span>
          </div>
          <div className="text-xl font-bold text-foreground">{sales.weeklySales}</div>
          <div className="text-xs text-muted-foreground">units</div>
        </div>

        <div className="bg-white dark:bg-card/50 p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <Package className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Today</span>
          </div>
          <div className="text-xl font-bold text-foreground">{sales.dailySales}</div>
          <div className="text-xs text-muted-foreground">units</div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
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
    error
  } = useProducts({
    page,
    limit: 10,
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(isAdmin() && storeFilter ? { storeId: storeFilter } : {}),
    ...(!isAdmin() && userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<any>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: ApiError | null };

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
      storeId: product.storeId || '',
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading products...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 max-w-md mx-auto p-6">
            <div className="text-red-500 text-lg font-semibold">Error loading products</div>
            <div className="text-muted-foreground text-center">
              {error instanceof ApiError ? error.message : 'Database operation failed'}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary btn-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const products = productsData?.data || [];
  const totalProducts = productsData?.pagination?.total || 0;
  const totalPages = productsData?.pagination?.pages || 1;

  const statusCounts = products.reduce((acc: Record<string, number>, product: any) => {
    acc[product.status] = (acc[product.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lowStockProducts = products.filter((product: any) => product.stockQuantity <= 10);

  return (
    <ProtectedRoute>
      <div className="bg-background">
        <main className="mobile-container py-6 space-y-6">
          {/* Header and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-1">
              <h1 className="mobile-heading text-foreground flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                Products
              </h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage all products across all stores' : 'View your store products'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ProtectedComponent permission="products.manage">
              <button 
                onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary btn-md flex flex-col items-center justify-center gap-1 shadow-lg hover:shadow-xl transition-all duration-200 w-full h-16"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Add Product</span>
                </button>
              </ProtectedComponent>
              <ProtectedComponent permission="inventory.manage">
                <Link href="/inventory" className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Inventory</span>
                </Link>
              </ProtectedComponent>
              <ProtectedComponent permission="products.manage">
                <button 
                  onClick={() => {
                    if (selectedProducts.length === 0) {
                      setErrorMessage('Please select products to perform bulk actions.');
                      return;
                    }
                    setSuccess(`Bulk actions for ${selectedProducts.length} products available.`);
                  }}
                  className="btn btn-outline btn-md flex flex-col items-center justify-center gap-1 hover:bg-accent/50 transition-all duration-200 w-full h-16"
                >
                  <ShoppingBag className="h-5 w-5" />
                  <span className="text-xs font-medium leading-tight">Bulk Actions</span>
              </button>
            </ProtectedComponent>
            </div>
          </div>

          {/* Error/Success Messages */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {errorMessage}
                <button 
                  onClick={() => setErrorMessage(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {success}
                <button 
                  onClick={() => setSuccess(null)}
                  className="ml-auto text-green-500 hover:text-green-700"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Filters */}
          <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
            <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
                    placeholder="Search products by name, SKU, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
                </div>
                <div className="relative w-full sm:w-auto sm:min-w-[160px]">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
                    className="w-full pl-10 pr-8 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="books">Books</option>
              <option value="home">Home & Garden</option>
                    <option value="sports">Sports & Outdoors</option>
                    <option value="beauty">Beauty & Health</option>
            </select>
          </div>
                {isAdmin() && (
                  <div className="relative w-full sm:w-auto sm:min-w-[180px]">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      value={storeFilter}
                      onChange={(e) => setStoreFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 appearance-none cursor-pointer"
                    >
                      <option value="">All Stores ({stores.length})</option>
                      {stores.map((store: any) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                    setStoreFilter("");
                    setPage(1);
                    window.location.reload();
                  }}
                  className="btn btn-outline btn-md flex items-center justify-center gap-2 hover:bg-accent/50 transition-all duration-200 w-full sm:w-auto sm:min-w-[100px] h-10"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm font-medium">Refresh</span>
                </button>
                <ProtectedComponent permission="products.manage">
                  <button 
                    onClick={() => {
                      if (products.length === 0) {
                        setErrorMessage('No products to export.');
                        return;
                      }
                      
                      const csvData = products.map((p: any) => ({
                        Name: p.name,
                        SKU: p.sku,
                        Price: p.price,
                        Sale_Price: p.salePrice || '',
                        Stock: p.stockQuantity,
                        Status: p.status,
                        Category: p.category || '',
                        Store: p.store?.name || '',
                        Total_Sales: p.salesData?.totalSales || 0,
                        Total_Revenue: p.salesData?.totalRevenue || 0,
                        Last_Sale: p.salesData?.lastSaleDate ? new Date(p.salesData.lastSaleDate).toLocaleDateString() : 'Never',
                        Monthly_Sales: p.salesData?.monthlySales || 0,
                        Weekly_Sales: p.salesData?.weeklySales || 0,
                        Daily_Sales: p.salesData?.dailySales || 0,
                      }));
                      
                      const csv = csvData.length > 0 && csvData[0] ? [
                        Object.keys(csvData[0]).join(','),
                        ...csvData.map(row => Object.values(row || {}).join(','))
                      ].join('\n') : 'No data to export';
                      
                      const blob = new window.Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="btn btn-outline btn-md flex items-center justify-center gap-2 hover:bg-accent/50 transition-all duration-200 w-full sm:w-auto sm:min-w-[100px] h-10"
                  >
                    <Download className="h-4 w-4" />
                    <span className="text-sm font-medium">Export</span>
                  </button>
                </ProtectedComponent>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-6 w-6 text-primary" />
              </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{totalProducts}</div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdmin() ? 
                  (storeFilter ? 'In selected store' : 'Across all stores') : 
                  'In your store'
                }
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{statusCounts['active'] || 0}</div>
                  <p className="text-sm text-muted-foreground">Active</p>
            </div>
              </div>
              <p className="text-xs text-green-600">Currently selling</p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Edit className="h-6 w-6 text-yellow-600" />
              </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-yellow-600">{statusCounts['draft'] || 0}</div>
                  <p className="text-sm text-muted-foreground">Draft</p>
            </div>
              </div>
              <p className="text-xs text-yellow-600">Pending publish</p>
          </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{lowStockProducts.length}</div>
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                    </div>
                  </div>
              <p className="text-xs text-red-600">≤ 10 units remaining</p>
              </div>
            </div>

          {/* Bulk Actions */}
          {selectedProducts.length > 0 && (
            <div className="bg-accent p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedProducts.length} product(s) selected
                </span>
                <div className="flex gap-2">
                  <ProtectedComponent permission="products.manage">
                    <button
                      onClick={() => handleBulkAction('active')}
                      className="btn btn-sm btn-outline"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => handleBulkAction('draft')}
                      className="btn btn-sm btn-outline"
                    >
                      Draft
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="btn btn-sm btn-destructive"
                    >
                      Delete
                    </button>
                  </ProtectedComponent>
                </div>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">All Products</h3>
                <p className="text-sm text-muted-foreground">
                  {storeFilter ? `Products from selected store` : 
                   isAdmin() ? `Products from all stores` : `Products from your store`}
                </p>
                </div>
            </div>
            
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50 dark:bg-muted/20">
                    <tr>
                      <th scope="col" className="relative w-12 px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === products.length && products.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                              setSelectedProducts(products.map((p: any) => p.id));
                          } else {
                            setSelectedProducts([]);
                          }
                        }}
                          className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background"
                      />
                    </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[200px]">
                        Product
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[120px]">
                        SKU
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[100px]">
                        Price
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[80px]">
                        Stock
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[100px]">
                        Status
                      </th>
                      {isAdmin() && (
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[120px]">
                          Store
                        </th>
                      )}
                    <ProtectedComponent permission="products.manage">
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-foreground/80 dark:text-foreground/90 uppercase tracking-wider min-w-[200px]">
                          Actions
                        </th>
                    </ProtectedComponent>
                  </tr>
                </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {products.map((product: any) => (
                      <tr key={product.id} className="hover:bg-muted/20 transition-colors duration-150">
                        <td className="relative w-12 px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProducts([...selectedProducts, product.id]);
                            } else {
                              setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                            }
                          }}
                            className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background"
                        />
                      </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                                  {product.name}
                                </p>
                          </div>
                              <div className="flex items-center gap-2 mt-1">
                                {product.category && (
                                  <p className="text-xs text-muted-foreground capitalize">
                            {product.category}
                                  </p>
                            )}
                              </div>
                          </div>
                        </div>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-foreground">{product.sku}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                            <div className="text-sm font-semibold text-foreground">${product.price}</div>
                          {product.salePrice && (
                              <div className="text-xs text-green-600 font-medium">Sale: ${product.salePrice}</div>
                          )}
                        </div>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-bold ${
                          product.stockQuantity <= 10 ? 'text-red-600' : 
                          product.stockQuantity <= 50 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>
                          {product.stockQuantity}
                        </div>
                      </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${
                            product.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            product.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      {isAdmin() && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-foreground">{product.store?.name || 'N/A'}</div>
                          </td>
                      )}
                      <ProtectedComponent permission="products.manage">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEditProduct(product)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200"
                            >
                                <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </button>
                              <button 
                                onClick={() => setViewingProduct(product)}
                                className="inline-flex items-center px-3 py-1.5 border border-border text-xs font-medium rounded-md text-foreground bg-background hover:bg-muted/50 dark:hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </button>
                            <button 
                              onClick={() => deleteProduct.mutate(product.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-800 bg-red-100 hover:bg-red-200 dark:text-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-background transition-all duration-200"
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </ProtectedComponent>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                        <td colSpan={isAdmin() ? 7 : 6} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
                            <p className="text-lg font-medium text-muted-foreground mb-2">No products found</p>
                            <p className="text-sm text-muted-foreground">
                              {search || category || storeFilter ? 
                                'Try adjusting your filters to see more products.' :
                                'Get started by adding your first product.'
                              }
                            </p>
                          </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalProducts)} of {totalProducts} products
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

          {/* Create Product Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-card p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Create New Product</h3>
                      <p className="text-sm text-muted-foreground">Add a new product to your inventory and sync to WooCommerce</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-muted/50 rounded-lg transition-colors duration-200"
                  >
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Store Selection */}
                  {isAdmin() && (
                    <div>
                      <label className="form-label">Store *</label>
                      <select 
                        className={`form-select ${formErrors['storeId'] ? 'border-red-500' : ''}`}
                        value={formData.storeId}
                        onChange={(e) => handleInputChange('storeId', e.target.value)}
                      >
                        <option value="">Select a store</option>
                        {stores.map((store: any) => (
                          <option key={store.id} value={store.id}>
                            {store.name}
                          </option>
                        ))}
                      </select>
                      {formErrors['storeId'] && <p className="text-red-500 text-sm mt-1">{formErrors['storeId']}</p>}
                    </div>
                  )}

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
                          id="image-upload-create"
                        />
                        <label htmlFor="image-upload-create" className="cursor-pointer">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-foreground font-medium">Click to upload images</p>
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
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className={`form-input ${formErrors['name'] ? 'border-red-500' : ''}`}
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                    {formErrors['name'] && <p className="text-red-500 text-sm mt-1">{formErrors['name']}</p>}
                  </div>
                  <div>
                    <label className="form-label">SKU *</label>
                    <input
                      type="text"
                      className={`form-input ${formErrors['sku'] ? 'border-red-500' : ''}`}
                      placeholder="Enter SKU"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                    />
                    {formErrors['sku'] && <p className="text-red-500 text-sm mt-1">{formErrors['sku']}</p>}
                  </div>
                  <div>
                    <label className="form-label">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`form-input ${formErrors['price'] ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    />
                    {formErrors['price'] && <p className="text-red-500 text-sm mt-1">{formErrors['price']}</p>}
                  </div>
                  <div>
                    <label className="form-label">Sale Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="0.00"
                      value={formData.salePrice}
                      onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Stock Quantity *</label>
                    <input
                      type="number"
                      className={`form-input ${formErrors['stockQuantity'] ? 'border-red-500' : ''}`}
                      placeholder="0"
                      value={formData.stockQuantity}
                      onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                    />
                    {formErrors['stockQuantity'] && <p className="text-red-500 text-sm mt-1">{formErrors['stockQuantity']}</p>}
                  </div>
                  <div>
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                    >
                      <option value="">Select category</option>
                      <option value="electronics">Electronics</option>
                      <option value="clothing">Clothing</option>
                      <option value="books">Books</option>
                      <option value="home">Home & Garden</option>
                    </select>
                  </div>
                    <div className="md:col-span-2">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-textarea"
                        rows={3}
                        placeholder="Enter product description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
                  <button 
                    onClick={handleCreateProduct}
                    disabled={isSubmitting || createProduct.isPending}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {isSubmitting || createProduct.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Product...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create & Sync to WooCommerce
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    disabled={isSubmitting || createProduct.isPending}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Product Modal */}
          {editingProduct && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-card p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Edit className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                      <h3 className="text-xl font-semibold text-foreground">Edit Product</h3>
                      <p className="text-sm text-muted-foreground">Update product information and sync to WooCommerce</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="p-2 hover:bg-muted/50 rounded-lg transition-colors duration-200"
                  >
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  </div>
                
                <div className="space-y-6">
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
                          id="image-upload-edit"
                        />
                        <label htmlFor="image-upload-edit" className="cursor-pointer">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-foreground font-medium">Click to upload new images</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5 images total</p>
                        </label>
                      </div>

                      {(imagePreviewUrls.length > 0 || formData.images.length > 0) && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {formData.images.map((url: string, index: number) => (
                            <div key={`existing-${index}`} className="relative group">
                              <img 
                                src={url} 
                                alt={`Product ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-border"
                              />
                              <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                                Current
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                          {imagePreviewUrls.slice(formData.images.length).map((url: string, index: number) => (
                            <div key={`new-${index}`} className="relative group">
                              <img 
                                src={url} 
                                alt={`New ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-border"
                              />
                              <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                                New
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(formData.images.length + index)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Product Name *</label>
                      <input
                        type="text"
                        className={`form-input ${formErrors['name'] ? 'border-red-500' : ''}`}
                        placeholder="Enter product name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                      />
                      {formErrors['name'] && <p className="text-red-500 text-sm mt-1">{formErrors['name']}</p>}
                    </div>
                    <div>
                      <label className="form-label">SKU *</label>
                      <input
                        type="text"
                        className={`form-input ${formErrors['sku'] ? 'border-red-500' : ''}`}
                        placeholder="Enter SKU"
                        value={formData.sku}
                        onChange={(e) => handleInputChange('sku', e.target.value)}
                      />
                      {formErrors['sku'] && <p className="text-red-500 text-sm mt-1">{formErrors['sku']}</p>}
                    </div>
                    <div>
                      <label className="form-label">Price *</label>
                        <input
                          type="number"
                        step="0.01"
                        className={`form-input ${formErrors['price'] ? 'border-red-500' : ''}`}
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      />
                      {formErrors['price'] && <p className="text-red-500 text-sm mt-1">{formErrors['price']}</p>}
                      </div>
                      <div>
                      <label className="form-label">Sale Price</label>
                        <input
                          type="number"
                        step="0.01"
                          className="form-input"
                        placeholder="0.00"
                        value={formData.salePrice}
                        onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                      <label className="form-label">Stock Quantity *</label>
                        <input
                          type="number"
                        className={`form-input ${formErrors['stockQuantity'] ? 'border-red-500' : ''}`}
                          placeholder="0"
                        value={formData.stockQuantity}
                        onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                        />
                      {formErrors['stockQuantity'] && <p className="text-red-500 text-sm mt-1">{formErrors['stockQuantity']}</p>}
                      </div>
                      <div>
                      <label className="form-label">Category</label>
                        <select 
                          className="form-select"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                      >
                        <option value="">Select category</option>
                        <option value="electronics">Electronics</option>
                        <option value="clothing">Clothing</option>
                        <option value="books">Books</option>
                        <option value="home">Home & Garden</option>
                        </select>
                      </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Enter product description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
                  <button 
                    onClick={handleCreateProduct}
                    disabled={isSubmitting || createProduct.isPending}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {isSubmitting || createProduct.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Product...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create & Sync to WooCommerce
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    disabled={isSubmitting || createProduct.isPending}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Product Modal */}
          {editingProduct && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-card p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Edit className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Edit Product</h3>
                      <p className="text-sm text-muted-foreground">Update product information and sync to WooCommerce</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="p-2 hover:bg-muted/50 rounded-lg transition-colors duration-200"
                  >
                    <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-6">
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
                          id="image-upload-edit"
                        />
                        <label htmlFor="image-upload-edit" className="cursor-pointer">
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-foreground font-medium">Click to upload new images</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 5 images total</p>
                        </label>
                      </div>

                      {(imagePreviewUrls.length > 0 || formData.images.length > 0) && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {formData.images.map((url: string, index: number) => (
                            <div key={`existing-${index}`} className="relative group">
                              <img 
                                src={url} 
                                alt={`Product ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-border"
                              />
                              <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                                Current
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                          {imagePreviewUrls.slice(formData.images.length).map((url: string, index: number) => (
                            <div key={`new-${index}`} className="relative group">
                              <img 
                                src={url} 
                                alt={`New ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-border"
                              />
                              <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded">
                                New
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(formData.images.length + index)}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                              >
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className={`form-input ${formErrors['name'] ? 'border-red-500' : ''}`}
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                    {formErrors['name'] && <p className="text-red-500 text-sm mt-1">{formErrors['name']}</p>}
                  </div>
                  <div>
                    <label className="form-label">SKU *</label>
                    <input
                      type="text"
                      className={`form-input ${formErrors['sku'] ? 'border-red-500' : ''}`}
                      placeholder="Enter SKU"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                    />
                    {formErrors['sku'] && <p className="text-red-500 text-sm mt-1">{formErrors['sku']}</p>}
                  </div>
                  <div>
                    <label className="form-label">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`form-input ${formErrors['price'] ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    />
                    {formErrors['price'] && <p className="text-red-500 text-sm mt-1">{formErrors['price']}</p>}
                  </div>
                  <div>
                    <label className="form-label">Sale Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="0.00"
                      value={formData.salePrice}
                      onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Stock Quantity *</label>
                    <input
                      type="number"
                      className={`form-input ${formErrors['stockQuantity'] ? 'border-red-500' : ''}`}
                      placeholder="0"
                      value={formData.stockQuantity}
                      onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                    />
                    {formErrors['stockQuantity'] && <p className="text-red-500 text-sm mt-1">{formErrors['stockQuantity']}</p>}
                  </div>
                  <div>
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                    >
                      <option value="">Select category</option>
                      <option value="electronics">Electronics</option>
                      <option value="clothing">Clothing</option>
                      <option value="books">Books</option>
                      <option value="home">Home & Garden</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="Enter product description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </div>
                </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
                  <button 
                    onClick={() => handleUpdateProduct(editingProduct)}
                    disabled={isSubmitting || updateProduct.isPending}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    {isSubmitting || updateProduct.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating Product...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Update & Sync to WooCommerce
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingProduct(null);
                      resetForm();
                    }}
                    disabled={isSubmitting || updateProduct.isPending}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* View Product Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Product Details</h3>
                  <p className="text-sm text-muted-foreground">View product information and images</p>
                </div>
              </div>
                    <button 
                onClick={() => setViewingProduct(null)}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors duration-200"
                    >
                <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                    </button>
                  </div>
                  
            <div className="space-y-6">
              {/* Product Images */}
              {viewingProduct.images && viewingProduct.images.length > 0 && (
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
                    <p className="text-lg font-semibold text-foreground">{viewingProduct.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">SKU</label>
                    <p className="text-lg font-mono text-foreground">{viewingProduct.sku}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <p className="text-lg text-foreground capitalize">{viewingProduct.category || 'Uncategorized'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      viewingProduct.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                      viewingProduct.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
                    }`}>
                      {viewingProduct.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Price</label>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-foreground">${viewingProduct.price}</p>
                      {viewingProduct.salePrice && (
                        <p className="text-lg text-green-600 font-medium">Sale: ${viewingProduct.salePrice}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Stock Quantity</label>
                    <p className={`text-2xl font-bold ${
                      viewingProduct.stockQuantity <= 10 ? 'text-red-600' : 
                      viewingProduct.stockQuantity <= 50 ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {viewingProduct.stockQuantity} units
                    </p>
                  </div>
                  {isAdmin() && viewingProduct.store && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Store</label>
                      <p className="text-lg text-foreground">{viewingProduct.store.name}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-lg text-foreground">{new Date(viewingProduct.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Product Description */}
              {viewingProduct.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <div className="mt-2 p-4 bg-muted/20 rounded-lg">
                    <p className="text-foreground whitespace-pre-wrap">{viewingProduct.description}</p>
                  </div>
                </div>
              )}

              {/* Sales Statistics */}
              <ProductSalesStats productId={viewingProduct.id} />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-border">
                  <button 
                onClick={() => {
                  setViewingProduct(null);
                  handleEditProduct(viewingProduct);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
                  </button>
                  <button 
                onClick={() => setViewingProduct(null)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-3 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-all duration-200"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
                  </button>
                </div>
              </div>
            </div>
          )}
    </ProtectedRoute>
  );
}