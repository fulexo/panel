"use client";

import { logger } from "@/lib/logger";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { 
  useProducts, 
  useDeleteProduct, 
  useBulkUpdateProducts,
  useCreateProduct,
  useUpdateProduct,
  useBundleItems,
  useAddBundleItem,
  useUpdateBundleItem,
  useRemoveBundleItem,
  useCalculateBundlePrice
} from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function ProductsPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBundleModal, setShowBundleModal] = useState<string | null>(null);
  const [bundleItems, setBundleItems] = useState<Array<{
    id: string;
    productId: string;
    quantity: number;
    isOptional: boolean;
    minQuantity?: number;
    maxQuantity?: number;
    discount?: number;
    sortOrder: number;
    product?: {
      id: string;
      name: string;
      sku: string;
      price: number;
    };
  }>>([]);
  
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
    isBundle: false,
    bundleDiscount: 0,
    minBundleItems: 0,
    maxBundleItems: 0,
    bundleStock: 'parent' as 'parent' | 'children' | 'both',
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // API hooks
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const addBundleItem = useAddBundleItem();
  const updateBundleItem = useUpdateBundleItem();
  const removeBundleItem = useRemoveBundleItem();
  const calculateBundlePrice = useCalculateBundlePrice();

  // Load bundle items when modal opens
  const handleOpenBundleModal = async (productId: string) => {
    setShowBundleModal(productId);
    try {
      const response = await fetch(`/api/products/${productId}/bundle-items`);
      if (response.ok) {
        const items = await response.json();
        setBundleItems(items);
      } else {
        setBundleItems([]);
      }
    } catch (error) {
      console.error('Failed to load bundle items:', error);
      setBundleItems([]);
    }
  };

  // Form handlers
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.sku.trim()) errors.sku = 'SKU is required';
    if (formData.price <= 0) errors.price = 'Price must be greater than 0';
    if (formData.stockQuantity < 0) errors.stockQuantity = 'Stock quantity cannot be negative';
    
    if (formData.isBundle) {
      if (formData.minBundleItems && formData.maxBundleItems && formData.minBundleItems > formData.maxBundleItems) {
        errors.maxBundleItems = 'Max bundle items must be greater than min bundle items';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateProduct = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const productData = {
        ...formData,
        storeId: userStoreId || '',
        images: [], // TODO: Add image upload
      };
      
      await createProduct.mutateAsync(productData);
      setSuccess('Product created successfully!');
      setShowCreateModal(false);
      setFormData({
        name: '',
        description: '',
        price: 0,
        salePrice: 0,
        sku: '',
        stockQuantity: 0,
        category: '',
        productType: 'simple',
        isBundle: false,
        bundleDiscount: 0,
        minBundleItems: 0,
        maxBundleItems: 0,
        bundleStock: 'parent',
      });
      setFormErrors({});
    } catch (error: any) {
      console.error('Failed to create product:', error);
      setError(error?.message || 'Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (productId: string) => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      await updateProduct.mutateAsync({ id: productId, data: formData });
      setSuccess('Product updated successfully!');
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        salePrice: 0,
        sku: '',
        stockQuantity: 0,
        category: '',
        productType: 'simple',
        isBundle: false,
        bundleDiscount: 0,
        minBundleItems: 0,
        maxBundleItems: 0,
        bundleStock: 'parent',
      });
      setFormErrors({});
    } catch (error: any) {
      console.error('Failed to update product:', error);
      setError(error?.message || 'Failed to update product. Please try again.');
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
      isBundle: product.isBundle || false,
      bundleDiscount: product.bundleDiscount || 0,
      minBundleItems: product.minBundleItems || 0,
      maxBundleItems: product.maxBundleItems || 0,
      bundleStock: product.bundleStock || 'parent',
    });
  };

  const handleSaveBundle = async () => {
    if (!showBundleModal) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Save bundle items
      for (const item of bundleItems) {
        if (item.id) {
          // Update existing item
          await updateBundleItem.mutateAsync({
            bundleId: showBundleModal,
            productId: item.productId,
            data: {
              quantity: item.quantity,
              isOptional: item.isOptional,
              minQuantity: item.minQuantity,
              maxQuantity: item.maxQuantity,
              discount: item.discount,
              sortOrder: item.sortOrder,
            }
          });
        } else {
          // Add new item
          await addBundleItem.mutateAsync({
            bundleId: showBundleModal,
            data: {
              productId: item.productId,
              quantity: item.quantity,
              isOptional: item.isOptional,
              minQuantity: item.minQuantity,
              maxQuantity: item.maxQuantity,
              discount: item.discount,
              sortOrder: item.sortOrder,
            }
          });
        }
      }
      
      setSuccess('Bundle items saved successfully!');
      setShowBundleModal(null);
      setBundleItems([]);
    } catch (error: any) {
      console.error('Failed to save bundle:', error);
      setError(error?.message || 'Failed to save bundle items. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddBundleItem = () => {
    const newItem = {
      id: '',
      productId: '',
      quantity: 1,
      isOptional: false,
      minQuantity: 1,
      maxQuantity: 1,
      discount: 0,
      sortOrder: bundleItems.length,
      product: {
        id: '',
        name: '',
        sku: '',
        price: 0,
      }
    };
    setBundleItems([...bundleItems, newItem]);
  };

  const handleRemoveBundleItem = async (index: number) => {
    const item = bundleItems[index];
    if (item.id && showBundleModal) {
      try {
        await removeBundleItem.mutateAsync({
          bundleId: showBundleModal,
          productId: item.productId
        });
      } catch (error) {
        console.error('Failed to remove bundle item:', error);
      }
    }
    setBundleItems(bundleItems.filter((_, i) => i !== index));
  };
  
  // Get user's store ID for customer view
  const userStoreId = user?.stores?.[0]?.id;
  
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
    ...(isAdmin() ? {} : userStoreId ? { storeId: userStoreId } : {}),
  }) as { data: { data: Array<{ id: string; name: string; sku: string; price: number; salePrice?: number; stockQuantity: number; category?: string; status: string; createdAt: string; store?: { name: string }; isBundle?: boolean; bundleProducts?: Array<{ id: string; product: { name: string; sku: string } }> }>; pagination: { total: number; pages: number } } | undefined; isLoading: boolean; error: ApiError | null };

  const deleteProduct = useDeleteProduct();
  const bulkUpdateProducts = useBulkUpdateProducts();

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
          <div className="flex flex-col items-center gap-4">
            <div className="text-red-500 text-lg">Error loading products</div>
            <div className="text-muted-foreground">
              {error instanceof ApiError ? error.message : 'Unknown error'}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const products = productsData?.data || [];
  const totalProducts = productsData?.pagination?.total || 0;
  const totalPages = productsData?.pagination?.pages || 1;

  // Calculate statistics
  const statusCounts = products.reduce((acc: Record<string, number>, product: { id: string; name: string; sku: string; price: number; salePrice?: number; stockQuantity: number; category?: string; status: string; createdAt: string; store?: { name: string }; isBundle?: boolean; bundleProducts?: Array<{ id: string; product: { name: string; sku: string } }> }) => {
    acc[product.status] = (acc[product.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lowStockProducts = products.filter((product: { id: string; name: string; sku: string; price: number; salePrice?: number; stockQuantity: number; category?: string; status: string; createdAt: string; store?: { name: string }; isBundle?: boolean; bundleProducts?: Array<{ id: string; product: { name: string; sku: string } }> }) => product.stockQuantity <= 10);

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
      logger.error('Bulk action failed:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Products Management</h1>
              <p className="text-muted-foreground mobile-text">
                {isAdmin() ? 'Manage all products across all stores' : 'View your store products'}
              </p>
            </div>
            <ProtectedComponent permission="products.manage">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Add Product
              </button>
            </ProtectedComponent>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
                <button 
                  onClick={() => setError(null)}
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

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="clothing">Clothing</option>
              <option value="books">Books</option>
              <option value="home">Home & Garden</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Total Products</h3>
              <div className="text-3xl font-bold text-primary">
                {totalProducts}
              </div>
              <p className="text-sm text-muted-foreground">
                {isAdmin() ? 'Across all stores' : 'In your store'}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Active</h3>
              <div className="text-3xl font-bold text-green-600">
                {statusCounts['active'] || 0}
              </div>
              <p className="text-sm text-muted-foreground">Currently active</p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Draft</h3>
              <div className="text-3xl font-bold text-yellow-600">
                {statusCounts['draft'] || 0}
              </div>
              <p className="text-sm text-muted-foreground">Draft products</p>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-2">Low Stock</h3>
              <div className="text-3xl font-bold text-red-600">
                {lowStockProducts.length}
              </div>
              <p className="text-sm text-muted-foreground">≤ 10 units</p>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStockProducts.length > 0 && (
            <div className="bg-card p-6 rounded-lg border border-red-200">
              <h3 className="text-lg font-semibold text-red-800 mb-4">Low Stock Alerts</h3>
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((product: { id: string; name: string; sku: string; price: number; salePrice?: number; stockQuantity: number; category?: string; status: string; createdAt: string; store?: { name: string }; isBundle?: boolean; bundleProducts?: Array<{ id: string; product: { name: string; sku: string } }> }) => (
                  <div key={product.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div>
                      <div className="font-medium text-red-800">{product.name}</div>
                      <div className="text-sm text-red-600">SKU: {product.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-800">{product.stockQuantity} left</div>
                      <div className="text-sm text-red-600">Critical</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">All Products</h3>
              <ProtectedComponent permission="products.manage">
                <div className="flex gap-2">
                  <button className="btn btn-outline btn-sm">Export</button>
                  <button className="btn btn-outline btn-sm">Import</button>
                </div>
              </ProtectedComponent>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === products.length && products.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts(products.map((p: { id: string }) => p.id));
                          } else {
                            setSelectedProducts([]);
                          }
                        }}
                        className="form-checkbox"
                      />
                    </th>
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">SKU</th>
                    <th className="text-left p-3">Price</th>
                    <th className="text-left p-3">Stock</th>
                    <th className="text-left p-3">Status</th>
                    {isAdmin() && <th className="text-left p-3">Store</th>}
                    <ProtectedComponent permission="products.manage">
                      <th className="text-left p-3">Actions</th>
                    </ProtectedComponent>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product: { id: string; name: string; sku: string; price: number; salePrice?: number; stockQuantity: number; category?: string; status: string; createdAt: string; store?: { name: string }; isBundle?: boolean; bundleProducts?: Array<{ id: string; product: { name: string; sku: string } }> }) => (
                    <tr key={product.id} className="border-b border-border">
                      <td className="p-3">
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
                          className="form-checkbox"
                        />
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {product.name}
                            {product.isBundle && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Bundle
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {product.category}
                            {product.isBundle && product.bundleProducts && (
                              <span className="ml-2">
                                ({product.bundleProducts?.length || 0} items)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{product.sku}</td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">${product.price}</div>
                          {product.salePrice && (
                            <div className="text-sm text-green-600">Sale: ${product.salePrice}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className={`font-medium ${
                          product.stockQuantity <= 10 ? 'text-red-600' : 
                          product.stockQuantity <= 50 ? 'text-yellow-600' : 
                          'text-green-600'
                        }`}>
                          {product.stockQuantity}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          product.status === 'active' ? 'bg-green-100 text-green-800' :
                          product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      {isAdmin() && (
                        <td className="p-3">{product.store?.name || 'N/A'}</td>
                      )}
                      <ProtectedComponent permission="products.manage">
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditProduct(product)}
                              className="btn btn-sm btn-outline"
                            >
                              Edit
                            </button>
                            {product.isBundle && (
                              <button 
                                onClick={() => handleOpenBundleModal(product.id)}
                                className="btn btn-sm btn-outline"
                              >
                                Manage Bundle
                              </button>
                            )}
                            <button 
                              onClick={() => deleteProduct.mutate(product.id)}
                              className="btn btn-sm btn-destructive"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </ProtectedComponent>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin() ? 8 : 7} className="p-8 text-center text-muted-foreground">
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-outline btn-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {/* Create Product Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-foreground mb-4">Create Product</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className={`form-input ${formErrors.name ? 'border-red-500' : ''}`}
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                    {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="form-label">SKU *</label>
                    <input
                      type="text"
                      className={`form-input ${formErrors.sku ? 'border-red-500' : ''}`}
                      placeholder="Enter SKU"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                    />
                    {formErrors.sku && <p className="text-red-500 text-sm mt-1">{formErrors.sku}</p>}
                  </div>
                  <div>
                    <label className="form-label">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`form-input ${formErrors.price ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    />
                    {formErrors.price && <p className="text-red-500 text-sm mt-1">{formErrors.price}</p>}
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
                      className={`form-input ${formErrors.stockQuantity ? 'border-red-500' : ''}`}
                      placeholder="0"
                      value={formData.stockQuantity}
                      onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                    />
                    {formErrors.stockQuantity && <p className="text-red-500 text-sm mt-1">{formErrors.stockQuantity}</p>}
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
                  <div>
                    <label className="form-label">Product Type</label>
                    <select 
                      className="form-select"
                      value={formData.productType}
                      onChange={(e) => handleInputChange('productType', e.target.value)}
                    >
                      <option value="simple">Simple</option>
                      <option value="bundle">Bundle</option>
                      <option value="variable">Variable</option>
                      <option value="grouped">Grouped</option>
                      <option value="external">External</option>
                    </select>
                  </div>
                  {formData.productType === 'bundle' && (
                    <>
                      <div>
                        <label className="form-label">Bundle Discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="form-input"
                          placeholder="0"
                          value={formData.bundleDiscount}
                          onChange={(e) => handleInputChange('bundleDiscount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="form-label">Min Bundle Items</label>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          placeholder="0"
                          value={formData.minBundleItems}
                          onChange={(e) => handleInputChange('minBundleItems', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="form-label">Max Bundle Items</label>
                        <input
                          type="number"
                          min="0"
                          className={`form-input ${formErrors.maxBundleItems ? 'border-red-500' : ''}`}
                          placeholder="0"
                          value={formData.maxBundleItems}
                          onChange={(e) => handleInputChange('maxBundleItems', parseInt(e.target.value) || 0)}
                        />
                        {formErrors.maxBundleItems && <p className="text-red-500 text-sm mt-1">{formErrors.maxBundleItems}</p>}
                      </div>
                      <div>
                        <label className="form-label">Bundle Stock Management</label>
                        <select 
                          className="form-select"
                          value={formData.bundleStock}
                          onChange={(e) => handleInputChange('bundleStock', e.target.value)}
                        >
                          <option value="parent">Parent Only</option>
                          <option value="children">Children Only</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    </>
                  )}
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
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={handleCreateProduct}
                    disabled={isSubmitting || createProduct.isPending}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting || createProduct.isPending ? 'Creating...' : 'Create Product'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({
                        name: '',
                        description: '',
                        price: 0,
                        salePrice: 0,
                        sku: '',
                        stockQuantity: 0,
                        category: '',
                        productType: 'simple',
                        isBundle: false,
                        bundleDiscount: 0,
                        minBundleItems: 0,
                        maxBundleItems: 0,
                        bundleStock: 'parent',
                      });
                      setFormErrors({});
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Product Modal */}
          {editingProduct && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-foreground mb-4">Edit Product</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className={`form-input ${formErrors.name ? 'border-red-500' : ''}`}
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                    {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="form-label">SKU *</label>
                    <input
                      type="text"
                      className={`form-input ${formErrors.sku ? 'border-red-500' : ''}`}
                      placeholder="Enter SKU"
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                    />
                    {formErrors.sku && <p className="text-red-500 text-sm mt-1">{formErrors.sku}</p>}
                  </div>
                  <div>
                    <label className="form-label">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`form-input ${formErrors.price ? 'border-red-500' : ''}`}
                      placeholder="0.00"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    />
                    {formErrors.price && <p className="text-red-500 text-sm mt-1">{formErrors.price}</p>}
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
                      className={`form-input ${formErrors.stockQuantity ? 'border-red-500' : ''}`}
                      placeholder="0"
                      value={formData.stockQuantity}
                      onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                    />
                    {formErrors.stockQuantity && <p className="text-red-500 text-sm mt-1">{formErrors.stockQuantity}</p>}
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
                  <div>
                    <label className="form-label">Product Type</label>
                    <select 
                      className="form-select"
                      value={formData.productType}
                      onChange={(e) => handleInputChange('productType', e.target.value)}
                    >
                      <option value="simple">Simple</option>
                      <option value="bundle">Bundle</option>
                      <option value="variable">Variable</option>
                      <option value="grouped">Grouped</option>
                      <option value="external">External</option>
                    </select>
                  </div>
                  {formData.productType === 'bundle' && (
                    <>
                      <div>
                        <label className="form-label">Bundle Discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className="form-input"
                          placeholder="0"
                          value={formData.bundleDiscount}
                          onChange={(e) => handleInputChange('bundleDiscount', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="form-label">Min Bundle Items</label>
                        <input
                          type="number"
                          min="0"
                          className="form-input"
                          placeholder="0"
                          value={formData.minBundleItems}
                          onChange={(e) => handleInputChange('minBundleItems', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="form-label">Max Bundle Items</label>
                        <input
                          type="number"
                          min="0"
                          className={`form-input ${formErrors.maxBundleItems ? 'border-red-500' : ''}`}
                          placeholder="0"
                          value={formData.maxBundleItems}
                          onChange={(e) => handleInputChange('maxBundleItems', parseInt(e.target.value) || 0)}
                        />
                        {formErrors.maxBundleItems && <p className="text-red-500 text-sm mt-1">{formErrors.maxBundleItems}</p>}
                      </div>
                      <div>
                        <label className="form-label">Bundle Stock Management</label>
                        <select 
                          className="form-select"
                          value={formData.bundleStock}
                          onChange={(e) => handleInputChange('bundleStock', e.target.value)}
                        >
                          <option value="parent">Parent Only</option>
                          <option value="children">Children Only</option>
                          <option value="both">Both</option>
                        </select>
                      </div>
                    </>
                  )}
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
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={() => handleUpdateProduct(editingProduct)}
                    disabled={isSubmitting || updateProduct.isPending}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting || updateProduct.isPending ? 'Updating...' : 'Update Product'}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingProduct(null);
                      setFormData({
                        name: '',
                        description: '',
                        price: 0,
                        salePrice: 0,
                        sku: '',
                        stockQuantity: 0,
                        category: '',
                        productType: 'simple',
                        isBundle: false,
                        bundleDiscount: 0,
                        minBundleItems: 0,
                        maxBundleItems: 0,
                        bundleStock: 'parent',
                      });
                      setFormErrors({});
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bundle Management Modal */}
          {showBundleModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-foreground mb-4">Manage Bundle Items</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-md font-medium">Bundle Items</h4>
                    <button 
                      onClick={handleAddBundleItem}
                      className="btn btn-sm btn-primary"
                    >
                      Add Product
                    </button>
                  </div>
                  
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3">Product</th>
                          <th className="text-left p-3">Quantity</th>
                          <th className="text-left p-3">Optional</th>
                          <th className="text-left p-3">Discount</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bundleItems.map((item, index) => (
                          <tr key={index} className="border-b border-border">
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{item.product?.name || 'Unknown Product'}</div>
                                <div className="text-sm text-muted-foreground">SKU: {item.product?.sku || 'N/A'}</div>
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newItems = [...bundleItems];
                                  newItems[index].quantity = parseInt(e.target.value) || 1;
                                  setBundleItems(newItems);
                                }}
                                className="w-20 px-2 py-1 border border-border rounded bg-background text-foreground"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={item.isOptional}
                                onChange={(e) => {
                                  const newItems = [...bundleItems];
                                  newItems[index].isOptional = e.target.checked;
                                  setBundleItems(newItems);
                                }}
                                className="form-checkbox"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={item.discount || 0}
                                onChange={(e) => {
                                  const newItems = [...bundleItems];
                                  newItems[index].discount = parseFloat(e.target.value) || 0;
                                  setBundleItems(newItems);
                                }}
                                className="w-20 px-2 py-1 border border-border rounded bg-background text-foreground"
                              />
                              <span className="text-sm text-muted-foreground ml-1">%</span>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => handleRemoveBundleItem(index)}
                                className="btn btn-sm btn-destructive"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                        {bundleItems.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-muted-foreground">
                              No items in bundle
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={handleSaveBundle}
                    disabled={isSubmitting}
                    className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Bundle'}
                  </button>
                  <button 
                    onClick={() => {
                      setShowBundleModal(null);
                      setBundleItems([]);
                    }}
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
