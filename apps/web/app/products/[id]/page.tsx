"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "../../../components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Image from "next/image";

interface Product {
  id: string;
  sku: string;
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  stock?: number;
  weight?: number;
  dimensions?: any;
  images?: string[];
  tags?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    weight: '',
    active: true,
    tags: '',
  });

  // Token is now handled by httpOnly cookies
  const api = (path: string, init?: any) => 
    fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init
    });

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await api(`/products/${params.id}`);
      if (r.ok) {
        const data = await r.json();
        setProduct(data);
        setEditForm({
          name: data.name || '',
          description: data.description || '',
          price: data.price?.toString() || '',
          stock: data.stock?.toString() || '',
          weight: data.weight?.toString() || '',
          active: data.active,
          tags: data.tags?.join(', ') || '',
        });
      } else if (r.status === 401) {
        router.push('/login');
      } else {
        throw new Error('Failed to load product');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/products/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name || undefined,
          description: editForm.description || undefined,
          price: editForm.price ? parseFloat(editForm.price) : undefined,
          stock: editForm.stock ? parseInt(editForm.stock) : undefined,
          weight: editForm.weight ? parseFloat(editForm.weight) : undefined,
          active: editForm.active,
          tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      setSuccess('Product updated successfully');
      setShowEditModal(false);
      await loadProduct();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/products/${params.id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !product?.active })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      setSuccess(`Product ${!product?.active ? 'activated' : 'deactivated'} successfully`);
      await loadProduct();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async () => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/products/${params.id}`, { method: 'DELETE' });
      
      if (r.ok) {
        setSuccess('Product deleted successfully. Redirecting...');
        setTimeout(() => {
          router.push('/products');
        }, 1500);
      } else {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProduct();
    } else {
      router.push('/login');
    }
  }, [user, params.id]);

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return 'N/A';
    return `${price.toFixed(2)} ${currency || '₺'}`;
  };

  const formatWeight = (weight?: number) => {
    if (!weight) return 'N/A';
    return `${weight} kg`;
  };

  const formatDimensions = (dimensions?: any) => {
    if (!dimensions) return 'N/A';
    if (typeof dimensions === 'object') {
      return `${dimensions.length || 0} x ${dimensions.width || 0} x ${dimensions.height || 0} cm`;
    }
    return dimensions.toString();
  };

  if (loading) {
    return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading product details...</div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h2>
          <p className="text-muted-foreground mb-4">The product you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/products')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'details', name: 'Details', icon: '📄' },
    { id: 'images', name: 'Images', icon: '🖼️' },
    { id: 'inventory', name: 'Inventory', icon: '📦' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/products')}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <h1 className="mobile-heading text-foreground">
                  {product.name || 'Unnamed Product'}
                </h1>
                <p className="text-muted-foreground mobile-text">
                  SKU: {product.sku} • {formatPrice(product.price, product.currency)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
              product.active 
                ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
            }`}>
              {product.active ? 'ACTIVE' : 'INACTIVE'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
              >
                Edit
              </button>
              <button
                onClick={toggleActive}
                disabled={saving}
                className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 btn-animate ${
                  product.active
                    ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                    : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                }`}
              >
                {product.active ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={deleteProduct}
                disabled={saving}
                className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50 btn-animate"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg animate-slide-down">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-3 rounded-lg animate-slide-down">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">{success}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-card rounded-lg border border-border animate-slide-up">
          <div className="flex flex-wrap border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Basic Info */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Product Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SKU:</span>
                        <span className="text-foreground font-mono">{product.sku}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="text-foreground">{product.name || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          product.active 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-gray-500/10 text-gray-500'
                        }`}>
                          {product.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="text-foreground font-bold">
                          {formatPrice(product.price, product.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Info */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Stock Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock:</span>
                        <span className={`text-foreground font-bold ${
                          (product.stock || 0) > 10 
                            ? 'text-green-500' 
                            : (product.stock || 0) > 0 
                            ? 'text-yellow-500' 
                            : 'text-red-500'
                        }`}>
                          {product.stock || 0} units
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="text-foreground">{formatWeight(product.weight)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span className="text-foreground">{formatDimensions(product.dimensions)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Timeline</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span className="text-foreground">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Updated:</span>
                        <span className="text-foreground">
                          {new Date(product.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Description</h3>
                    <p className="text-foreground text-sm leading-relaxed">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Physical Details */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Physical Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="text-foreground">{formatWeight(product.weight)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span className="text-foreground">{formatDimensions(product.dimensions)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Pricing</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="text-foreground font-bold text-lg">
                          {formatPrice(product.price, product.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Currency:</span>
                        <span className="text-foreground">{product.currency || '₺'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Full Description */}
                <div className="bg-accent/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-3">Full Description</h3>
                  <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {product.description || 'No description available'}
                  </div>
                </div>
              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                  <div className="text-6xl mb-4">🖼️</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Product Images</h3>
                  <p className="text-muted-foreground">
                    {product.images && product.images.length > 0 
                      ? `${product.images.length} image(s) available`
                      : 'No images uploaded yet'
                    }
                  </p>
                </div>

                {product.images && product.images.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {product.images.map((image, index) => (
                      <div key={index} className="bg-accent/20 p-4 rounded-lg">
                        <div className="relative w-full h-48 rounded-lg mb-2 overflow-hidden">
                          <Image
                            src={image}
                            alt={`Product image ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5YTNhZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center truncate">
                          Image {index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-accent/20 p-8 rounded-lg text-center">
                    <p className="text-muted-foreground mb-4">No images uploaded yet</p>
                    <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate">
                      Upload Images
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Stock Overview */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Stock Overview</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Stock:</span>
                        <span className={`text-foreground font-bold text-lg ${
                          (product.stock || 0) > 10 
                            ? 'text-green-500' 
                            : (product.stock || 0) > 0 
                            ? 'text-yellow-500' 
                            : 'text-red-500'
                        }`}>
                          {product.stock || 0} units
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          (product.stock || 0) > 10 
                            ? 'bg-green-500/10 text-green-500' 
                            : (product.stock || 0) > 0 
                            ? 'bg-yellow-500/10 text-yellow-500' 
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {(product.stock || 0) > 10 ? 'In Stock' : (product.stock || 0) > 0 ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-accent/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
                    <div className="space-y-2">
                      <button className="w-full px-3 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors btn-animate">
                        Add Stock
                      </button>
                      <button className="w-full px-3 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors btn-animate">
                        Stock History
                      </button>
                      <button className="w-full px-3 py-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors btn-animate">
                        Stock Alerts
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stock Level Indicator */}
                <div className="bg-accent/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-3">Stock Level</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        (product.stock || 0) > 10 
                          ? 'bg-green-500' 
                          : (product.stock || 0) > 0 
                          ? 'bg-yellow-500' 
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(((product.stock || 0) / 100) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {product.stock || 0} units available
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
              <h3 className="text-lg font-semibold text-foreground mb-4">Edit Product</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="Product Name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    rows={4}
                    placeholder="Product description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Stock
                    </label>
                    <input
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => setEditForm(prev => ({ ...prev, stock: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={editForm.weight}
                      onChange={(e) => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="0.000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editForm.active}
                    onChange={(e) => setEditForm(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-foreground">
                    Product is active
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateProduct}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 btn-animate"
                >
                  {saving ? 'Updating...' : 'Update Product'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors btn-animate"
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