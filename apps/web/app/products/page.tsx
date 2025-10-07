"use client";

import { useMemo, useState } from "react";
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
import { SectionShell } from "@/components/patterns/SectionShell";
import { FormLayout } from "@/components/patterns/FormLayout";
import { MetricCard } from "@/components/patterns/MetricCard";
import { StatusPill } from "@/components/patterns/StatusPill";
import type { StatusTone } from "@/components/patterns/StatusPill";
import { ImagePlaceholder } from "@/components/patterns/ImagePlaceholder";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField as TextField } from "@/components/forms/FormField";
import { FormTextarea } from "@/components/forms/FormTextarea";
import { FormSelect } from "@/components/forms/FormSelect";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";
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
} from "lucide-react";

// Product Sales Statistics Component
function ProductSalesStats({ productId }: { productId: string }) {
  const { data: salesData, isLoading, error } = useProductSales(productId);

  if (isLoading) {
    return (
      <SectionShell
        title="Sales Statistics"
        description="Loading sales data..."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-muted/30 rounded-lg animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-6 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </SectionShell>
    );
  }

  if (error) {
    return (
      <SectionShell
        title="Sales Statistics"
        description="Failed to load sales data"
        className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30"
      >
        <div className="text-red-600 dark:text-red-400">
          Error loading sales data. Please try again.
        </div>
      </SectionShell>
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
    <SectionShell
      title="Sales Statistics"
      description="Product performance metrics"
      className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800/30"
    >
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total Sales"
          value={sales.totalSales.toString()}
          context="units sold"
        />
        <MetricCard
          label="Total Revenue"
          value={`$${sales.totalRevenue}`}
          context="generated"
        />
        <MetricCard
          label="Last Sale"
          value={sales.lastSaleDate ? new Date(sales.lastSaleDate).toLocaleDateString() : 'Never'}
          context="most recent"
        />
        <MetricCard
          label="This Month"
          value={sales.monthlySales.toString()}
          context="units"
        />
        <MetricCard
          label="This Week"
          value={sales.weeklySales.toString()}
          context="units"
        />
        <MetricCard
          label="Today"
          value={sales.dailySales.toString()}
          context="units"
        />
      </div>
    </SectionShell>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const adminView = isAdmin();
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
    active: { label: "Active", tone: "success" },
    draft: { label: "Draft", tone: "warning" },
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
      tone: "blue" as const,
    },
    {
      key: "active",
      label: "Active",
      value: (statusCounts["active"] ?? 0).toLocaleString(),
      context: "Currently selling",
      icon: TrendingUp,
      tone: "emerald" as const,
    },
    {
      key: "draft",
      label: "Draft",
      value: (statusCounts["draft"] ?? 0).toLocaleString(),
      context: "Pending publish",
      icon: Edit,
      tone: "warning" as const,
    },
    {
      key: "low-stock",
      label: "Low Stock",
      value: lowStockProducts.length.toLocaleString(),
      context: "≤ 10 units remaining",
      icon: AlertTriangle,
      tone: "destructive" as const,
    },
  ];

  const quickActions = [
    {
      key: "add",
      label: "Add Product",
      icon: Plus,
      variant: "default" as const,
      permission: "products.manage",
      onClick: () => setShowCreateModal(true),
    },
    {
      key: "inventory",
      label: "Inventory",
      icon: BarChart3,
      variant: "outline" as const,
      permission: "inventory.manage",
      href: "/inventory",
    },
    {
      key: "bulk",
      label: "Bulk Actions",
      icon: ShoppingBag,
      variant: "outline" as const,
      permission: "products.manage",
      onClick: () => {
        if (products.length === 0) {
          setErrorMessage("No products available for bulk actions.");
          return;
        }
        if (selectedProducts.length === 0) {
          setErrorMessage("Please select products to perform bulk actions.");
          return;
        }
        setSuccess(`Bulk actions for ${selectedProducts.length} products available.`);
      },
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
      Store: p.store?.name || "",
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
          <SectionShell
            title="Loading products..."
            description="Please wait while we fetch product data"
          >
            <div className="spinner"></div>
          </SectionShell>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <SectionShell
            title="Error loading products"
            description={error instanceof ApiError ? error.message : 'Database operation failed'}
            className="max-w-md mx-auto"
          >
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary btn-sm"
            >
              Retry
            </button>
          </SectionShell>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="bg-background">
        <main className="mobile-container py-6 space-y-6">
          {/* Header and Action Buttons */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="mobile-heading text-foreground flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                Products
              </h1>
              <p className="text-muted-foreground mobile-text">
                {adminView ? 'Manage all products across all stores' : 'View your store products'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {quickActions.map((action) => {
                const ActionIcon = action.icon;
                const content = action.href ? (
                  <Link
                    key={action.key}
                    href={action.href}
                    className={cn(
                      buttonVariants({ variant: action.variant, size: "lg" }),
                      "h-16 w-full flex flex-col items-center justify-center gap-1 text-xs font-medium leading-tight shadow-sm hover:shadow-md"
                    )}
                  >
                    <ActionIcon className="h-5 w-5" aria-hidden="true" />
                    <span>{action.label}</span>
                  </Link>
                ) : (
                  <Button
                    key={action.key}
                    variant={action.variant}
                    size="lg"
                    onClick={action.onClick}
                    className="h-16 w-full flex flex-col items-center justify-center gap-1 text-xs font-medium leading-tight shadow-sm hover:shadow-md"
                  >
                    <ActionIcon className="h-5 w-5" aria-hidden="true" />
                    <span>{action.label}</span>
                  </Button>
                );

                if (action.permission) {
                  return (
                    <ProtectedComponent permission={action.permission as any} key={action.key}>
                      {content}
                    </ProtectedComponent>
                  );
                }

                return content;
              })}
            </div>
          </div>

          {/* Error/Success Messages */}
          {errorMessage && (
            <SectionShell
              title="Error"
              description={errorMessage}
              className="bg-red-50 border-red-200 text-red-700"
              actions={
                <button 
                  onClick={() => setErrorMessage(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              }
            ><div /></SectionShell>
          )}

          {success && (
            <SectionShell
              title="Success"
              description={success}
              className="bg-green-50 border-green-200 text-green-700"
              actions={
                <button 
                  onClick={() => setSuccess(null)}
                  className="text-green-500 hover:text-green-700"
                >
                  ×
                </button>
              }
            ><div /></SectionShell>
          )}

          {/* Enhanced Filters */}
          <SectionShell
            title="Filters"
            description="Refine the product list by keyword, category or store"
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <TextField
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search products by name, SKU, or description"
                  className="h-11 pl-10"
                />
              </div>
              <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setPage(1);
                  }}
                  className="h-11 w-full appearance-none rounded-md border border-border bg-background pl-10 pr-8 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="Filter by category"
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
              {adminView && (
                <div className="relative w-full sm:w-52">
                  <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select
                    value={storeFilter}
                    onChange={(e) => {
                      setStoreFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-11 w-full appearance-none rounded-md border border-border bg-background pl-10 pr-8 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label="Filter by store"
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
            <div className="flex flex-col gap-3 sm:flex-row">
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
                className="gap-2 h-10 w-full sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reset Filters
              </Button>
              <ProtectedComponent permission="products.manage">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExport}
                  className="gap-2 h-10 w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export CSV
                </Button>
              </ProtectedComponent>
            </div>
          </SectionShell>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {productSummaryCards.map((card) => (
              <MetricCard
                key={card.key}
                label={card.label}
                value={card.value}
                context={card.context}
                tone={card.tone}
              />
            ))}
          </div>

          {/* Bulk Actions */}
          {selectedProducts.length > 0 && (
            <div className="p-4 bg-muted/40 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedProducts.length} product(s) selected
                </span>
                <div className="flex gap-2">
                  <ProtectedComponent permission="products.manage">
                    <Button type="button" size="sm" variant="outline" onClick={() => handleBulkAction('active')}>
                      Activate
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleBulkAction('draft')}>
                      Draft
                    </Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                      Delete
                    </Button>
                  </ProtectedComponent>
                </div>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="p-4 sm:p-6 bg-muted/40 rounded-xl border border-border shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">All Products</h3>
                <p className="text-sm text-muted-foreground">
                  {storeFilter
                    ? `Products from selected store`
                    : adminView
                    ? `Products from all stores`
                    : `Products from your store`}
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
                      {adminView && (
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
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground truncate max-w-[180px]">
                                  {product.name}
                                </p>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
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
                            <div className="text-sm font-semibold text-foreground">
                              {formatCurrency(product.price)}
                            </div>
                            {product.salePrice && (
                              <div className="text-xs font-medium text-emerald-600">
                                Sale: {formatCurrency(Number(product.salePrice))}
                              </div>
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
                          <StatusPill
                            label={(productStatusMeta[product.status]?.label ?? product.status) ?? ""}
                            tone={productStatusMeta[product.status]?.tone ?? "muted"}
                          />
                        </td>
                      {adminView && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-foreground">{product.store?.name || 'N/A'}</div>
                          </td>
                      )}
                      <ProtectedComponent permission="products.manage">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              className="gap-1"
                            >
                              <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingProduct(product)}
                              className="gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              View
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteProduct.mutate(product.id)}
                              className="gap-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </ProtectedComponent>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={adminView ? 7 : 6} className="px-6 py-12 text-center">
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
                    className="gap-2 min-w-[80px]"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Prev
                  </Button>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                      return (
                        <Button
                          type="button"
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
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
                    className="gap-2 min-w-[80px]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Create Product Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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

                
                <FormLayout
                  title="Product Information"
                  description="Provide the core details required to publish this product."
                  actions={
                    <span className="text-xs font-medium text-muted-foreground">
                      Fields marked with * are required
                    </span>
                  }
                >
                  {adminView && (
                    <FormLayout.Section
                      title="Store"
                      description="Select which store this product belongs to."
                    >
                      <FormSelect
                        required
                        label="Store"
                        placeholder="Select a store"
                        value={formData.storeId}
                        onChange={(e) => handleInputChange('storeId', e.target.value)}
                        options={storeOptions}
                        error={formErrors['storeId'] || ''}
                      />
                    </FormLayout.Section>
                  )}

                  <FormLayout.Section
                    title="Product Images"
                    description="Upload up to 5 images. PNG, JPG, WEBP formats are supported."
                  >
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
                                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-lg transition-all duration-200 hover:bg-red-600 group-hover:opacity-100"
                                aria-label="Remove image"
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
                  </FormLayout.Section>

                  <FormLayout.Section title="Details" columns={2}>
                    <TextField
                      required
                      label="Product Name"
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      error={formErrors['name'] || ''}
                    />
                    <TextField
                      required
                      label="SKU"
                      placeholder="Enter SKU"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      error={formErrors['sku'] || ''}
                    />
                    <TextField
                      required
                      label="Price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      error={formErrors['price'] || ''}
                    />
                    <TextField
                      label="Sale Price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.salePrice}
                      onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                    />
                    <TextField
                      required
                      label="Stock Quantity"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.stockQuantity}
                      onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                      error={formErrors['stockQuantity'] || ''}
                    />
                    <FormSelect
                      label="Category"
                      placeholder="Select category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      options={categoryOptions}
                    />
                  </FormLayout.Section>

                  <FormLayout.Section title="Description">
                    <FormTextarea
                      label="Description"
                      rows={3}
                      placeholder="Enter product description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </FormLayout.Section>
                </FormLayout>

                <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
                  <Button
                    type="button"
                    onClick={handleCreateProduct}
                    disabled={isSubmitting || createProduct.isPending}
                    className="flex-1 gap-2 sm:flex-none"
                  >
                    {isSubmitting || createProduct.isPending ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Creating Product...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" aria-hidden="true" />
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
                    className="flex-1 gap-2 sm:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Product Modal */}
          {editingProduct && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-background p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Edit className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Edit Product</h3>
                      <p className="text-sm text-muted-foreground">
                        Update product information and sync to WooCommerce
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setEditingProduct(null);
                      resetForm();
                    }}
                    aria-label="Close edit modal"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <FormLayout
                  title="Product Information"
                  description="Adjust the product details and confirm to keep your catalog in sync."
                  actions={
                    <span className="text-xs font-medium text-muted-foreground">
                      Fields marked with * are required
                    </span>
                  }
                >
                  {adminView && (
                    <FormLayout.Section
                      title="Store"
                      description="Update which store owns this product."
                    >
                      <FormSelect
                        required
                        label="Store"
                        placeholder="Select a store"
                        value={formData.storeId}
                        onChange={(e) => handleInputChange('storeId', e.target.value)}
                        options={storeOptions}
                        error={formErrors['storeId'] || ''}
                      />
                    </FormLayout.Section>
                  )}

                  <FormLayout.Section
                    title="Product Images"
                    description="Upload new images or remove existing ones. Maximum 5 images."
                  >
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
                              <span className="absolute left-1 top-1 rounded bg-blue-500 px-1 text-xs text-white">
                                Current
                              </span>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-lg transition-all duration-200 hover:bg-red-600 group-hover:opacity-100"
                                aria-label="Remove image"
                              >
                                ✕
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
                              <span className="absolute left-1 top-1 rounded bg-emerald-500 px-1 text-xs text-white">
                                New
                              </span>
                              <button
                                type="button"
                                onClick={() => removeImage(formData.images.length + index)}
                                className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white opacity-0 shadow-lg transition-all duration-200 hover:bg-red-600 group-hover:opacity-100"
                                aria-label="Remove image"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormLayout.Section>

                  <FormLayout.Section title="Details" columns={2}>
                    <TextField
                      required
                      label="Product Name"
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      error={formErrors['name'] || ''}
                    />
                    <TextField
                      required
                      label="SKU"
                      placeholder="Enter SKU"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      error={formErrors['sku'] || ''}
                    />
                    <TextField
                      required
                      label="Price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      error={formErrors['price'] || ''}
                    />
                    <TextField
                      label="Sale Price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.salePrice}
                      onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                    />
                    <TextField
                      required
                      label="Stock Quantity"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.stockQuantity}
                      onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                      error={formErrors['stockQuantity'] || ''}
                    />
                    <FormSelect
                      label="Category"
                      placeholder="Select category"
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      options={categoryOptions}
                    />
                  </FormLayout.Section>

                  <FormLayout.Section title="Description">
                    <FormTextarea
                      label="Description"
                      rows={3}
                      placeholder="Enter product description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    />
                  </FormLayout.Section>
                </FormLayout>

                <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => handleUpdateProduct(editingProduct)}
                    disabled={isSubmitting || updateProduct.isPending}
                    className="flex-1 gap-2 sm:flex-none"
                  >
                    {isSubmitting || updateProduct.isPending ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4" aria-hidden="true" />
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
                    className="flex-1 gap-2 sm:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
      {/* View Product Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background p-6 sm:p-8 rounded-xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
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
                  {adminView && viewingProduct.store && (
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
            
            <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
              <Button
                type="button"
                onClick={() => {
                  setViewingProduct(null);
                  handleEditProduct(viewingProduct);
                }}
                className="flex-1 gap-2 sm:flex-none"
              >
                <Edit className="h-4 w-4" aria-hidden="true" />
                Edit Product
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewingProduct(null)}
                className="flex-1 gap-2 sm:flex-none"
              >
                Close
              </Button>
            </div>
          </div>
            </div>
          )}
        </div>
    </ProtectedRoute>
  );
}
