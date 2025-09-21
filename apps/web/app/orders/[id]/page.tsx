"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useOrder } from "@/hooks/useOrders";
import { 
  useFulfillmentServices,
  useFulfillmentBillingItems,
  useCreateFulfillmentBillingItem,
  useUpdateFulfillmentBillingItem,
  useDeleteFulfillmentBillingItem
} from "@/hooks/useFulfillmentBilling";

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const { user } = useAuth();
  const { isAdmin, isCustomer } = useRBAC();
  const [activeTab, setActiveTab] = useState<'details' | 'fulfillment'>('details');
  const [showAddFulfillment, setShowAddFulfillment] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // Form state
  const [fulfillmentForm, setFulfillmentForm] = useState({
    serviceId: '',
    quantity: 1,
    unitPrice: 0,
    description: '',
    serviceDate: new Date().toISOString().split('T')[0],
  });

  const { data: order, isLoading: orderLoading } = useOrder(orderId);
  const { data: services, isLoading: servicesLoading } = useFulfillmentServices();
  const { data: billingItems, isLoading: billingItemsLoading } = useFulfillmentBillingItems({
    orderId,
  });

  const createBillingItemMutation = useCreateFulfillmentBillingItem();
  const updateBillingItemMutation = useUpdateFulfillmentBillingItem();
  const deleteBillingItemMutation = useDeleteFulfillmentBillingItem();

  const handleAddFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fulfillmentForm.serviceId) {
      alert("Lütfen hizmet seçin");
      return;
    }

    try {
      await createBillingItemMutation.mutateAsync({
        orderId,
        serviceId: fulfillmentForm.serviceId,
        quantity: fulfillmentForm.quantity,
        unitPrice: fulfillmentForm.unitPrice || undefined,
        description: fulfillmentForm.description || undefined,
        serviceDate: fulfillmentForm.serviceDate,
      });
      
      setFulfillmentForm({
        serviceId: '',
        quantity: 1,
        unitPrice: 0,
        description: '',
        serviceDate: new Date().toISOString().split('T')[0],
      });
      setShowAddFulfillment(false);
      alert("Fulfillment hizmeti eklendi");
    } catch (error) {
      console.error("Fulfillment ekleme hatası:", error);
      alert("Fulfillment hizmeti eklenirken bir hata oluştu");
    }
  };

  const handleUpdateFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingItem) return;

    try {
      await updateBillingItemMutation.mutateAsync({
        id: editingItem,
        data: {
          quantity: fulfillmentForm.quantity,
          unitPrice: fulfillmentForm.unitPrice || undefined,
          description: fulfillmentForm.description || undefined,
          serviceDate: fulfillmentForm.serviceDate,
        },
      });
      
      setEditingItem(null);
      setFulfillmentForm({
        serviceId: '',
        quantity: 1,
        unitPrice: 0,
        description: '',
        serviceDate: new Date().toISOString().split('T')[0],
      });
      alert("Fulfillment hizmeti güncellendi");
    } catch (error) {
      console.error("Fulfillment güncelleme hatası:", error);
      alert("Fulfillment hizmeti güncellenirken bir hata oluştu");
    }
  };

  const handleDeleteFulfillment = async (id: string) => {
    if (confirm("Bu fulfillment hizmetini silmek istediğinizden emin misiniz?")) {
      try {
        await deleteBillingItemMutation.mutateAsync(id);
        alert("Fulfillment hizmeti silindi");
      } catch (error) {
        console.error("Fulfillment silme hatası:", error);
        alert("Fulfillment hizmeti silinirken bir hata oluştu");
      }
    }
  };

  const openEditModal = (item: any) => {
    setEditingItem(item.id);
    setFulfillmentForm({
      serviceId: item.serviceId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      description: item.description || '',
      serviceDate: item.serviceDate.split('T')[0],
    });
  };

  if (orderLoading) {
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

  if (!order) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Sipariş Bulunamadı</h1>
            <p className="text-muted-foreground">Aradığınız sipariş bulunamadı.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Check access permissions
  if (isCustomer() && order.customer?.id !== user?.id) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Erişim Reddedildi</h1>
            <p className="text-muted-foreground">Bu siparişe erişim yetkiniz yok.</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const items = billingItems?.data || [];
  const totalFulfillmentCost = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Sipariş Detayı</h1>
              <p className="text-muted-foreground mobile-text">
                Sipariş #{order.orderNumber || order.id}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.history.back()}
                className="btn btn-outline"
              >
                Geri Dön
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-accent p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sipariş Detayları
            </button>
            <button
              onClick={() => setActiveTab('fulfillment')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'fulfillment'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Fulfillment Hizmetleri
            </button>
          </div>

          {/* Order Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">Sipariş Bilgileri</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sipariş Numarası</p>
                    <p className="font-medium text-foreground">{order.orderNumber || order.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Durum</p>
                    <p className="font-medium text-foreground">{order.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                    <p className="font-medium text-foreground">₺{order.total.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Oluşturulma Tarihi</p>
                    <p className="font-medium text-foreground">
                      {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              {order.customer && (
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h2 className="text-xl font-semibold text-foreground mb-4">Müşteri Bilgileri</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Müşteri Adı</p>
                      <p className="font-medium text-foreground">{order.customer.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">E-posta</p>
                      <p className="font-medium text-foreground">{order.customer.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">Sipariş Ürünleri</h2>
                <div className="space-y-4">
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-accent rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {item.product.sku} • Miktar: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          ₺{(item.price * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ₺{item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fulfillment Tab */}
          {activeTab === 'fulfillment' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">Fulfillment Hizmetleri</h2>
                <button
                  onClick={() => setShowAddFulfillment(true)}
                  className="btn btn-primary"
                >
                  Hizmet Ekle
                </button>
              </div>

              {/* Fulfillment Items */}
              {billingItemsLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="bg-card p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-foreground">{item.service.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {item.service.unit} × ₺{item.unitPrice.toFixed(2)}
                          </p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              ₺{item.totalPrice.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.serviceDate).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          {!item.isBilled && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditModal(item)}
                                className="btn btn-sm btn-outline"
                              >
                                Düzenle
                              </button>
                              <button
                                onClick={() => handleDeleteFulfillment(item.id)}
                                className="btn btn-sm btn-danger"
                              >
                                Sil
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.isBilled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.isBilled ? 'Faturalandı' : 'Faturalanmadı'}
                        </span>
                        {item.isBilled && (
                          <span className="text-muted-foreground">
                            Fatura: {item.invoiceId}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Henüz fulfillment hizmeti eklenmemiş
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              {items.length > 0 && (
                <div className="bg-card p-4 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-foreground">Toplam Fulfillment Maliyeti:</span>
                    <span className="text-lg font-bold text-foreground">₺{totalFulfillmentCost.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Add Fulfillment Modal */}
          {showAddFulfillment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Fulfillment Hizmeti Ekle</h3>
                <form onSubmit={handleAddFulfillment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Hizmet *
                    </label>
                    <select
                      value={fulfillmentForm.serviceId}
                      onChange={(e) => {
                        const service = services?.find(s => s.id === e.target.value);
                        setFulfillmentForm(prev => ({
                          ...prev,
                          serviceId: e.target.value,
                          unitPrice: service?.basePrice || 0,
                        }));
                      }}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">Hizmet Seçin</option>
                      {services?.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} - ₺{service.basePrice.toFixed(2)}/{service.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Miktar *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={fulfillmentForm.quantity}
                        onChange={(e) => setFulfillmentForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                        required
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Birim Fiyat (₺)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={fulfillmentForm.unitPrice}
                        onChange={(e) => setFulfillmentForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Hizmet Tarihi
                    </label>
                    <input
                      type="date"
                      value={fulfillmentForm.serviceDate}
                      onChange={(e) => setFulfillmentForm(prev => ({ ...prev, serviceDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={fulfillmentForm.description}
                      onChange={(e) => setFulfillmentForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      placeholder="Hizmet açıklaması..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddFulfillment(false)}
                      className="btn btn-outline"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={createBillingItemMutation.isPending}
                      className="btn btn-primary"
                    >
                      {createBillingItemMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Fulfillment Modal */}
          {editingItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Fulfillment Hizmeti Düzenle</h3>
                <form onSubmit={handleUpdateFulfillment} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Miktar *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={fulfillmentForm.quantity}
                        onChange={(e) => setFulfillmentForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                        required
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Birim Fiyat (₺)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={fulfillmentForm.unitPrice}
                        onChange={(e) => setFulfillmentForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Hizmet Tarihi
                    </label>
                    <input
                      type="date"
                      value={fulfillmentForm.serviceDate}
                      onChange={(e) => setFulfillmentForm(prev => ({ ...prev, serviceDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={fulfillmentForm.description}
                      onChange={(e) => setFulfillmentForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      placeholder="Hizmet açıklaması..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        setFulfillmentForm({
                          serviceId: '',
                          quantity: 1,
                          unitPrice: 0,
                          description: '',
                          serviceDate: new Date().toISOString().split('T')[0],
                        });
                      }}
                      className="btn btn-outline"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={updateBillingItemMutation.isPending}
                      className="btn btn-primary"
                    >
                      {updateBillingItemMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
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