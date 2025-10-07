"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { SectionShell } from "@/components/patterns/SectionShell";
import { FormLayout } from "@/components/patterns/FormLayout";
import { StatusPill } from "@/components/patterns/StatusPill";
import { ImagePlaceholder } from "@/components/patterns/ImagePlaceholder";
import { Button } from "@/components/ui/button";
import { FormField as TextField } from "@/components/forms/FormField";
import { FormTextarea } from "@/components/forms/FormTextarea";
import { FormSelect } from "@/components/forms/FormSelect";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/formatters";
import { logger } from "@/lib/logger";
import { Edit, X } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  useAuth();
  useRBAC();
  const productId = params['id'] as string;
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editData, setEditData] = useState({
    name: "",
    description: "",
    price: 0,
    salePrice: 0,
    sku: "",
    stockQuantity: 0,
    category: "",
    status: "",
  });

  const { 
    data: product, 
    isLoading,
    error
  } = useProduct(productId) as { data: { 
    id: string; 
    name: string; 
    description: string; 
    price: number; 
    salePrice?: number; 
    sku: string; 
    stockQuantity: number; 
    category: string; 
    status: string; 
    images: string[]; 
    createdAt: string; 
    updatedAt: string; 
    store?: { name: string } 
  } | undefined; isLoading: boolean; error: ApiError | null };

  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const isUpdating = updateProduct.isPending;
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const statusMeta = useMemo(
    () => ({
      active: { label: "Active", tone: "success" as const },
      draft: { label: "Draft", tone: "warning" as const },
      archived: { label: "Archived", tone: "muted" as const },
      inactive: { label: "Inactive", tone: "muted" as const },
    }),
    []
  );

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Loading product details...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !product) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-500 text-lg">Error loading product</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Product not found'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const handleEditChange = (field: keyof typeof editData, value: string | number) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field as string]) {
      setFormErrors((prev) => ({ ...prev, [field as string]: "" }));
    }
  };

  const validateEdit = () => {
    const errors: Record<string, string> = {};
    if (!editData.name.trim()) errors['name'] = "Product name is required";
    if (!editData.sku.trim()) errors['sku'] = "SKU is required";
    if (editData.price <= 0) errors['price'] = "Price must be greater than 0";
    if (editData.stockQuantity < 0) errors['stockQuantity'] = "Stock cannot be negative";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEdit = () => {
    setEditData({
      name: product.name,
      description: product.description,
      price: product.price,
      salePrice: product.salePrice || 0,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      category: product.category,
      status: product.status,
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!validateEdit()) return;
    try {
      await updateProduct.mutateAsync({
        id: productId,
        data: editData
      });
      setShowEditModal(false);
    } catch (error) {
      logger.error('Failed to update product:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(productId);
      // Redirect to products list
      window.location.href = '/products';
    } catch (error) {
      logger.error('Failed to delete product:', error);
    }
  };

  const productStatus = statusMeta[product.status as keyof typeof statusMeta] ?? {
    label: product.status,
    tone: "muted" as const,
  };

  const stockStatus = useMemo(() => {
    if (product.stockQuantity === 0) {
      return { label: "Out of Stock", tone: "destructive" as const };
    }
    if (product.stockQuantity < 10) {
      return { label: "Low Stock", tone: "warning" as const };
    }
    return { label: "In Stock", tone: "success" as const };
  }, [product.stockQuantity]);

  const quickActions = [
    { key: "update-stock", label: "Update Stock", onClick: () => console.info("update stock", product.id) },
    { key: "duplicate", label: "Duplicate Product", onClick: () => console.info("duplicate product", product.id) },
    product.store?.name
      ? {
          key: "view-store",
          label: "View in Store",
          onClick: () => window.open((product.store as any)?.url ?? "#", "_blank"),
        }
      : null,
    { key: "export", label: "Export Data", onClick: () => console.info("export product", product.id) },
  ].filter(Boolean) as Array<{ key: string; label: string; onClick: () => void }>;

  const statusOptions = useMemo(
    () => [
      { value: "active", label: "Active" },
      { value: "draft", label: "Draft" },
      { value: "archived", label: "Archived" },
      { value: "inactive", label: "Inactive" },
    ],
    []
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="mobile-heading text-foreground">{product.name}</h1>
              <p className="text-sm text-muted-foreground">Product details and management</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                Print
              </Button>
              <Button
                variant="outline"
                onClick={() => console.info("export", product.id)}
              >
                Export
              </Button>
              <ProtectedComponent permission="products.manage">
                <Button onClick={handleEdit}>Edit Product</Button>
              </ProtectedComponent>
              <ProtectedComponent permission="products.manage">
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                >
                  Delete
                </Button>
              </ProtectedComponent>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <SectionShell
                title="Product Images"
                description="Visual assets currently attached to this product."
              >
                {product.images && product.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {product.images.map((image, index) => (
                      <div key={image ?? index} className="overflow-hidden rounded-lg border border-border">
                        {image ? (
                          <img
                            src={image}
                            alt={`${product.name} ${index + 1}`}
                            className="h-40 w-full object-cover"
                          />
                        ) : (
                          <ImagePlaceholder className="h-40 w-full rounded-none" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <ImagePlaceholder
                    className="h-40 w-full rounded-lg"
                    label="Görsel eklenmemiş"
                  />
                )}
              </SectionShell>

              <SectionShell
                title="Product Details"
                description="Key attributes and classification."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <StatusPill label={productStatus.label} tone={productStatus.tone} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">SKU</p>
                    <p className="font-medium text-foreground">{product.sku}</p>
                  </div>
                  {product.category && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium capitalize text-foreground">{product.category}</p>
                    </div>
                  )}
                  {product.store?.name && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Store</p>
                      <p className="font-medium text-foreground">{product.store.name}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium text-foreground">{new Date(product.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium text-foreground">{new Date(product.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {product.description && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{product.description}</p>
                    </div>
                  </div>
                )}
              </SectionShell>

              <SectionShell
                title="Pricing & Inventory"
                description="Financial and stock metrics for the SKU."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(product.price)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Sale Price</p>
                    <p className="text-lg font-semibold text-foreground">
                      {product.salePrice ? formatCurrency(product.salePrice) : '—'}
                    </p>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Stock quantity</span>
                      <StatusPill label={stockStatus.label} tone={stockStatus.tone} />
                    </div>
                    <div className="flex items-center justify-between text-sm font-medium text-foreground">
                      <span>{product.stockQuantity} units</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(product.stockQuantity, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </SectionShell>

            </div>

            <div className="space-y-6">
              <SectionShell
                title="Snapshot"
                description="High-level figures for this product."
              >
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Views</span>
                    <span className="font-medium text-foreground">1,234</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orders</span>
                    <span className="font-medium text-foreground">45</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-medium text-foreground">{formatCurrency(12450)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversion</span>
                    <span className="font-medium text-foreground">3.6%</span>
                  </div>
                </div>
              </SectionShell>

              <ProtectedComponent permission="products.manage">
                <SectionShell
                  title="Quick Actions"
                  description="Shortcuts for maintenance tasks"
                >
                  <div className="grid gap-2">
                    {quickActions.map((action) => (
                      <Button
                        key={action.key}
                        variant="outline"
                        className="justify-start"
                        onClick={action.onClick}
                        type="button"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </SectionShell>
              </ProtectedComponent>

              <SectionShell
                title="Product History"
                description="Lifecycle timestamps"
              >
                <div className="space-y-3 text-sm text-foreground">
                  <div>
                    <p className="font-medium">Created</p>
                    <p className="text-muted-foreground">
                      {new Date(product.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Last Updated</p>
                    <p className="text-muted-foreground">
                      {new Date(product.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </SectionShell>
            </div>
          </div>

          {/* Edit Product Modal */}
          {showEditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="bg-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-border p-6 sm:p-8 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
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
                      setShowEditModal(false);
                      setFormErrors({});
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
                  <FormLayout.Section title="Basic Details" columns={2}>
                    <TextField
                      required
                      label="Product Name"
                      placeholder="Enter product name"
                      value={editData.name}
                      onChange={(e) => handleEditChange('name', e.target.value)}
                      error={formErrors['name'] || ''}
                    />
                    <TextField
                      required
                      label="SKU"
                      placeholder="Enter SKU"
                      value={editData.sku}
                      onChange={(e) => handleEditChange('sku', e.target.value)}
                      error={formErrors['sku'] || ''}
                    />
                    <TextField
                      required
                      label="Price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={editData.price}
                      onChange={(e) => handleEditChange('price', parseFloat(e.target.value) || 0)}
                      error={formErrors['price'] || ''}
                    />
                    <TextField
                      label="Sale Price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={editData.salePrice}
                      onChange={(e) => handleEditChange('salePrice', parseFloat(e.target.value) || 0)}
                    />
                    <TextField
                      required
                      label="Stock Quantity"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={editData.stockQuantity}
                      onChange={(e) => handleEditChange('stockQuantity', parseInt(e.target.value) || 0)}
                      error={formErrors['stockQuantity'] || ''}
                    />
                    <FormSelect
                      label="Status"
                      value={editData.status}
                      onChange={(e) => handleEditChange('status', e.target.value)}
                      options={statusOptions}
                    />
                    <FormSelect
                      label="Category"
                      placeholder="Select category"
                      value={editData.category}
                      onChange={(e) => handleEditChange('category', e.target.value)}
                      options={categoryOptions}
                    />
                  </FormLayout.Section>

                  <FormLayout.Section title="Description">
                    <FormTextarea
                      label="Description"
                      rows={3}
                      placeholder="Enter product description"
                      value={editData.description}
                      onChange={(e) => handleEditChange('description', e.target.value)}
                    />
                  </FormLayout.Section>
                </FormLayout>

                <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
                  <Button
                    type="button"
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="flex-1 gap-2 sm:flex-none"
                  >
                    {isUpdating ? (
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
                      setShowEditModal(false);
                      setFormErrors({});
                    }}
                    disabled={isUpdating}
                    className="flex-1 gap-2 sm:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="bg-card w-full max-w-md rounded-xl border border-border p-6 shadow-2xl">
                <h3 className="text-lg font-semibold text-foreground">Delete Product</h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="destructive" onClick={handleDelete} className="flex-1">
                    Delete Product
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
