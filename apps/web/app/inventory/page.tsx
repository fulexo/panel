"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
import { useProducts } from "@/hooks/useProducts";
import { 
  useInventoryRequests, 
  useInventoryRequestStats,
  useCreateInventoryRequest,
  // useUpdateInventoryRequest,
  useDeleteInventoryRequest
} from "@/hooks/useInventoryRequests";

export default function InventoryPage() {
  const { user } = useAuth();
  const { isCustomer } = useRBAC();
  const { addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'requests' | 'stock-adjustment' | 'new-product'>('requests');
  const [selectedStore, setSelectedStore] = useState<string>("");
  // const [showCreateModal, setShowCreateModal] = useState(false);
  // const [editingRequest, setEditingRequest] = useState<string | null>(null);

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
  });

  // Get user's store ID
  useEffect(() => {
    if (user?.stores?.[0]?.id) {
      setSelectedStore(user.stores[0].id);
    }
  }, [user]);

  const { data: productsData } = useProducts({
    storeId: selectedStore,
    limit: 100,
  });

  const { data: requestsData, isLoading: requestsLoading } = useInventoryRequests({
    storeId: selectedStore,
  });

  const { data: statsData } = useInventoryRequestStats();

  const createRequestMutation = useCreateInventoryRequest();
  // const updateRequestMutation = useUpdateInventoryRequest();
  const deleteRequestMutation = useDeleteInventoryRequest();

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
      // setShowCreateModal(false);
      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Stok düzenleme talebi oluşturuldu!'
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Stok düzenleme talebi oluşturulurken bir hata oluştu'
      });
    }
  };

  const handleCreateNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStore || !productForm.name || !productForm.price) {
      addNotification({
        type: 'warning',
        title: 'Eksik Bilgi',
        message: 'Lütfen gerekli alanları doldurun'
      });
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        storeId: selectedStore,
        type: 'new_product',
        title: `Yeni Ürün - ${productForm.name}`,
        description: productForm.description,
        productData: {
          name: productForm.name,
          sku: productForm.sku,
          price: productForm.price,
          regularPrice: productForm.regularPrice || productForm.price,
          description: productForm.description,
          shortDescription: productForm.shortDescription,
          weight: productForm.weight || 0,
          categories: productForm.categories,
          tags: productForm.tags,
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
      });
      // setShowCreateModal(false);
      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Yeni ürün talebi oluşturuldu!'
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Yeni ürün talebi oluşturulurken bir hata oluştu'
      });
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (confirm("Bu talebi silmek istediğinizden emin misiniz?")) {
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

  if (!isCustomer()) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Erişim Reddedildi</h1>
            <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const requests = requestsData?.data || [];
  const products = (productsData as any)?.data || [];
  const stats = statsData || { total: 0, pending: 0, approved: 0, rejected: 0 };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Envanter Yönetimi</h1>
              <p className="text-muted-foreground mobile-text">
                Stok düzenlemeleri ve yeni ürün talepleri oluşturun
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-lg border border-border">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Toplam Talep</div>
            </div>
            <div className="bg-card p-4 rounded-lg border border-border">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Bekleyen</div>
            </div>
            <div className="bg-card p-4 rounded-lg border border-border">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-muted-foreground">Onaylanan</div>
            </div>
            <div className="bg-card p-4 rounded-lg border border-border">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-muted-foreground">Reddedilen</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-accent p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Taleplerim
            </button>
            <button
              onClick={() => setActiveTab('stock-adjustment')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'stock-adjustment'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Stok Düzenleme
            </button>
            <button
              onClick={() => setActiveTab('new-product')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'new-product'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yeni Ürün
            </button>
          </div>

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Envanter Talepleri</h2>
              
              {requestsLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request: any) => (
                    <div key={request.id} className="bg-card p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-foreground">{request.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {request.type === 'stock_adjustment' && 'Stok Düzenleme'}
                            {request.type === 'new_product' && 'Yeni Ürün'}
                            {request.type === 'product_update' && 'Ürün Güncelleme'}
                          </p>
                          {request.description && (
                            <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status === 'pending' && 'Bekliyor'}
                            {request.status === 'approved' && 'Onaylandı'}
                            {request.status === 'rejected' && 'Reddedildi'}
                          </span>
                          {request.status === 'pending' && (
                            <button
                              onClick={() => handleDeleteRequest(request.id)}
                              className="btn btn-sm btn-danger"
                            >
                              Sil
                            </button>
                          )}
                        </div>
                      </div>

                      {request.type === 'stock_adjustment' && request.product && (
                        <div className="text-sm text-muted-foreground">
                          <p>Ürün: {request.product.name} (SKU: {request.product.sku})</p>
                          <p>Mevcut Stok: {request.currentStock} → İstenen Stok: {request.requestedStock}</p>
                        </div>
                      )}

                      {request.type === 'new_product' && request.productData && (
                        <div className="text-sm text-muted-foreground">
                          <p>Ürün Adı: {request.productData.name}</p>
                          <p>SKU: {request.productData.sku}</p>
                          <p>Fiyat: ₺{request.productData.price}</p>
                        </div>
                      )}

                      {request.adminNotes && (
                        <div className="mt-2 p-2 bg-accent rounded text-sm">
                          <strong>Admin Notu:</strong> {request.adminNotes}
                        </div>
                      )}

                      {request.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                          <strong>Red Nedeni:</strong> {request.rejectionReason}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground mt-2">
                        Oluşturulma: {new Date(request.createdAt).toLocaleDateString('tr-TR')}
                        {request.reviewedAt && (
                          <span> • İncelenme: {new Date(request.reviewedAt).toLocaleDateString('tr-TR')}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {requests.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Henüz talep bulunmuyor
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stock Adjustment Tab */}
          {activeTab === 'stock-adjustment' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Stok Düzenleme</h2>
              
              <form onSubmit={handleCreateStockAdjustment} className="bg-card p-6 rounded-lg border border-border space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Ürün Seçin *
                  </label>
                  <select
                    value={stockForm.productId}
                    onChange={(e) => {
                      const product = products.find((p: any) => p.id === e.target.value);
                      setStockForm(prev => ({
                        ...prev,
                        productId: e.target.value,
                        currentStock: product?.stockQuantity || 0,
                      }));
                    }}
                    required
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="">Ürün Seçin</option>
                    {products.map((product: any) => (
                      <option key={product.id} value={product.id}>
                        {product.name} (SKU: {product.sku}) - Mevcut: {product.stockQuantity || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Mevcut Stok
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockForm.currentStock}
                      onChange={(e) => setStockForm(prev => ({ ...prev, currentStock: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      İstenen Stok *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockForm.requestedStock}
                      onChange={(e) => setStockForm(prev => ({ ...prev, requestedStock: parseInt(e.target.value) || 0 }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Düzenleme Nedeni
                  </label>
                  <textarea
                    value={stockForm.adjustmentReason}
                    onChange={(e) => setStockForm(prev => ({ ...prev, adjustmentReason: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="Stok düzenleme nedenini açıklayın..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={createRequestMutation.isPending}
                  className="btn btn-primary"
                >
                  {createRequestMutation.isPending ? 'Oluşturuluyor...' : 'Stok Düzenleme Talebi Oluştur'}
                </button>
              </form>
            </div>
          )}

          {/* New Product Tab */}
          {activeTab === 'new-product' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-foreground">Yeni Ürün Önerisi</h2>
              
              <form onSubmit={handleCreateNewProduct} className="bg-card p-6 rounded-lg border border-border space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ürün Adı *
                    </label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={productForm.sku}
                      onChange={(e) => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fiyat (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Normal Fiyat (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.regularPrice}
                      onChange={(e) => setProductForm(prev => ({ ...prev, regularPrice: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Başlangıç Stoku
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={productForm.stockQuantity}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stockQuantity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Açıklama
                  </label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="Ürün açıklaması..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Kısa Açıklama
                  </label>
                  <textarea
                    value={productForm.shortDescription}
                    onChange={(e) => setProductForm(prev => ({ ...prev, shortDescription: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="Kısa ürün açıklaması..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Ağırlık (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productForm.weight}
                    onChange={(e) => setProductForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>

                <button
                  type="submit"
                  disabled={createRequestMutation.isPending}
                  className="btn btn-primary"
                >
                  {createRequestMutation.isPending ? 'Oluşturuluyor...' : 'Yeni Ürün Talebi Oluştur'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}