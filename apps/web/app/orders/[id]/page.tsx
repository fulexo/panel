"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
import { useOrder } from "@/hooks/useOrders";
import { CreateShipmentModal } from "@/components/modals/CreateShipmentModal";
import { 
  useFulfillmentServices,
  useFulfillmentBillingItems,
  useCreateFulfillmentBillingItem,
  useUpdateFulfillmentBillingItem,
  useDeleteFulfillmentBillingItem
} from "@/hooks/useFulfillmentBilling";
import { formatCurrency } from "@/lib/formatters";
import { SectionShell } from "@/components/patterns/SectionShell";
import { FormLayout } from "@/components/patterns/FormLayout";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormField } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params['id'] as string;
  const { user } = useAuth();
  const { isCustomer } = useRBAC();
  const { addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'details' | 'fulfillment'>('details');
  const [showAddFulfillment, setShowAddFulfillment] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isShipmentModalOpen, setShipmentModalOpen] = useState(false);

  // Form state
  const [fulfillmentForm, setFulfillmentForm] = useState({
    serviceId: '',
    quantity: 1,
    unitPrice: 0,
    description: '',
    serviceDate: new Date().toISOString().split('T')[0],
  });

  const { data: order, isLoading: orderLoading } = useOrder(orderId);
  const { data: services } = useFulfillmentServices();
  const { data: billingItems, isLoading: billingItemsLoading } = useFulfillmentBillingItems({
    orderId,
  });

  const createBillingItemMutation = useCreateFulfillmentBillingItem();
  const updateBillingItemMutation = useUpdateFulfillmentBillingItem();
  const deleteBillingItemMutation = useDeleteFulfillmentBillingItem();

  const currencyOptions = useMemo(
    () => ({
      locale: "tr-TR",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    []
  );

  const handleAddFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fulfillmentForm.serviceId) {
      addNotification({
        type: 'info',
        title: 'Eksik Bilgi',
        message: 'Lütfen hizmet seçin'
      });
      return;
    }

    try {
      await createBillingItemMutation.mutateAsync({
        orderId,
        serviceId: fulfillmentForm.serviceId,
        quantity: fulfillmentForm.quantity,
        ...(fulfillmentForm.unitPrice && { unitPrice: fulfillmentForm.unitPrice }),
        ...(fulfillmentForm.description && { description: fulfillmentForm.description }),
        ...(fulfillmentForm.serviceDate && { serviceDate: fulfillmentForm.serviceDate }),
      });
      
      setFulfillmentForm({
        serviceId: '',
        quantity: 1,
        unitPrice: 0,
        description: '',
        serviceDate: new Date().toISOString().split('T')[0],
      });
      setShowAddFulfillment(false);
      addNotification({
        type: 'info',
        title: 'Başarılı',
        message: 'Fulfillment hizmeti eklendi'
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Fulfillment hizmeti eklenirken bir hata oluştu'
      });
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
          ...(fulfillmentForm.unitPrice && { unitPrice: fulfillmentForm.unitPrice }),
          ...(fulfillmentForm.description && { description: fulfillmentForm.description }),
          ...(fulfillmentForm.serviceDate && { serviceDate: fulfillmentForm.serviceDate }),
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
      addNotification({
        type: 'info',
        title: 'Başarılı',
        message: 'Fulfillment hizmeti güncellendi'
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Fulfillment hizmeti güncellenirken bir hata oluştu'
      });
    }
  };

  const handleDeleteFulfillment = async (id: string) => {
    if (confirm("Bu fulfillment hizmetini silmek istediğinizden emin misiniz?")) {
      try {
        await deleteBillingItemMutation.mutateAsync(id);
        addNotification({
          type: 'info',
          title: 'Başarılı',
          message: 'Fulfillment hizmeti silindi'
        });
      } catch {
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Fulfillment hizmeti silinirken bir hata oluştu'
        });
      }
    }
  };

  const openEditModal = (item: { id: string; serviceId: string; quantity: number; unitPrice: number; description?: string; serviceDate: string }) => {
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
  if (isCustomer() && (order as any).customer?.id !== user?.id) {
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

  const items = (billingItems as any)?.data || [];
  const totalFulfillmentCost = items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Sipariş Detayı</h1>
              <p className="text-muted-foreground mobile-text">
                Sipariş #{(order as any).orderNumber || (order as any).id}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShipmentModalOpen(true)}
                variant="outline"
              >
                Gönderi Oluştur
              </Button>
              <Button
                onClick={() => window.history.back()}
                variant="outline"
              >
                Geri Dön
              </Button>
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
              <SectionShell
                title="Sipariş Bilgileri"
                description="Sipariş detayları ve durum bilgileri"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sipariş Numarası</p>
                    <p className="font-medium text-foreground">{(order as any).orderNumber || (order as any).id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Durum</p>
                    <p className="font-medium text-foreground">{(order as any).status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                    <p className="font-medium text-foreground">
                      {formatCurrency(Number((order as any)?.total ?? 0), currencyOptions)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Oluşturulma Tarihi</p>
                    <p className="font-medium text-foreground">
                      {new Date((order as any).createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              </SectionShell>

              {/* Customer Info */}
              {(order as any).customer && (
                <SectionShell
                  title="Müşteri Bilgileri"
                  description="Siparişi veren müşteri bilgileri"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Müşteri Adı</p>
                      <p className="font-medium text-foreground">{(order as any).customer.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">E-posta</p>
                      <p className="font-medium text-foreground">{(order as any).customer.email}</p>
                    </div>
                  </div>
                </SectionShell>
              )}

              {/* Order Items */}
              <SectionShell
                title="Sipariş Ürünleri"
                description="Siparişe dahil edilen ürünler ve miktarları"
              >
                <div className="space-y-4">
                  {(order as any).items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-accent rounded-lg">
                      <div>
                        <p className="font-medium text-foreground">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {item.product.sku} • Miktar: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {formatCurrency(item.price * item.quantity, currencyOptions)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.price, currencyOptions)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionShell>
            </div>
          )}

          {/* Fulfillment Tab */}
          {activeTab === 'fulfillment' && (
            <div className="space-y-6">
              <SectionShell
                title="Fulfillment Hizmetleri"
                description="Sipariş için kullanılan fulfillment hizmetleri"
                actions={
                  <Button
                    onClick={() => setShowAddFulfillment(true)}
                    variant="outline"
                  >
                    Hizmet Ekle
                  </Button>
                }
              >

              {/* Fulfillment Items */}
              {billingItemsLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item: any) => (
                    <div key={item.id} className="p-4 bg-muted/40 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-foreground">{item.service.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {item.service.unit} × {formatCurrency(item.unitPrice, currencyOptions)}
                          </p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatCurrency(item.totalPrice, currencyOptions)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.serviceDate).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          {!item.isBilled && (
                            <div className="flex gap-1">
                              <Button
                                onClick={() => openEditModal(item)}
                                variant="outline"
                                size="sm"
                              >
                                Düzenle
                              </Button>
                              <Button
                                onClick={() => handleDeleteFulfillment(item.id)}
                                variant="outline"
                                size="sm"
                              >
                                Sil
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs bg-accent text-foreground`}>
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
                <div className="p-4 bg-muted/40 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-foreground">Toplam Fulfillment Maliyeti:</span>
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(totalFulfillmentCost, currencyOptions)}
                    </span>
                  </div>
                </div>
              )}
              </SectionShell>
            </div>
          )}

          {/* Add Fulfillment Modal */}
          {showAddFulfillment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border max-w-md w-full mx-4 shadow-lg">
                <h3 className="text-lg font-semibold text-foreground mb-4">Fulfillment Hizmeti Ekle</h3>
                <FormLayout>
                  <form onSubmit={handleAddFulfillment} className="space-y-4">
                  <FormSelect
                    label="Hizmet *"
                    value={fulfillmentForm.serviceId}
                    onChange={(e) => {
                      const value = e.target.value;
                      const service = (services as any)?.find((s: any) => s.id === value);
                      setFulfillmentForm(prev => ({
                        ...prev,
                        serviceId: value,
                        unitPrice: service?.basePrice || 0,
                      }));
                    }}
                    required
                    placeholder="Hizmet Seçin"
                    options={(services as any)?.map((service: any) => ({
                      value: service.id,
                      label: `${service.name} - ${formatCurrency(service.basePrice, currencyOptions)}/${service.unit}`
                    })) || []}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label="Miktar *"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={fulfillmentForm.quantity}
                      onChange={(e) => setFulfillmentForm(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                    <FormField
                      label="Birim Fiyat (€)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={fulfillmentForm.unitPrice}
                      onChange={(e) => setFulfillmentForm(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                    />
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
                    <Button
                      type="button"
                      onClick={() => setShowAddFulfillment(false)}
                      variant="outline"
                    >
                      İptal
                    </Button>
                    <Button
                      type="submit"
                      disabled={createBillingItemMutation.isPending}
                      variant="outline"
                    >
                      {createBillingItemMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
                    </Button>
                  </div>
                </form>
                </FormLayout>
              </div>
            </div>
          )}

          {/* Edit Fulfillment Modal */}
          {editingItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border max-w-md w-full mx-4 shadow-lg">
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
                        Birim Fiyat (€)
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
                    <Button
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
                      variant="outline"
                    >
                      İptal
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateBillingItemMutation.isPending}
                      variant="outline"
                    >
                      {updateBillingItemMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
        {isShipmentModalOpen && (
          <CreateShipmentModal
            isOpen={isShipmentModalOpen}
            onClose={() => setShipmentModalOpen(false)}
            orderId={orderId}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
