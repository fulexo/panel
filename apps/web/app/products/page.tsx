"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import ProtectedRoute from "../../components/ProtectedRoute";

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
  wooProductId?: string;
  storeId?: string;
  storeName?: string;
  syncStatus?: 'synced' | 'pending' | 'failed';
  wooCategories?: string[];
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ProductsResponse {
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  
  // Create/Edit modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [createForm, setCreateForm] = useState({
    sku: '',
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

  useEffect(() => {
    if (user) {
      fetchProducts();
      if (user.role === 'ADMIN') {
        fetchStores();
      }
    } else {
      router.push('/login');
    }
  }, [user, currentPage, searchTerm, statusFilter, categoryFilter, storeFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const t = null;
      if (!t) { 
        router.push('/login'); 
        return; 
      }
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(storeFilter !== 'all' && { storeId: storeFilter }),
      });

      const r = await api(`/products?${params}`);
      if (!r.ok) {
        if (r.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch products');
      }
      
      const data: ProductsResponse = await r.json();
      setProducts(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalProducts(data.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const r = await api('/woo/stores');
      if (r.ok) {
        const data = await r.json();
        setStores(data || []);
      }
    } catch (err) {
      // Ignore store fetch errors
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  const createProduct = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const r = await api('/products', {
        method: 'POST',
        body: JSON.stringify({
          sku: createForm.sku,
          name: createForm.name || undefined,
          description: createForm.description || undefined,
          price: createForm.price ? parseFloat(createForm.price) : undefined,
          stock: createForm.stock ? parseInt(createForm.stock) : undefined,
          weight: createForm.weight ? parseFloat(createForm.weight) : undefined,
          active: createForm.active,
          tags: createForm.tags ? createForm.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to create product');
      }

      setSuccess('Product created successfully');
      setShowCreateModal(false);
      setCreateForm({
        sku: '',
        name: '',
        description: '',
        price: '',
        stock: '',
        weight: '',
        active: true,
        tags: '',
      });
      await fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateProduct = async () => {
    if (!editingProduct) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/products/${editingProduct.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          sku: createForm.sku,
          name: createForm.name || undefined,
          description: createForm.description || undefined,
          price: createForm.price ? parseFloat(createForm.price) : undefined,
          stock: createForm.stock ? parseInt(createForm.stock) : undefined,
          weight: createForm.weight ? parseFloat(createForm.weight) : undefined,
          active: createForm.active,
          tags: createForm.tags ? createForm.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      setSuccess('Product updated successfully');
      setShowCreateModal(false);
      setEditingProduct(null);
      setCreateForm({
        sku: '',
        name: '',
        description: '',
        price: '',
        stock: '',
        weight: '',
        active: true,
        tags: '',
      });
      await fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/products/${productId}`, { method: 'DELETE' });
      
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }

      setSuccess('Product deleted successfully');
      await fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (productId: string, currentActive: boolean) => {
    try {
      setSaving(true);
      setError(null);
      
      const r = await api(`/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !currentActive })
      });

      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      setSuccess(`Product ${!currentActive ? 'activated' : 'deactivated'} successfully`);
      await fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkToggleActive = async (active: boolean) => {
    if (selectedProducts.length === 0) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await api('/products/bulk', {
        method: 'PUT',
        body: JSON.stringify({ 
          productIds: selectedProducts, 
          updates: { active } 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update products');
      }

      const result = await response.json();
      setSuccess(result.message);
      setSelectedProducts([]);
      await fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`)) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const response = await api('/products/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ productIds: selectedProducts })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete products');
      }

      const result = await response.json();
      setSuccess(result.message);
      setSelectedProducts([]);
      await fetchProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    setSelectedProducts(
      selectedProducts.length === products.length 
        ? [] 
        : products.map(product => product.id)
    );
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setCreateForm({
      sku: product.sku,
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      stock: product.stock?.toString() || '',
      weight: product.weight?.toString() || '',
      active: product.active,
      tags: product.tags?.join(', ') || '',
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingProduct(null);
    setCreateForm({
      sku: '',
      name: '',
      description: '',
      price: '',
      stock: '',
      weight: '',
      active: true,
      tags: '',
    });
  };

  const getStatusColor = (active: boolean) => {
    return active 
      ? 'bg-green-500/10 text-green-500 border-green-500/20'
      : 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  const getStatusIcon = (active: boolean) => {
    return active ? '✅' : '⏸️';
  };

  const formatPrice = (price?: number, currency?: string) => {
    if (!price) return 'N/A';
    return `${price.toFixed(2)} ${currency || '₺'}`;
  };

  const formatStock = (stock?: number) => {
    if (stock === undefined || stock === null) return 'N/A';
    if (stock > 10) return { text: `${stock} units`, color: 'text-green-500' };
    if (stock > 0) return { text: `${stock} units`, color: 'text-yellow-500' };
    return { text: 'Out of stock', color: 'text-red-500' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner"></div>
          <div className="text-lg text-foreground">Loading products...</div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="mobile-heading text-foreground">Product Management</h1>
            <p className="text-muted-foreground mobile-text">
              Manage your product inventory ({totalProducts} products)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalProducts} products total
            </span>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors btn-animate"
            >
              + Add Product
            </button>
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

        {/* Search and Filters */}
        <div className="bg-card p-4 rounded-lg border border-border animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-input border border-border rounded-lg form-input text-foreground placeholder-muted-foreground"
                />
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
              >
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="clothing">Clothing</option>
                <option value="books">Books</option>
                <option value="home">Home & Garden</option>
                <option value="sports">Sports</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Store Filter (Admin Only) */}
            {user?.role === 'ADMIN' && (
              <div>
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                >
                  <option value="all">All Stores</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedProducts.length > 0 && (
          <div className="bg-accent/20 p-4 rounded-lg border border-accent animate-slide-down">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {selectedProducts.length} product(s) selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => bulkToggleActive(true)}
                  disabled={saving}
                  className="px-3 py-1 bg-green-500/10 text-green-500 rounded text-sm hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  Activate All
                </button>
                <button
                  onClick={() => bulkToggleActive(false)}
                  disabled={saving}
                  className="px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded text-sm hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                >
                  Deactivate All
                </button>
                <button
                  onClick={bulkDelete}
                  disabled={saving}
                  className="px-3 py-1 bg-destructive/10 text-destructive rounded text-sm hover:bg-destructive/20 transition-colors disabled:opacity-50"
                >
                  Delete All
                </button>
                <button
                  onClick={() => setSelectedProducts([])}
                  className="px-3 py-1 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/80 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <span className="text-xl">📦</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-xl font-bold text-foreground">{totalProducts}</p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-xl font-bold text-foreground">
                  {products.filter(p => p.active).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <span className="text-xl">⚠️</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold text-foreground">
                  {products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 10).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <span className="text-xl">❌</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-xl font-bold text-foreground">
                  {products.filter(p => (p.stock || 0) === 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="space-y-4 animate-slide-up">
          {products.length === 0 ? (
            <div className="bg-card p-8 rounded-lg border border-border text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No products found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by adding your first product'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product, index) => {
                const stockInfo = formatStock(product.stock);
                return (
                  <div
                    key={product.id}
                    className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all duration-200 card-hover animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary mt-1"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground text-lg mb-1 line-clamp-2">
                            {product.name || 'Unnamed Product'}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            SKU: {product.sku}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getStatusIcon(product.active)}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="text-lg font-bold text-foreground">
                          {formatPrice(product.price, product.currency)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Stock</span>
                        <span className={`text-sm font-medium ${stockInfo.color}`}>
                          {stockInfo.text}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(product.active)}`}>
                          {product.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      <a
                        href={`/products/${product.id}`}
                        className="w-full px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium btn-animate block text-center"
                      >
                        View Details
                      </a>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(product)}
                          className="flex-1 px-3 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium btn-animate"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(product.id, product.active)}
                          disabled={saving}
                          className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium btn-animate disabled:opacity-50 ${
                            product.active
                              ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                              : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          }`}
                        >
                          {product.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          disabled={saving}
                          className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors text-sm font-medium btn-animate disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 animate-slide-up">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg border border-border p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {editingProduct ? 'Edit Product' : 'Create New Product'}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      SKU *
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.sku}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="Product SKU"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="Product Name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    rows={3}
                    placeholder="Product description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.price}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Stock
                    </label>
                    <input
                      type="number"
                      value={createForm.stock}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, stock: e.target.value }))}
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
                      value={createForm.weight}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, weight: e.target.value }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                      placeholder="0.000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={createForm.tags}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, tags: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg form-input text-foreground"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={createForm.active}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 text-primary bg-input border-border rounded focus:ring-primary"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-foreground">
                    Product is active
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={editingProduct ? updateProduct : createProduct}
                  disabled={saving || !createForm.sku}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 btn-animate"
                >
                  {saving 
                    ? (editingProduct ? 'Updating...' : 'Creating...') 
                    : (editingProduct ? 'Update Product' : 'Create Product')
                  }
                </button>
                <button
                  onClick={closeModal}
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