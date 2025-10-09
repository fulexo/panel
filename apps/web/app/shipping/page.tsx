"use client";

import { useMemo, useState } from "react";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
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
import { formatCurrency } from "@/lib/formatters";
import { SectionShell } from "@/components/patterns/SectionShell";
import { StatusPill } from "@/components/patterns/StatusPill";
import { FormLayout } from "@/components/patterns/FormLayout";
import { FormField, FormSelect, FormTextarea, FormCheckbox } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ShippingPage() {
  const { isAdmin } = useRBAC();
  const { addNotification } = useApp();
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

  const currencyOptions = useMemo(
    () => ({
      locale: "tr-TR",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    []
  );

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
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Bölge oluşturulurken bir hata oluştu'
      });
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
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Bölge güncellenirken bir hata oluştu'
      });
    }
  };

  const handleDeleteZone = async (id: string) => {
    if (confirm('Bu bölgeyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteZoneMutation.mutateAsync(id);
      } catch (error) {
        console.error('Zone deletion error:', error);
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Bölge silinirken bir hata oluştu'
        });
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
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Fiyat oluşturulurken bir hata oluştu'
      });
    }
  };


  const handleDeletePrice = async (id: string) => {
    if (confirm('Bu fiyatı silmek istediğinizden emin misiniz?')) {
      try {
        await deletePriceMutation.mutateAsync(id);
      } catch (error) {
        console.error('Price deletion error:', error);
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Fiyat silinirken bir hata oluştu'
        });
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
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Müşteri fiyatı oluşturulurken bir hata oluştu'
      });
    }
  };


  const handleDeleteCustomerPrice = async (id: string) => {
    if (confirm('Bu müşteri fiyatını silmek istediğinizden emin misiniz?')) {
      try {
        await deleteCustomerPriceMutation.mutateAsync(id);
      } catch (error) {
        console.error('Customer price deletion error:', error);
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Müşteri fiyatı silinirken bir hata oluştu'
        });
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
            <Button
              onClick={() => setActiveTab('zones')}
              variant={activeTab === 'zones' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === 'zones'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Bölgeler
            </Button>
            <Button
              onClick={() => setActiveTab('prices')}
              variant={activeTab === 'prices' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === 'prices'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Fiyatlar
            </Button>
            <Button
              onClick={() => setActiveTab('customer-prices')}
              variant={activeTab === 'customer-prices' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === 'customer-prices'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Müşteri Özel Fiyatlar
            </Button>
          </div>

          {/* Zones Tab */}
          {activeTab === 'zones' && (
            <SectionShell
              title="Kargo Bölgeleri"
              description="Kargo bölgelerini yönetin ve düzenleyin"
              actions={
                <Button
                  onClick={() => setShowCreateZone(true)}
                  variant="default"
                >
                  Yeni Bölge
                </Button>
              }
            >
              {zonesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(zones as any)?.map((zone: any) => (
                    <div key={zone.id} className="p-4 bg-muted/40 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-foreground">{zone.name}</h3>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => {
                              setEditingZone(zone.id);
                              setZoneForm({
                                name: zone.name,
                                description: zone.description || '',
                                isActive: zone.isActive,
                              });
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Düzenle
                          </Button>
                          <Button
                            onClick={() => handleDeleteZone(zone.id)}
                            variant="destructive"
                            size="sm"
                          >
                            Sil
                          </Button>
                        </div>
                      </div>
                      {zone.description && (
                        <p className="text-sm text-muted-foreground mb-2">{zone.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <StatusPill
                          label={zone.isActive ? 'Aktif' : 'Pasif'}
                          tone={zone.isActive ? 'success' : 'destructive'}
                        />
                        <span className="text-sm text-muted-foreground">
                          {zone.prices?.length || 0} fiyat
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionShell>
          )}

          {/* Prices Tab */}
          {activeTab === 'prices' && (
            <SectionShell
              title="Kargo Fiyatları"
              description="Kargo fiyatlarını yönetin ve düzenleyin"
              actions={
                <Button
                  onClick={() => setShowCreatePrice(true)}
                  variant="default"
                >
                  Yeni Fiyat
                </Button>
              }
            >
              {/* Zone Filter */}
              <div className="flex gap-4 mb-6">
                <FormSelect
                  label="Bölge Filtresi"
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  options={[
                    { value: '', label: 'Tüm Bölgeler' },
                    ...(zones as any)?.map((zone: any) => ({
                      value: zone.id,
                      label: zone.name
                    })) || []
                  ]}
                />
              </div>

              {pricesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(prices as any)?.map((price: any) => (
                    <div key={price.id} className="p-4 bg-muted/40 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-foreground">{price.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {price.zone?.name} • {formatCurrency(price.basePrice, currencyOptions)}
                          </p>
                          {price.description && (
                            <p className="text-sm text-muted-foreground mt-1">{price.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleDeletePrice(price.id)}
                            variant="destructive"
                            size="sm"
                          >
                            Sil
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Öncelik: {price.priority}</span>
                        {price.freeShippingThreshold && (
                          <span>Ücretsiz: {formatCurrency(price.freeShippingThreshold, currencyOptions)}+</span>
                        )}
                        {price.estimatedDays && (
                          <span>Tahmini: {price.estimatedDays}</span>
                        )}
                        <StatusPill
                          label={price.isActive ? 'Aktif' : 'Pasif'}
                          tone={price.isActive ? 'success' : 'destructive'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionShell>
          )}

          {/* Customer Prices Tab */}
          {activeTab === 'customer-prices' && (
            <SectionShell
              title="Müşteri Özel Fiyatlar"
              description="Müşteri özel fiyatlarını yönetin ve düzenleyin"
              actions={
                <Button
                  onClick={() => setShowCreateCustomerPrice(true)}
                  variant="default"
                >
                  Yeni Müşteri Fiyatı
                </Button>
              }
            >
              {customerPricesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(customerPrices as any)?.map((customerPrice: any) => (
                    <div key={customerPrice.id} className="p-4 bg-muted/40 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-foreground">
                            {customerPrice.customer?.name || 'Tüm Müşteriler'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {customerPrice.zone?.name} • {customerPrice.price?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Temel Fiyat: {formatCurrency(customerPrice.price?.basePrice ?? 0, currencyOptions)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleDeleteCustomerPrice(customerPrice.id)}
                            variant="destructive"
                            size="sm"
                          >
                            Sil
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {customerPrice.adjustmentType === 'percentage' ? 'Yüzde' : 'Sabit'}: 
                          {customerPrice.adjustmentValue > 0 ? '+' : ''}{customerPrice.adjustmentValue}
                          {customerPrice.adjustmentType === 'percentage' ? '%' : '€'}
                        </span>
                        <StatusPill
                          label={customerPrice.isActive ? 'Aktif' : 'Pasif'}
                          tone={customerPrice.isActive ? 'success' : 'destructive'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionShell>
          )}

          {/* Create Zone Modal */}
          {showCreateZone && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border max-w-md w-full mx-4 shadow-lg">
                <FormLayout
                  title="Yeni Bölge"
                  description="Yeni kargo bölgesi oluşturun"
                >
                  <form onSubmit={handleCreateZone} className="space-y-4">
                    <FormField
                      label="Bölge Adı"
                      required
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <FormTextarea
                      label="Açıklama"
                      rows={3}
                      value={zoneForm.description}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <FormCheckbox
                      label="Aktif"
                      checked={zoneForm.isActive}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        onClick={() => setShowCreateZone(false)}
                        variant="outline"
                      >
                        İptal
                      </Button>
                      <Button
                        type="submit"
                        disabled={createZoneMutation.isPending}
                        variant="default"
                      >
                        {createZoneMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                      </Button>
                    </div>
                  </form>
                </FormLayout>
              </div>
            </div>
          )}

          {/* Edit Zone Modal */}
          {editingZone && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border max-w-md w-full mx-4 shadow-lg">
                <FormLayout
                  title="Bölge Düzenle"
                  description="Kargo bölgesini düzenleyin"
                >
                  <form onSubmit={handleUpdateZone} className="space-y-4">
                    <FormField
                      label="Bölge Adı"
                      required
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <FormTextarea
                      label="Açıklama"
                      rows={3}
                      value={zoneForm.description}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <FormCheckbox
                      label="Aktif"
                      checked={zoneForm.isActive}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        onClick={() => {
                          setEditingZone(null);
                          setZoneForm({ name: '', description: '', isActive: true });
                        }}
                        variant="outline"
                      >
                        İptal
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateZoneMutation.isPending}
                        variant="default"
                      >
                        {updateZoneMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
                      </Button>
                    </div>
                  </form>
                </FormLayout>
              </div>
            </div>
          )}

          {/* Create Price Modal */}
          {showCreatePrice && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border max-w-md w-full mx-4 shadow-lg">
                <FormLayout
                  title="Yeni Fiyat"
                  description="Yeni kargo fiyatı oluşturun"
                >
                  <form onSubmit={handleCreatePrice} className="space-y-4">
                    <FormSelect
                      label="Bölge"
                      required
                      value={priceForm.zoneId}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, zoneId: e.target.value }))}
                      options={[
                        { value: '', label: 'Bölge Seçin' },
                        ...(zones as any)?.map((zone: any) => ({
                          value: zone.id,
                          label: zone.name
                        })) || []
                      ]}
                    />
                    <FormField
                      label="Fiyat Adı"
                      required
                      value={priceForm.name}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <FormTextarea
                      label="Açıklama"
                      rows={3}
                      value={priceForm.description}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <FormField
                      label="Temel Fiyat (€)"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={priceForm.basePrice}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                    />
                    <FormField
                      label="Ücretsiz Kargo Eşiği (€)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceForm.freeShippingThreshold}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, freeShippingThreshold: parseFloat(e.target.value) || 0 }))}
                    />
                    <FormField
                      label="Tahmini Süre"
                      placeholder="1-2 gün"
                      value={priceForm.estimatedDays}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, estimatedDays: e.target.value }))}
                    />
                    <FormField
                      label="Öncelik"
                      type="number"
                      value={priceForm.priority}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                    />
                    <FormCheckbox
                      label="Aktif"
                      checked={priceForm.isActive}
                      onChange={(e) => setPriceForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        onClick={() => setShowCreatePrice(false)}
                        variant="outline"
                      >
                        İptal
                      </Button>
                      <Button
                        type="submit"
                        disabled={createPriceMutation.isPending}
                        variant="default"
                      >
                        {createPriceMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                      </Button>
                    </div>
                  </form>
                </FormLayout>
              </div>
            </div>
          )}

          {/* Create Customer Price Modal */}
          {showCreateCustomerPrice && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border max-w-md w-full mx-4 shadow-lg">
                <FormLayout
                  title="Yeni Müşteri Fiyatı"
                  description="Müşteri özel fiyatı oluşturun"
                >
                  <form onSubmit={handleCreateCustomerPrice} className="space-y-4">
                    <FormSelect
                      label="Bölge"
                      required
                      value={customerPriceForm.zoneId}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, zoneId: e.target.value }))}
                      options={[
                        { value: '', label: 'Bölge Seçin' },
                        ...(zones as any)?.map((zone: any) => ({
                          value: zone.id,
                          label: zone.name
                        })) || []
                      ]}
                    />
                    <FormSelect
                      label="Fiyat"
                      required
                      value={customerPriceForm.priceId}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, priceId: e.target.value }))}
                      options={[
                        { value: '', label: 'Fiyat Seçin' },
                        ...(prices as any)?.map((price: any) => ({
                          value: price.id,
                          label: `${price.name} - ${formatCurrency(price.basePrice, currencyOptions)}`
                        })) || []
                      ]}
                    />
                    <FormField
                      label="Müşteri (Boş bırakırsanız tüm müşteriler için geçerli olur)"
                      placeholder="Müşteri ID"
                      value={customerPriceForm.customerId}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, customerId: e.target.value }))}
                    />
                    <FormSelect
                      label="Ayarlama Türü"
                      required
                      value={customerPriceForm.adjustmentType}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, adjustmentType: e.target.value as 'percentage' | 'fixed' }))}
                      options={[
                        { value: 'percentage', label: 'Yüzde' },
                        { value: 'fixed', label: 'Sabit Miktar' }
                      ]}
                    />
                    <FormField
                      label="Ayarlama Değeri"
                      type="number"
                      step="0.01"
                      required
                      placeholder={customerPriceForm.adjustmentType === 'percentage' ? '10 (10% artırır)' : '5 (5€ artırır)'}
                      value={customerPriceForm.adjustmentValue}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, adjustmentValue: parseFloat(e.target.value) || 0 }))}
                    />
                    <FormCheckbox
                      label="Aktif"
                      checked={customerPriceForm.isActive}
                      onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        onClick={() => setShowCreateCustomerPrice(false)}
                        variant="outline"
                      >
                        İptal
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCustomerPriceMutation.isPending}
                        variant="default"
                      >
                        {createCustomerPriceMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                      </Button>
                    </div>
                  </form>
                </FormLayout>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
