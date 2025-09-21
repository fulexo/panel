"use client";

import { useState } from "react";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { 
  useShippingZones, 
  useShippingPrices, 
  useCustomerShippingPrices,
  useCreateShippingZone,
  useUpdateShippingZone,
  useDeleteShippingZone,
  useCreateShippingPrice,
  useDeleteShippingPrice,
  useCreateCustomerShippingPrice,
  useDeleteCustomerShippingPrice
} from "@/hooks/useShipping";

export default function ShippingPage() {
  const { isAdmin } = useRBAC();
  const [activeTab, setActiveTab] = useState<'zones' | 'prices' | 'customer-prices'>('zones');
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [showCreateZone, setShowCreateZone] = useState(false);
  const [showCreatePrice, setShowCreatePrice] = useState(false);
  const [showCreateCustomerPrice, setShowCreateCustomerPrice] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);

  // Form states
  const [zoneForm, setZoneForm] = useState({ name: '', description: '', isActive: true });
  const [priceForm, setPriceForm] = useState({ 
    zoneId: '', 
    name: '', 
    description: '', 
    basePrice: 0, 
    freeShippingThreshold: 0, 
    estimatedDays: '', 
    priority: 0, 
    isActive: true 
  });
  const [customerPriceForm, setCustomerPriceForm] = useState({ 
    zoneId: '', 
    priceId: '', 
    customerId: '', 
    adjustmentType: 'percentage' as 'percentage' | 'fixed', 
    adjustmentValue: 0, 
    isActive: true 
  });

  const { data: zones, isLoading: zonesLoading } = useShippingZones(true);
  const { data: prices, isLoading: pricesLoading } = useShippingPrices(selectedZone);
  const { data: customerPrices, isLoading: customerPricesLoading } = useCustomerShippingPrices();

  const createZoneMutation = useCreateShippingZone();
  const updateZoneMutation = useUpdateShippingZone();
  const deleteZoneMutation = useDeleteShippingZone();
  const createPriceMutation = useCreateShippingPrice();
  const deletePriceMutation = useDeleteShippingPrice();
  const createCustomerPriceMutation = useCreateCustomerShippingPrice();
  const deleteCustomerPriceMutation = useDeleteCustomerShippingPrice();

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

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createZoneMutation.mutateAsync(zoneForm);
      setZoneForm({ name: '', description: '', isActive: true });
      setShowCreateZone(false);
    } catch (error) {
      console.error('Zone creation error:', error);
      alert('Bölge oluşturulurken bir hata oluştu');
    }
  };

  const handleUpdateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;
    
    try {
      await updateZoneMutation.mutateAsync({ id: editingZone, data: zoneForm });
      setEditingZone(null);
      setZoneForm({ name: '', description: '', isActive: true });
    } catch (error) {
      console.error('Zone update error:', error);
      alert('Bölge güncellenirken bir hata oluştu');
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (confirm('Bu bölgeyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteZoneMutation.mutateAsync(id);
      } catch (error) {
        console.error('Zone deletion error:', error);
        alert('Bölge silinirken bir hata oluştu');
      }
    }
  };

  const handleCreatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPriceMutation.mutateAsync(priceForm);
      setPriceForm({ 
        zoneId: '', 
        name: '', 
        description: '', 
        basePrice: 0, 
        freeShippingThreshold: 0, 
        estimatedDays: '', 
        priority: 0, 
        isActive: true 
      });
      setShowCreatePrice(false);
    } catch (error) {
      console.error('Price creation error:', error);
      alert('Fiyat oluşturulurken bir hata oluştu');
    }
  };


  const handleDeletePrice = async (id: string) => {
    if (confirm('Bu fiyatı silmek istediğinizden emin misiniz?')) {
      try {
        await deletePriceMutation.mutateAsync(id);
      } catch (error) {
        console.error('Price deletion error:', error);
        alert('Fiyat silinirken bir hata oluştu');
      }
    }
  };

  const handleCreateCustomerPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCustomerPriceMutation.mutateAsync(customerPriceForm);
      setCustomerPriceForm({ 
        zoneId: '', 
        priceId: '', 
        customerId: '', 
        adjustmentType: 'percentage', 
        adjustmentValue: 0, 
        isActive: true 
      });
      setShowCreateCustomerPrice(false);
    } catch (error) {
      console.error('Customer price creation error:', error);
      alert('Müşteri fiyatı oluşturulurken bir hata oluştu');
    }
  };


  const handleDeleteCustomerPrice = async (id: string) => {
    if (confirm('Bu müşteri fiyatını silmek istediğinizden emin misiniz?')) {
      try {
        await deleteCustomerPriceMutation.mutateAsync(id);
      } catch (error) {
        console.error('Customer price deletion error:', error);
        alert('Müşteri fiyatı silinirken bir hata oluştu');
      }
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Kargo Fiyatları Yönetimi</h1>
              <p className="text-muted-foreground mobile-text">
                Kargo bölgeleri, fiyatları ve müşteri özel fiyatlarını yönetin
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-accent p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('zones')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'zones'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Bölgeler
            </button>
            <button
              onClick={() => setActiveTab('prices')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'prices'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Fiyatlar
            </button>
            <button
              onClick={() => setActiveTab('customer-prices')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'customer-prices'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Müşteri Özel Fiyatlar
            </button>
          </div>

          {/* Zones Tab */}
          {activeTab === 'zones' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">Kargo Bölgeleri</h2>
                <button
                  onClick={() => setShowCreateZone(true)}
                  className="btn btn-primary"
                >
                  Yeni Bölge
                </button>
              </div>

              {zonesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {zones?.map((zone: any) => (
                    <div key={zone.id} className="bg-card p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-foreground">{zone.name}</h3>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingZone(zone.id);
                              setZoneForm({
                                name: zone.name,
                                description: zone.description || '',
                                isActive: zone.isActive,
                              });
                            }}
                            className="btn btn-sm btn-outline"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteZone(zone.id)}
                            className="btn btn-sm btn-danger"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                      {zone.description && (
                        <p className="text-sm text-muted-foreground mb-2">{zone.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          zone.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {zone.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {zone.prices?.length || 0} fiyat
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prices Tab */}
          {activeTab === 'prices' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">Kargo Fiyatları</h2>
                <button
                  onClick={() => setShowCreatePrice(true)}
                  className="btn btn-primary"
                >
                  Yeni Fiyat
                </button>
              </div>

              {/* Zone Filter */}
              <div className="flex gap-4">
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  <option value="">Tüm Bölgeler</option>
                  {zones?.map((zone: any) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>

              {pricesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prices?.map((price: any) => (
                    <div key={price.id} className="bg-card p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-foreground">{price.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {price.zone?.name} • ₺{price.basePrice.toFixed(2)}
                          </p>
                          {price.description && (
                            <p className="text-sm text-muted-foreground mt-1">{price.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDeletePrice(price.id)}
                            className="btn btn-sm btn-danger"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Öncelik: {price.priority}</span>
                        {price.freeShippingThreshold && (
                          <span>Ücretsiz: ₺{price.freeShippingThreshold.toFixed(2)}+</span>
                        )}
                        {price.estimatedDays && (
                          <span>Tahmini: {price.estimatedDays}</span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          price.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {price.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Customer Prices Tab */}
          {activeTab === 'customer-prices' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">Müşteri Özel Fiyatlar</h2>
                <button
                  onClick={() => setShowCreateCustomerPrice(true)}
                  className="btn btn-primary"
                >
                  Yeni Müşteri Fiyatı
                </button>
              </div>

              {customerPricesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customerPrices?.map((customerPrice: any) => (
                    <div key={customerPrice.id} className="bg-card p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-foreground">
                            {customerPrice.customer?.name || 'Tüm Müşteriler'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {customerPrice.zone?.name} • {customerPrice.price?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Temel Fiyat: ₺{customerPrice.price?.basePrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDeleteCustomerPrice(customerPrice.id)}
                            className="btn btn-sm btn-danger"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {customerPrice.adjustmentType === 'percentage' ? 'Yüzde' : 'Sabit'}: 
                          {customerPrice.adjustmentValue > 0 ? '+' : ''}{customerPrice.adjustmentValue}
                          {customerPrice.adjustmentType === 'percentage' ? '%' : '₺'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          customerPrice.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {customerPrice.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Zone Modal */}
          {showCreateZone && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Yeni Bölge</h3>
                <form onSubmit={handleCreateZone} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Bölge Adı *
                    </label>
                    <input
                      type="text"
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={zoneForm.description}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={zoneForm.isActive}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                      Aktif
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateZone(false)}
                      className="btn btn-outline"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={createZoneMutation.isPending}
                      className="btn btn-primary"
                    >
                      {createZoneMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Zone Modal */}
          {editingZone && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Bölge Düzenle</h3>
                <form onSubmit={handleUpdateZone} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Bölge Adı *
                    </label>
                    <input
                      type="text"
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={zoneForm.description}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActiveEdit"
                      checked={zoneForm.isActive}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="isActiveEdit" className="text-sm font-medium text-foreground">
                      Aktif
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingZone(null);
                        setZoneForm({ name: '', description: '', isActive: true });
                      }}
                      className="btn btn-outline"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={updateZoneMutation.isPending}
                      className="btn btn-primary"
                    >
                      {updateZoneMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Create Price Modal */}
          {showCreatePrice && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Yeni Fiyat</h3>
                <form onSubmit={handleCreatePrice} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Bölge *
                    </label>
                    <select
                      value={priceForm.zoneId}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, zoneId: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">Bölge Seçin</option>
                      {zones?.map((zone: any) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fiyat Adı *
                    </label>
                    <input
                      type="text"
                      value={priceForm.name}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={priceForm.description}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Temel Fiyat (₺) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceForm.basePrice}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ücretsiz Kargo Eşiği (₺)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceForm.freeShippingThreshold}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, freeShippingThreshold: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Tahmini Süre
                    </label>
                    <input
                      type="text"
                      value={priceForm.estimatedDays}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, estimatedDays: e.target.value }))}
                      placeholder="1-2 gün"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Öncelik
                    </label>
                    <input
                      type="number"
                      value={priceForm.priority}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActivePrice"
                      checked={priceForm.isActive}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="isActivePrice" className="text-sm font-medium text-foreground">
                      Aktif
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreatePrice(false)}
                      className="btn btn-outline"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={createPriceMutation.isPending}
                      className="btn btn-primary"
                    >
                      {createPriceMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Create Customer Price Modal */}
          {showCreateCustomerPrice && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Yeni Müşteri Fiyatı</h3>
                <form onSubmit={handleCreateCustomerPrice} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Bölge *
                    </label>
                    <select
                      value={customerPriceForm.zoneId}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, zoneId: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">Bölge Seçin</option>
                      {zones?.map((zone: any) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Fiyat *
                    </label>
                    <select
                      value={customerPriceForm.priceId}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, priceId: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">Fiyat Seçin</option>
                      {prices?.map((price: any) => (
                        <option key={price.id} value={price.id}>
                          {price.name} - ₺{price.basePrice.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Müşteri (Boş bırakırsanız tüm müşteriler için geçerli olur)
                    </label>
                    <input
                      type="text"
                      value={customerPriceForm.customerId}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, customerId: e.target.value }))}
                      placeholder="Müşteri ID"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ayarlama Türü *
                    </label>
                    <select
                      value={customerPriceForm.adjustmentType}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, adjustmentType: e.target.value as 'percentage' | 'fixed' }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="percentage">Yüzde</option>
                      <option value="fixed">Sabit Miktar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ayarlama Değeri *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={customerPriceForm.adjustmentValue}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, adjustmentValue: parseFloat(e.target.value) || 0 }))}
                      required
                      placeholder={customerPriceForm.adjustmentType === 'percentage' ? '10 (10% artırır)' : '5 (5₺ artırır)'}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActiveCustomerPrice"
                      checked={customerPriceForm.isActive}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="isActiveCustomerPrice" className="text-sm font-medium text-foreground">
                      Aktif
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateCustomerPrice(false)}
                      className="btn btn-outline"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={createCustomerPriceMutation.isPending}
                      className="btn btn-primary"
                    >
                      {createCustomerPriceMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
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