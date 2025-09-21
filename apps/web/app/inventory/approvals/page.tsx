"use client";

import { useState } from "react";
// import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
import { 
  useInventoryRequests, 
  useInventoryRequestStats,
  useReviewInventoryRequest
} from "@/hooks/useInventoryRequests";

export default function InventoryApprovalsPage() {
  // const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const { addNotification } = useApp();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    status: 'approved' as 'approved' | 'rejected',
    rejectionReason: '',
    adminNotes: '',
  });

  const { data: requestsData, isLoading: requestsLoading } = useInventoryRequests({
    status: 'pending',
  });

  const { data: statsData } = useInventoryRequestStats();

  const reviewRequestMutation = useReviewInventoryRequest();

  const handleReviewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRequest) return;

    try {
      await reviewRequestMutation.mutateAsync({
        id: selectedRequest,
        data: {
          status: reviewForm.status,
          ...(reviewForm.rejectionReason && { rejectionReason: reviewForm.rejectionReason }),
          ...(reviewForm.adminNotes && { adminNotes: reviewForm.adminNotes }),
        },
      });
      
      setShowReviewModal(false);
      setSelectedRequest(null);
      setReviewForm({
        status: 'approved',
        rejectionReason: '',
        adminNotes: '',
      });
      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: `Talep ${reviewForm.status === 'approved' ? 'onaylandı' : 'reddedildi'}`
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Talep incelenirken bir hata oluştu'
      });
    }
  };

  const openReviewModal = (requestId: string) => {
    setSelectedRequest(requestId);
    setShowReviewModal(true);
  };

  if (!isAdmin()) {
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
  const stats = statsData || { total: 0, pending: 0, approved: 0, rejected: 0 };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Envanter Talepleri Onayı</h1>
              <p className="text-muted-foreground mobile-text">
                Müşteri envanter taleplerini inceleyin ve onaylayın
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

          {/* Requests List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Bekleyen Talepler</h2>
            
            {requestsLoading ? (
              <div className="text-center py-8">
                <div className="spinner mx-auto mb-4"></div>
                <p className="text-muted-foreground">Yükleniyor...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request: any) => (
                  <div key={request.id} className="bg-card p-6 rounded-lg border border-border">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">{request.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.type === 'stock_adjustment' && 'Stok Düzenleme'}
                          {request.type === 'new_product' && 'Yeni Ürün'}
                          {request.type === 'product_update' && 'Ürün Güncelleme'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Müşteri: {request.customer?.name} ({request.customer?.email})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Mağaza: {request.store?.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openReviewModal(request.id)}
                          className="btn btn-primary"
                        >
                          İncele
                        </button>
                      </div>
                    </div>

                    {request.description && (
                      <div className="mb-4">
                        <h4 className="font-medium text-foreground mb-2">Açıklama:</h4>
                        <p className="text-sm text-muted-foreground">{request.description}</p>
                      </div>
                    )}

                    {/* Stock Adjustment Details */}
                    {request.type === 'stock_adjustment' && request.product && (
                      <div className="mb-4 p-4 bg-accent rounded-lg">
                        <h4 className="font-medium text-foreground mb-2">Stok Düzenleme Detayları:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Ürün:</strong> {request.product.name}</p>
                            <p><strong>SKU:</strong> {request.product.sku}</p>
                            <p><strong>Mevcut Stok:</strong> {request.currentStock}</p>
                          </div>
                          <div>
                            <p><strong>İstenen Stok:</strong> {request.requestedStock}</p>
                            <p><strong>Fark:</strong> {request.requestedStock! - request.currentStock!}</p>
                            {request.adjustmentReason && (
                              <p><strong>Neden:</strong> {request.adjustmentReason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* New Product Details */}
                    {request.type === 'new_product' && request.productData && (
                      <div className="mb-4 p-4 bg-accent rounded-lg">
                        <h4 className="font-medium text-foreground mb-2">Yeni Ürün Detayları:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Ürün Adı:</strong> {request.productData.name}</p>
                            <p><strong>SKU:</strong> {request.productData.sku || 'Belirtilmemiş'}</p>
                            <p><strong>Fiyat:</strong> ₺{request.productData.price}</p>
                            {request.productData.regularPrice && (
                              <p><strong>Normal Fiyat:</strong> ₺{request.productData.regularPrice}</p>
                            )}
                          </div>
                          <div>
                            <p><strong>Stok Miktarı:</strong> {request.productData.stockQuantity || 0}</p>
                            <p><strong>Ağırlık:</strong> {request.productData.weight || 0} kg</p>
                            {request.productData.categories && request.productData.categories.length > 0 && (
                              <p><strong>Kategoriler:</strong> {request.productData.categories.join(', ')}</p>
                            )}
                          </div>
                        </div>
                        {request.productData.description && (
                          <div className="mt-2">
                            <p><strong>Açıklama:</strong></p>
                            <p className="text-muted-foreground">{request.productData.description}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Product Update Details */}
                    {request.type === 'product_update' && request.updateData && (
                      <div className="mb-4 p-4 bg-accent rounded-lg">
                        <h4 className="font-medium text-foreground mb-2">Ürün Güncelleme Detayları:</h4>
                        <div className="text-sm">
                          <pre className="whitespace-pre-wrap text-muted-foreground">
                            {JSON.stringify(request.updateData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Oluşturulma: {new Date(request.createdAt).toLocaleString('tr-TR')}
                    </div>
                  </div>
                ))}

                {requests.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Bekleyen talep bulunmuyor
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Review Modal */}
          {showReviewModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Talep İnceleme</h3>
                <form onSubmit={handleReviewRequest} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Karar *
                    </label>
                    <select
                      value={reviewForm.status}
                      onChange={(e) => setReviewForm(prev => ({ 
                        ...prev, 
                        status: e.target.value as 'approved' | 'rejected' 
                      }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="approved">Onayla</option>
                      <option value="rejected">Reddet</option>
                    </select>
                  </div>

                  {reviewForm.status === 'rejected' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Red Nedeni *
                      </label>
                      <textarea
                        value={reviewForm.rejectionReason}
                        onChange={(e) => setReviewForm(prev => ({ ...prev, rejectionReason: e.target.value }))}
                        required={reviewForm.status === 'rejected'}
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        placeholder="Red nedenini açıklayın..."
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Admin Notları
                    </label>
                    <textarea
                      value={reviewForm.adminNotes}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      placeholder="Ek notlar..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReviewModal(false);
                        setSelectedRequest(null);
                        setReviewForm({
                          status: 'approved',
                          rejectionReason: '',
                          adminNotes: '',
                        });
                      }}
                      className="btn btn-outline"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={reviewRequestMutation.isPending}
                      className="btn btn-primary"
                    >
                      {reviewRequestMutation.isPending ? 'İşleniyor...' : 'Karar Ver'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}