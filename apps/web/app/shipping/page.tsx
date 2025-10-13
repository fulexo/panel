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
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormField } from "@/components/forms/FormField";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormTextarea } from "@/components/forms/FormTextarea";
import { FormCheckbox } from "@/components/forms/FormCheckbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Truck,
  Plus,
  Trash2,
  Edit,
  MapPin,
  Euro,
  Users,
  X,
} from "lucide-react";

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
          <EmptyState
            icon={X}
            title="Erişim Reddedildi"
            description="Bu sayfaya erişim yetkiniz yok."
          />
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
          {/* Header */}
          <PageHeader
            title="Kargo Fiyatları Yönetimi"
            description="Kargo bölgeleri, fiyatları ve müşteri özel fiyatlarını yönetin"
            icon={Truck}
            actions={
              <div className="flex gap-2">
                <Dialog open={showCreateZone} onOpenChange={setShowCreateZone}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Yeni Bölge</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Yeni Bölge</DialogTitle>
                      <DialogDescription>Yeni kargo bölgesi oluşturun</DialogDescription>
                    </DialogHeader>
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
                      <DialogFooter>
                        <Button
                          type="button"
                          onClick={() => setShowCreateZone(false)}
                          variant="secondary"
                        >
                          İptal
                        </Button>
                        <Button
                          type="submit"
                          disabled={createZoneMutation.isPending}
                        >
                          {createZoneMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            }
          />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'zones' | 'prices' | 'customer-prices')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="zones" className="text-xs sm:text-sm">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Bölgeler</span>
              </TabsTrigger>
              <TabsTrigger value="prices" className="text-xs sm:text-sm">
                <Euro className="h-4 w-4 mr-1" />
                <span>Fiyatlar</span>
              </TabsTrigger>
              <TabsTrigger value="customer-prices" className="text-xs sm:text-sm">
                <Users className="h-4 w-4 mr-1" />
                <span>Müşteri Özel</span>
              </TabsTrigger>
            </TabsList>

            {/* Zones Tab */}
            <TabsContent value="zones" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Kargo Bölgeleri</CardTitle>
                  <CardDescription>Kargo bölgelerini yönetin ve düzenleyin</CardDescription>
                </CardHeader>
                <CardContent>
                  {zonesLoading ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="spinner" />
                      <span className="text-base font-medium">Yükleniyor...</span>
                    </div>
                  ) : (zones as any)?.length === 0 ? (
                    <EmptyState
                      icon={MapPin}
                      title="Kargo bölgesi bulunmuyor"
                      description="İlk kargo bölgenizi oluşturun"
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(zones as any)?.map((zone: any) => (
                        <Card key={zone.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
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
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteZone(zone.id)}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {zone.description && (
                              <p className="text-sm text-muted-foreground mb-3">{zone.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">
                                {zone.isActive ? 'Aktif' : 'Pasif'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {zone.prices?.length || 0} fiyat
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Prices Tab */}
            <TabsContent value="prices" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">Kargo Fiyatları</CardTitle>
                      <CardDescription>Kargo fiyatlarını yönetin ve düzenleyin</CardDescription>
                    </div>
                    <Dialog open={showCreatePrice} onOpenChange={setShowCreatePrice}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          <span>Yeni Fiyat</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Yeni Fiyat</DialogTitle>
                          <DialogDescription>Yeni kargo fiyatı oluşturun</DialogDescription>
                        </DialogHeader>
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
                          <div className="grid grid-cols-2 gap-4">
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
                              label="Ücretsiz Eşik (€)"
                              type="number"
                              step="0.01"
                              min="0"
                              value={priceForm.freeShippingThreshold}
                              onChange={(e) => setPriceForm(prev => ({ ...prev, freeShippingThreshold: parseFloat(e.target.value) || 0 }))}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
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
                          </div>
                          <FormCheckbox
                            label="Aktif"
                            checked={priceForm.isActive}
                            onChange={(e) => setPriceForm(prev => ({ ...prev, isActive: e.target.checked }))}
                          />
                          <DialogFooter>
                            <Button
                              type="button"
                              onClick={() => setShowCreatePrice(false)}
                              variant="secondary"
                            >
                              İptal
                            </Button>
                            <Button
                              type="submit"
                              disabled={createPriceMutation.isPending}
                            >
                              {createPriceMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Zone Filter */}
                  <div className="flex gap-4">
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
                      className="min-w-[200px]"
                    />
                  </div>

                  {pricesLoading ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="spinner" />
                      <span className="text-base font-medium">Yükleniyor...</span>
                    </div>
                  ) : (prices as any)?.length === 0 ? (
                    <EmptyState
                      icon={Euro}
                      title="Kargo fiyatı bulunmuyor"
                      description="İlk kargo fiyatınızı oluşturun"
                    />
                  ) : (
                    <div className="space-y-4">
                      {(prices as any)?.map((price: any) => (
                        <Card key={price.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-foreground">{price.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {price.zone?.name} • {formatCurrency(price.basePrice, currencyOptions)}
                                </p>
                                {price.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{price.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>Öncelik: {price.priority}</span>
                                    {price.freeShippingThreshold && (
                                      <span>Ücretsiz: {formatCurrency(price.freeShippingThreshold, currencyOptions)}+</span>
                                    )}
                                    {price.estimatedDays && (
                                      <span>Tahmini: {price.estimatedDays}</span>
                                    )}
                                  </div>
                                  <Badge variant="outline" className="mt-2">
                                    {price.isActive ? 'Aktif' : 'Pasif'}
                                  </Badge>
                                </div>
                                <Button
                                  onClick={() => handleDeletePrice(price.id)}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customer Prices Tab */}
            <TabsContent value="customer-prices" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">Müşteri Özel Fiyatlar</CardTitle>
                      <CardDescription>Müşteri özel fiyatlarını yönetin ve düzenleyin</CardDescription>
                    </div>
                    <Dialog open={showCreateCustomerPrice} onOpenChange={setShowCreateCustomerPrice}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          <span>Yeni Müşteri Fiyatı</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Yeni Müşteri Fiyatı</DialogTitle>
                          <DialogDescription>Müşteri özel fiyatı oluşturun</DialogDescription>
                        </DialogHeader>
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
                          <div className="grid grid-cols-2 gap-4">
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
                          </div>
                          <FormCheckbox
                            label="Aktif"
                            checked={customerPriceForm.isActive}
                            onChange={(e) => setCustomerPriceForm(prev => ({ ...prev, isActive: e.target.checked }))}
                          />
                          <DialogFooter>
                            <Button
                              type="button"
                              onClick={() => setShowCreateCustomerPrice(false)}
                              variant="secondary"
                            >
                              İptal
                            </Button>
                            <Button
                              type="submit"
                              disabled={createCustomerPriceMutation.isPending}
                            >
                              {createCustomerPriceMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {customerPricesLoading ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="spinner" />
                      <span className="text-base font-medium">Yükleniyor...</span>
                    </div>
                  ) : (customerPrices as any)?.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="Müşteri özel fiyatı bulunmuyor"
                      description="İlk müşteri özel fiyatınızı oluşturun"
                    />
                  ) : (
                    <div className="space-y-4">
                      {(customerPrices as any)?.map((customerPrice: any) => (
                        <Card key={customerPrice.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex-1">
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
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-sm text-muted-foreground">
                                    <span>
                                      {customerPrice.adjustmentType === 'percentage' ? 'Yüzde' : 'Sabit'}: 
                                      {customerPrice.adjustmentValue > 0 ? '+' : ''}{customerPrice.adjustmentValue}
                                      {customerPrice.adjustmentType === 'percentage' ? '%' : '€'}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="mt-2">
                                    {customerPrice.isActive ? 'Aktif' : 'Pasif'}
                                  </Badge>
                                </div>
                                <Button
                                  onClick={() => handleDeleteCustomerPrice(customerPrice.id)}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Edit Zone Modal */}
          {editingZone && (
            <Dialog open={!!editingZone} onOpenChange={() => setEditingZone(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Bölge Düzenle</DialogTitle>
                  <DialogDescription>Kargo bölgesini düzenleyin</DialogDescription>
                </DialogHeader>
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
                  <DialogFooter>
                    <Button
                      type="button"
                      onClick={() => {
                        setEditingZone(null);
                        setZoneForm({ name: '', description: '', isActive: true });
                      }}
                      variant="secondary"
                    >
                      İptal
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateZoneMutation.isPending}
                    >
                      {updateZoneMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}