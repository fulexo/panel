"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import { useProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useApi";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { ApiError } from "@/lib/api-client";

export default function ProductDetailPage() {
  const params = useParams();
  const { } = useAuth();
  const { } = useRBAC();
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
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    try {
      await updateProduct.mutateAsync({
        id: productId,
        data: editData
      });
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(productId);
      // Redirect to products list
      window.location.href = '/products';
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { status: 'Out of Stock', color: 'text-red-600' };
    if (quantity < 10) return { status: 'Low Stock', color: 'text-yellow-600' };
    return { status: 'In Stock', color: 'text-green-600' };
  };

  const stockStatus = getStockStatus(product.stockQuantity);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">{product.name}</h1>
              <p className="text-muted-foreground mobile-text">
                Product details and management
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline">Print</button>
              <button className="btn btn-outline">Export</button>
              <ProtectedComponent permission="products.manage">
                <button 
                  onClick={handleEdit}
                  className="btn btn-primary"
                >
                  Edit Product
                </button>
              </ProtectedComponent>
              <ProtectedComponent permission="products.manage">
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="btn btn-destructive"
                >
                  Delete
                </button>
              </ProtectedComponent>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Images */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Product Images</h3>
                {product.images && product.images.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {product.images.map((image, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="text-4xl text-gray-400">📷</span>
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Product Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Description</label>
                    <p className="text-foreground">{product.description || 'No description available'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">SKU</label>
                      <p className="font-medium">{product.sku}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Category</label>
                      <p className="font-medium">{product.category || 'Uncategorized'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Status</label>
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(product.status)}`}>
                        {product.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Store</label>
                      <p className="font-medium">{product.store?.name || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Information */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Pricing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Regular Price</label>
                    <p className="text-2xl font-bold text-foreground">₺{product.price.toFixed(2)}</p>
                  </div>
                  {product.salePrice && (
                    <div>
                      <label className="text-sm text-muted-foreground">Sale Price</label>
                      <p className="text-2xl font-bold text-green-600">₺{product.salePrice.toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-muted-foreground">Discount</label>
                    {product.salePrice ? (
                      <p className="text-lg font-medium text-red-600">
                        -{Math.round(((product.price - product.salePrice) / product.price) * 100)}%
                      </p>
                    ) : (
                      <p className="text-lg font-medium text-muted-foreground">No discount</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stock Information */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Stock Information</h3>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-foreground mb-2">
                      {product.stockQuantity}
                    </div>
                    <p className="text-sm text-muted-foreground">Units in Stock</p>
                    <p className={`text-sm font-medium ${stockStatus.color}`}>
                      {stockStatus.status}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stock Level</span>
                      <span className="font-medium">{product.stockQuantity} units</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          product.stockQuantity === 0 ? 'bg-red-500' :
                          product.stockQuantity < 10 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((product.stockQuantity / 100) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Statistics */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Views</span>
                    <span className="font-medium">1,234</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orders</span>
                    <span className="font-medium">45</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-medium">₺12,450</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Conversion</span>
                    <span className="font-medium">3.6%</span>
                  </div>
                </div>
              </div>

              {/* Product Actions */}
              <ProtectedComponent permission="products.manage">
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="space-y-2">
                    <button className="btn btn-outline w-full">Update Stock</button>
                    <button className="btn btn-outline w-full">Duplicate Product</button>
                    <button className="btn btn-outline w-full">View in Store</button>
                    <button className="btn btn-outline w-full">Export Data</button>
                  </div>
                </div>
              </ProtectedComponent>

              {/* Product History */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Product History</h3>
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">Created</p>
                    <p className="text-muted-foreground">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Last Updated</p>
                    <p className="text-muted-foreground">
                      {new Date(product.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Product Modal */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-foreground mb-4">Edit Product</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Product Name</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({...editData, name: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">SKU</label>
                    <input
                      type="text"
                      value={editData.sku}
                      onChange={(e) => setEditData({...editData, sku: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Price</label>
                    <input
                      type="number"
                      value={editData.price}
                      onChange={(e) => setEditData({...editData, price: parseFloat(e.target.value)})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Sale Price</label>
                    <input
                      type="number"
                      value={editData.salePrice}
                      onChange={(e) => setEditData({...editData, salePrice: parseFloat(e.target.value)})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Stock Quantity</label>
                    <input
                      type="number"
                      value={editData.stockQuantity}
                      onChange={(e) => setEditData({...editData, stockQuantity: parseInt(e.target.value)})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Category</label>
                    <input
                      type="text"
                      value={editData.category}
                      onChange={(e) => setEditData({...editData, category: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({...editData, status: e.target.value})}
                      className="form-select"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="form-label">Description</label>
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({...editData, description: e.target.value})}
                      className="form-textarea"
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleUpdate}
                    className="btn btn-primary"
                  >
                    Update Product
                  </button>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border w-full max-w-md">
                <h3 className="text-lg font-semibold text-foreground mb-4">Delete Product</h3>
                <p className="text-muted-foreground mb-6">
                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="btn btn-destructive"
                  >
                    Delete Product
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
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