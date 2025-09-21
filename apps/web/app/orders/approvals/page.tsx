"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedComponent from "@/components/ProtectedComponent";
import { usePendingApprovals, useApproveOrder, useRejectOrder } from "@/hooks/useOrders";

export default function OrderApprovalsPage() {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
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

  const handleApprove = async (orderId: string) => {
    try {
      await approveOrderMutation.mutateAsync({
        id: orderId,
        notes: approvalNotes,
      });
      setSelectedOrder(null);
      setApprovalNotes("");
      alert("Sipariş onaylandı");
    } catch (error) {
      console.error("Onaylama hatası:", error);
      alert("Sipariş onaylanırken bir hata oluştu");
    }
  };

  const handleReject = async (orderId: string) => {
    if (!rejectionReason.trim()) {
      alert("Red nedeni gereklidir");
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
      alert("Sipariş reddedildi");
    } catch (error) {
      console.error("Reddetme hatası:", error);
      alert("Sipariş reddedilirken bir hata oluştu");
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

  const orders = approvalsData?.data || [];
  const totalPages = approvalsData?.pagination?.totalPages || 1;

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
          <div className="bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Onay Bekleyen Siparişler ({orders.length})
            </h3>
            
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
                          Toplam: ₺{Number(order.total).toFixed(2)}
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
                              {item.quantity} × ₺{Number(item.price).toFixed(2)} = ₺{(item.quantity * Number(item.price)).toFixed(2)}
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
                      <button
                        onClick={() => setSelectedOrder(order.id)}
                        className="btn btn-sm btn-outline"
                      >
                        Detaylı Görüntüle
                      </button>
                      <button
                        onClick={() => handleApprove(order.id)}
                        disabled={approveOrderMutation.isPending}
                        className="btn btn-sm btn-success"
                      >
                        {approveOrderMutation.isPending ? "Onaylanıyor..." : "Onayla"}
                      </button>
                      <button
                        onClick={() => setSelectedOrder(order.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Reddet
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-outline btn-sm"
                >
                  Önceki
                </button>
                <span className="px-4 py-2 text-sm text-muted-foreground">
                  Sayfa {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline btn-sm"
                >
                  Sonraki
                </button>
              </div>
            )}
          </div>

          {/* Approval Modal */}
          {selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Sipariş Onayı</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Onay Notları (İsteğe bağlı)
                    </label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      placeholder="Onay hakkında notlar..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Red Nedeni (Reddetmek için)
                    </label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      placeholder="Red nedeni..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Red Notları (İsteğe bağlı)
                    </label>
                    <textarea
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      placeholder="Red hakkında notlar..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      setApprovalNotes("");
                      setRejectionReason("");
                      setRejectionNotes("");
                    }}
                    className="btn btn-outline"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => handleApprove(selectedOrder)}
                    disabled={approveOrderMutation.isPending}
                    className="btn btn-success"
                  >
                    {approveOrderMutation.isPending ? "Onaylanıyor..." : "Onayla"}
                  </button>
                  <button
                    onClick={() => handleReject(selectedOrder)}
                    disabled={rejectOrderMutation.isPending}
                    className="btn btn-danger"
                  >
                    {rejectOrderMutation.isPending ? "Reddediliyor..." : "Reddet"}
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