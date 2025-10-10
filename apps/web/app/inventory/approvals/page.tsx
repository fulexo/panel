"use client";

import { useMemo, useState } from "react";
// import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
import { 
  useInventoryRequests, 
  useInventoryRequestStats,
  useReviewInventoryRequest
} from "@/hooks/useInventoryRequests";
import { formatCurrency } from "@/lib/formatters";
import { SectionShell } from "@/components/patterns/SectionShell";
import FormLayout from "@/components/patterns/FormLayout";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormTextarea } from "@/components/forms/FormTextarea";
import { Button } from "@/components/ui/button";

const requestTypeLabels: Record<string, string> = {
  stock_adjustment: "Stok Düzenleme",
  new_product: "Yeni Ürün",
  product_update: "Ürün Güncelleme",
};

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

  const currencyOptions = useMemo(
    () => ({
      locale: "tr-TR",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    []
  );

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
        type: 'info',
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

  const requests = (requestsData as any)?.data || [];
  const stats = statsData || { total: 0, pending: 0, approved: 0, rejected: 0 };
  const totalRequests = (stats as any).total || 0;

  const statCards = [
    {
      label: "Toplam Talep",
      value: totalRequests,
      tone: "text-foreground",
      accent: "bg-accent/20 border-border",
    },
    {
      label: "Bekleyen",
      value: (stats as any).pending || 0,
      tone: "text-foreground",
      accent: "bg-accent/10 border-border",
    },
    {
      label: "Onaylanan",
      value: (stats as any).approved || 0,
      tone: "text-foreground",
      accent: "bg-accent/10 border-border",
    },
    {
      label: "Reddedilen",
      value: (stats as any).rejected || 0,
      tone: "text-foreground",
      accent: "bg-accent/10 border-border",
    },
  ];

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

          <SectionShell
            title="Talep Özeti"
            description="Bekleyen ve işlem görmüş envanter taleplerinin güncel durumu"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className={`rounded-lg border p-4 transition-colors duration-200 ${card.accent}`}
                >
                  <div className={`text-2xl font-bold ${card.tone}`}>{card.value}</div>
                  <div className="text-sm text-muted-foreground">{card.label}</div>
                </div>
              ))}
            </div>
          </SectionShell>

          {/* Requests List */}
          <SectionShell
            title="Bekleyen Talepler"
            description="Müşteri mağazalarından gelen en son envanter talepleri"
          >
            {requestsLoading ? (
              <div className="text-center py-8">
                <div className="spinner mx-auto mb-4" aria-hidden />
                <p className="text-muted-foreground">Yükleniyor...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Bekleyen talep bulunmuyor
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request: any) => {
                  const typeLabel = requestTypeLabels[request.type] ?? request.type;
                  return (
                    <SectionShell
                      key={request.id}
                      title={request.title}
                      description={`${typeLabel} • ${request.store?.name ?? 'Mağaza belirtilmemiş'}`}
                      actions={
                        <Button size="sm" onClick={() => openReviewModal(request.id)}>
                          İncele
                        </Button>
                      }
                      className="bg-card/90"
                      contentClassName="space-y-5"
                    >
                      <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                        <p>
                          <strong className="mr-1 text-foreground">Müşteri:</strong>
                          {request.customer?.name} ({request.customer?.email})
                        </p>
                        <p>
                          <strong className="mr-1 text-foreground">Oluşturulma:</strong>
                          {new Date(request.createdAt).toLocaleString('tr-TR')}
                        </p>
                        {request.description && (
                          <p className="md:col-span-2 text-foreground">
                            <strong className="mr-1">Açıklama:</strong>
                            <span className="text-muted-foreground">{request.description}</span>
                          </p>
                        )}
                      </div>

                      {request.type === 'stock_adjustment' && request.product && (
                        <div className="rounded-lg border border-dashed border-border/60 bg-accent/20 p-4 text-sm">
                          <h4 className="font-medium text-foreground mb-2">Stok Düzenleme Detayları</h4>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <p><strong>Ürün:</strong> {request.product.name}</p>
                              <p><strong>SKU:</strong> {request.product.sku}</p>
                              <p><strong>Mevcut Stok:</strong> {request.currentStock}</p>
                            </div>
                            <div className="space-y-1">
                              <p><strong>İstenen Stok:</strong> {request.requestedStock}</p>
                              <p><strong>Fark:</strong> {request.requestedStock! - request.currentStock!}</p>
                              {request.adjustmentReason && (
                                <p><strong>Neden:</strong> {request.adjustmentReason}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {request.type === 'new_product' && request.productData && (
                        <div className="rounded-lg border border-dashed border-border/60 bg-accent/20 p-4 text-sm">
                          <h4 className="font-medium text-foreground mb-2">Yeni Ürün Detayları</h4>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <p><strong>Ürün Adı:</strong> {request.productData.name}</p>
                              <p><strong>SKU:</strong> {request.productData.sku || 'Belirtilmemiş'}</p>
                              <p>
                                <strong>Fiyat:</strong>{' '}
                                {formatCurrency(Number(request.productData.price ?? 0), currencyOptions)}
                              </p>
                              {request.productData.regularPrice && (
                                <p>
                                  <strong>Normal Fiyat:</strong>{' '}
                                  {formatCurrency(Number(request.productData.regularPrice ?? 0), currencyOptions)}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1">
                              <p><strong>Stok Miktarı:</strong> {request.productData.stockQuantity || 0}</p>
                              <p><strong>Ağırlık:</strong> {request.productData.weight || 0} kg</p>
                              {request.productData.categories && request.productData.categories.length > 0 && (
                                <p><strong>Kategoriler:</strong> {request.productData.categories.join(', ')}</p>
                              )}
                            </div>
                          </div>
                          {request.productData.description && (
                            <div className="mt-2 text-muted-foreground">
                              <strong className="text-foreground">Açıklama:</strong>{' '}
                              {request.productData.description}
                            </div>
                          )}
                        </div>
                      )}

                      {request.type === 'product_update' && request.updateData && (
                        <div className="rounded-lg border border-dashed border-border/60 bg-accent/20 p-4 text-sm text-muted-foreground">
                          <h4 className="font-medium text-foreground mb-2">Ürün Güncelleme Detayları</h4>
                          <pre className="whitespace-pre-wrap text-xs">
                            {JSON.stringify(request.updateData, null, 2)}
                          </pre>
                        </div>
                      )}
                    </SectionShell>
                  );
                })}
              </div>
            )}
          </SectionShell>

          {/* Review Modal */}
          {showReviewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
                <form onSubmit={handleReviewRequest} className="space-y-6">
                  <FormLayout
                  title="Talep İnceleme"
                  description="Talep durumunu güncelleyin ve gerekirse açıklama ekleyin."
                  className="space-y-6"
                >
                  <FormLayout.Section>
                    <FormSelect
                      label="Karar"
                      required
                      value={reviewForm.status}
                      onChange={(event) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          status: event.target.value as 'approved' | 'rejected',
                          rejectionReason:
                            event.target.value === 'approved' ? '' : prev.rejectionReason,
                        }))
                      }
                      options={[
                        { value: 'approved', label: 'Onayla' },
                        { value: 'rejected', label: 'Reddet' },
                      ]}
                    />
                  </FormLayout.Section>

                  {reviewForm.status === 'rejected' && (
                    <FormLayout.Section>
                      <FormTextarea
                        label="Red Nedeni"
                        required
                        rows={3}
                        placeholder="Red nedenini açıklayın..."
                        value={reviewForm.rejectionReason}
                        onChange={(event) =>
                          setReviewForm((prev) => ({
                            ...prev,
                            rejectionReason: event.target.value,
                          }))
                        }
                      />
                    </FormLayout.Section>
                  )}

                  <FormLayout.Section>
                    <FormTextarea
                      label="Admin Notları"
                      rows={3}
                      placeholder="Ek notlar..."
                      value={reviewForm.adminNotes}
                      onChange={(event) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          adminNotes: event.target.value,
                        }))
                      }
                    />
                  </FormLayout.Section>

                  <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowReviewModal(false);
                        setSelectedRequest(null);
                        setReviewForm({
                          status: 'approved',
                          rejectionReason: '',
                          adminNotes: '',
                        });
                      }}
                    >
                      İptal
                    </Button>
                    <Button type="submit" disabled={reviewRequestMutation.isPending}>
                      {reviewRequestMutation.isPending ? 'İşleniyor...' : 'Karar Ver'}
                    </Button>
                  </div>
                  </FormLayout>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
