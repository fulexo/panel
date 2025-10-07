"use client";

import { useMemo, useState } from "react";
// import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
// import ProtectedComponent from "@/components/ProtectedComponent";
import { usePendingApprovals, useApproveOrder, useRejectOrder } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/formatters";
import { SectionShell } from "@/components/patterns/SectionShell";
import { FormLayout } from "@/components/patterns/FormLayout";
import { FormTextarea } from "@/components/forms/FormTextarea";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";

export default function OrderApprovalsPage() {
  // const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const { addNotification } = useApp();
  const [page, setPage] = useState(1);
  const [storeFilter, setStoreFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionNotes, setRejectionNotes] = useState("");

  const { data: approvalsData, isLoading } = usePendingApprovals({
    page,
    limit: 10,
    ...(storeFilter ? { storeId: storeFilter } : {}),
  });

  const approveOrderMutation = useApproveOrder();
  const rejectOrderMutation = useRejectOrder();

  const currencyOptions = useMemo(
    () => ({
      locale: "tr-TR",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    []
  );

  const handleApprove = async (orderId: string) => {
    try {
      await approveOrderMutation.mutateAsync({
        id: orderId,
        notes: approvalNotes,
      });
      setSelectedOrder(null);
      setApprovalNotes("");
      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Sipariş onaylandı'
      });
    } catch (error) {
      console.error("Onaylama hatası:", error);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Sipariş onaylanırken bir hata oluştu'
      });
    }
  };

  const handleReject = async (orderId: string) => {
    if (!rejectionReason.trim()) {
      addNotification({
        type: 'warning',
        title: 'Eksik Bilgi',
        message: 'Red nedeni gereklidir'
      });
      return;
    }

    try {
      await rejectOrderMutation.mutateAsync({
        id: orderId,
        reason: rejectionReason,
        notes: rejectionNotes,
      });
      setSelectedOrder(null);
      setRejectionReason("");
      setRejectionNotes("");
      addNotification({
        type: 'success',
        title: 'Başarılı',
        message: 'Sipariş reddedildi'
      });
    } catch (error) {
      console.error("Reddetme hatası:", error);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Sipariş reddedilirken bir hata oluştu'
      });
    }
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner"></div>
            <div className="text-lg text-foreground">Yükleniyor...</div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const orders = (approvalsData as any)?.data || [];
  const totalPages = (approvalsData as any)?.pagination?.totalPages || 1;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Sipariş Onayları</h1>
              <p className="text-muted-foreground mobile-text">
                Onay bekleyen siparişleri yönetin
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="">Tüm Mağazalar</option>
              {/* Add store options here */}
            </select>
          </div>

          {/* Orders List */}
          <SectionShell
            title={`Onay Bekleyen Siparişler (${orders.length})`}
            description="Onay bekleyen siparişlerin listesi"
          >
            
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Onay bekleyen sipariş bulunmuyor
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <div key={order.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground">
                          Sipariş #{order.orderNo}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Müşteri: {order.customer?.name || order.customerEmail}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          E-posta: {order.customerEmail}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Telefon: {order.customerPhone || "Belirtilmemiş"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Toplam: {formatCurrency(Number(order.total ?? 0), currencyOptions)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Tarih: {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                          Onay Bekliyor
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="mb-4">
                      <h5 className="font-medium text-foreground mb-2">Sipariş İçeriği:</h5>
                      <div className="space-y-2">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center text-sm">
                            <span className="text-foreground">
                              {item.name} (SKU: {item.sku})
                            </span>
                            <span className="text-muted-foreground">
                              {item.quantity} × {formatCurrency(Number(item.price ?? 0), currencyOptions)} =
                              {" "}
                              {formatCurrency(item.quantity * Number(item.price ?? 0), currencyOptions)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Address Information */}
                    <div className="mb-4">
                      <h5 className="font-medium text-foreground mb-2">Teslimat Adresi:</h5>
                      <div className="text-sm text-muted-foreground">
                        {order.shippingAddress && (
                          <div>
                            <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                            <p>{order.shippingAddress.addressLine1}</p>
                            {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                            <p>{order.shippingAddress.country}</p>
                            {order.shippingAddress.phone && <p>Tel: {order.shippingAddress.phone}</p>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="mb-4">
                        <h5 className="font-medium text-foreground mb-2">Notlar:</h5>
                        <p className="text-sm text-muted-foreground">{order.notes}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedOrder(order.id)}
                        variant="outline"
                        size="sm"
                      >
                        Detaylı Görüntüle
                      </Button>
                      <Button
                        onClick={() => handleApprove(order.id)}
                        disabled={approveOrderMutation.isPending}
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {approveOrderMutation.isPending ? "Onaylanıyor..." : "Onayla"}
                      </Button>
                      <Button
                        onClick={() => setSelectedOrder(order.id)}
                        variant="destructive"
                        size="sm"
                      >
                        Reddet
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                <Button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                  size="sm"
                >
                  Önceki
                </Button>
                <span className="px-4 py-2 text-sm text-muted-foreground">
                  Sayfa {page} / {totalPages}
                </span>
                <Button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Sonraki
                </Button>
              </div>
            )}
          </SectionShell>

          {/* Approval Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border max-w-md w-full mx-4 shadow-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">Sipariş Onayı</h3>
                
                <FormLayout>
                  <FormTextarea
                    label="Onay Notları (İsteğe bağlı)"
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    rows={3}
                    placeholder="Onay hakkında notlar..."
                  />

                  <FormField
                    label="Red Nedeni (Reddetmek için)"
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Red nedeni..."
                  />

                  <FormTextarea
                    label="Red Notları (İsteğe bağlı)"
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    rows={3}
                    placeholder="Red hakkında notlar..."
                  />
                </FormLayout>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    onClick={() => {
                      setSelectedOrder(null);
                      setApprovalNotes("");
                      setRejectionReason("");
                      setRejectionNotes("");
                    }}
                    variant="outline"
                  >
                    İptal
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedOrder)}
                    disabled={approveOrderMutation.isPending}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {approveOrderMutation.isPending ? "Onaylanıyor..." : "Onayla"}
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedOrder)}
                    disabled={rejectOrderMutation.isPending}
                    variant="destructive"
                  >
                    {rejectOrderMutation.isPending ? "Reddediliyor..." : "Reddet"}
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
