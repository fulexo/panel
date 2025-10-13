"use client";

import { useMemo, useState } from "react";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
import { 
  useFulfillmentServices,
  useFulfillmentBillingItems,
  useFulfillmentInvoices,
  useFulfillmentBillingStats,
  useCreateFulfillmentService,
  useDeleteFulfillmentService,
  useGenerateMonthlyInvoice,
  useUpdateFulfillmentInvoice
} from "@/hooks/useFulfillmentBilling";
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
  Package,
  Plus,
  Trash2,
  Calendar,
  FileText,
  Settings,
  X,
} from "lucide-react";

export default function FulfillmentPage() {
  const { isAdmin } = useRBAC();
  const { addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'services' | 'billing' | 'invoices'>('services');
  const [showCreateService, setShowCreateService] = useState(false);
  const [showGenerateInvoice, setShowGenerateInvoice] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Form states
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    unit: 'adet',
    basePrice: 0,
    isActive: true,
  });
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: '',
    month: selectedMonth,
    year: selectedYear,
    notes: '',
    dueDate: '',
  });

  const { data: services, isLoading: servicesLoading } = useFulfillmentServices(true);
  const { data: billingItems, isLoading: billingLoading } = useFulfillmentBillingItems({
    isBilled: false,
    page: 1,
    limit: 100,
  });
  const { data: invoices, isLoading: invoicesLoading } = useFulfillmentInvoices({
    month: selectedMonth,
    year: selectedYear,
  });
  const { data: stats } = useFulfillmentBillingStats();

  const createServiceMutation = useCreateFulfillmentService();
  const deleteServiceMutation = useDeleteFulfillmentService();
  const generateInvoiceMutation = useGenerateMonthlyInvoice();
  const updateInvoiceMutation = useUpdateFulfillmentInvoice();

  const currencyOptions = useMemo(
    () => ({
      locale: "tr-TR",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    []
  );

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serviceForm.name || !serviceForm.unit || serviceForm.basePrice <= 0) {
      addNotification({
        type: 'info',
        title: 'Eksik Bilgi',
        message: 'Lütfen gerekli alanları doldurun'
      });
      return;
    }

    try {
      await createServiceMutation.mutateAsync(serviceForm);
      setServiceForm({
        name: '',
        description: '',
        unit: 'adet',
        basePrice: 0,
        isActive: true,
      });
      setShowCreateService(false);
      addNotification({
        type: 'info',
        title: 'Başarılı',
        message: 'Fulfillment hizmeti oluşturuldu'
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Hizmet oluşturulurken bir hata oluştu'
      });
    }
  };

  const handleDeleteService = async (id: string) => {
    if (confirm("Bu hizmeti silmek istediğinizden emin misiniz?")) {
      try {
        await deleteServiceMutation.mutateAsync(id);
        addNotification({
          type: 'info',
          title: 'Başarılı',
          message: 'Hizmet silindi'
        });
      } catch {
        addNotification({
          type: 'error',
          title: 'Hata',
          message: 'Hizmet silinirken bir hata oluştu'
        });
      }
    }
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoiceForm.customerId) {
      addNotification({
        type: 'info',
        title: 'Eksik Bilgi',
        message: 'Lütfen müşteri seçin'
      });
      return;
    }

    try {
      await generateInvoiceMutation.mutateAsync({
        customerId: invoiceForm.customerId,
        month: invoiceForm.month,
        year: invoiceForm.year,
        ...(invoiceForm.notes && { notes: invoiceForm.notes }),
        ...(invoiceForm.dueDate && { dueDate: invoiceForm.dueDate }),
      });
      setInvoiceForm({
        customerId: '',
        month: selectedMonth,
        year: selectedYear,
        notes: '',
        dueDate: '',
      });
      setShowGenerateInvoice(false);
      addNotification({
        type: 'info',
        title: 'Başarılı',
        message: 'Aylık fatura oluşturuldu'
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Fatura oluşturulurken bir hata oluştu'
      });
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, status: string) => {
    try {
      await updateInvoiceMutation.mutateAsync({
        id: invoiceId,
        data: { status: status as "draft" | "sent" | "paid" | "overdue" },
      });
      addNotification({
        type: 'info',
        title: 'Başarılı',
        message: 'Fatura durumu güncellendi'
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Fatura güncellenirken bir hata oluştu'
      });
    }
  };

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

  const billingItemsData = (billingItems as any)?.data || [];
  const invoicesData = (invoices as any)?.data || [];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          {/* Header */}
          <PageHeader
            title="Fulfillment Faturalandırma"
            description="Fulfillment hizmetlerini yönetin ve aylık faturalar oluşturun"
            icon={Package}
            actions={
              <div className="flex gap-2">
                <Dialog open={showCreateService} onOpenChange={setShowCreateService}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Yeni Hizmet</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Yeni Fulfillment Hizmeti</DialogTitle>
                      <DialogDescription>Fulfillment hizmeti oluşturun</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateService} className="space-y-4">
                      <FormField
                        label="Hizmet Adı"
                        required
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                      <FormTextarea
                        label="Açıklama"
                        rows={3}
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormSelect
                          label="Birim"
                          required
                          value={serviceForm.unit}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, unit: e.target.value }))}
                          options={[
                            { value: 'adet', label: 'Adet' },
                            { value: 'kg', label: 'Kilogram' },
                            { value: 'm3', label: 'Metreküp' },
                            { value: 'saat', label: 'Saat' },
                            { value: 'paket', label: 'Paket' },
                          ]}
                        />
                        <FormField
                          label="Birim Fiyat (€)"
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={serviceForm.basePrice}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <FormCheckbox
                        label="Aktif"
                        checked={serviceForm.isActive}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      />
                      <DialogFooter>
                        <Button
                          type="button"
                          onClick={() => setShowCreateService(false)}
                          variant="secondary"
                        >
                          İptal
                        </Button>
                        <Button
                          type="submit"
                          disabled={createServiceMutation.isPending}
                        >
                          {createServiceMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            }
          />

          {/* Stats Cards */}
          {(stats as any) && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{(stats as any).totalItems}</div>
                  <div className="text-sm text-muted-foreground">Toplam Hizmet</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{(stats as any).unbilledItems}</div>
                  <div className="text-sm text-muted-foreground">Faturalanmamış</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(Number((stats as any).totalAmount ?? 0), currencyOptions)}
                  </div>
                  <div className="text-sm text-muted-foreground">Toplam Tutar</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {formatCurrency(Number((stats as any).unbilledAmount ?? 0), currencyOptions)}
                  </div>
                  <div className="text-sm text-muted-foreground">Faturalanmamış Tutar</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'services' | 'billing' | 'invoices')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="services" className="text-xs sm:text-sm">
                <Settings className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Hizmetler</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="text-xs sm:text-sm">
                <FileText className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Faturalanmamış</span>
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs sm:text-sm">
                <Calendar className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Faturalar</span>
              </TabsTrigger>
            </TabsList>

            {/* Services Tab */}
            <TabsContent value="services" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fulfillment Hizmetleri</CardTitle>
                  <CardDescription>Fulfillment hizmetlerini yönetin ve yeni hizmetler ekleyin</CardDescription>
                </CardHeader>
                <CardContent>
                  {servicesLoading ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="spinner" />
                      <span className="text-base font-medium">Yükleniyor...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(services as any)?.map((service: any) => (
                        <Card key={service.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-medium text-foreground">{service.name}</h3>
                              <Button
                                onClick={() => handleDeleteService(service.id)}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">
                                {formatCurrency(service.basePrice, currencyOptions)}/{service.unit}
                              </span>
                              <Badge variant="outline">
                                {service.isActive ? 'Aktif' : 'Pasif'}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">Faturalanmamış Hizmetler</CardTitle>
                      <CardDescription>Faturalanmamış hizmetleri görüntüleyin ve aylık fatura oluşturun</CardDescription>
                    </div>
                    <Dialog open={showGenerateInvoice} onOpenChange={setShowGenerateInvoice}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline">Aylık Fatura Oluştur</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Aylık Fatura Oluştur</DialogTitle>
                          <DialogDescription>Aylık fatura oluşturun</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleGenerateInvoice} className="space-y-4">
                          <FormField
                            label="Müşteri ID"
                            required
                            value={invoiceForm.customerId}
                            onChange={(e) => setInvoiceForm(prev => ({ ...prev, customerId: e.target.value }))}
                            placeholder="Müşteri ID girin"
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormSelect
                              label="Ay"
                              required
                              value={invoiceForm.month}
                              onChange={(e) => setInvoiceForm(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                              options={Array.from({ length: 12 }, (_, i) => ({
                                value: (i + 1).toString(),
                                label: new Date(0, i).toLocaleString('tr-TR', { month: 'long' })
                              }))}
                            />
                            <FormSelect
                              label="Yıl"
                              required
                              value={invoiceForm.year}
                              onChange={(e) => setInvoiceForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                              options={Array.from({ length: 5 }, (_, i) => {
                                const year = new Date().getFullYear() - 2 + i;
                                return {
                                  value: year.toString(),
                                  label: year.toString()
                                };
                              })}
                            />
                          </div>
                          <FormField
                            label="Vade Tarihi"
                            type="date"
                            value={invoiceForm.dueDate}
                            onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          />
                          <FormTextarea
                            label="Notlar"
                            rows={3}
                            value={invoiceForm.notes}
                            onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Fatura notları..."
                          />
                          <DialogFooter>
                            <Button
                              type="button"
                              onClick={() => setShowGenerateInvoice(false)}
                              variant="secondary"
                            >
                              İptal
                            </Button>
                            <Button
                              type="submit"
                              disabled={generateInvoiceMutation.isPending}
                            >
                              {generateInvoiceMutation.isPending ? 'Oluşturuluyor...' : 'Fatura Oluştur'}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {billingLoading ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="spinner" />
                      <span className="text-base font-medium">Yükleniyor...</span>
                    </div>
                  ) : billingItemsData.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="Faturalanmamış hizmet bulunmuyor"
                      description="Tüm hizmetler faturalandırılmış"
                    />
                  ) : (
                    <div className="space-y-4">
                      {billingItemsData.map((item: any) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex-1">
                                <h3 className="font-medium text-foreground">{item.service.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Sipariş: #{item.order.orderNumber} • {item.order.customer.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {item.quantity} {item.service.unit} × {formatCurrency(item.unitPrice, currencyOptions)}
                                </p>
                                {item.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-foreground">
                                  {formatCurrency(item.totalPrice, currencyOptions)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(item.serviceDate).toLocaleDateString('tr-TR')}
                                </p>
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

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">Aylık Faturalar</CardTitle>
                      <CardDescription>Aylık faturaları görüntüleyin ve yönetin</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <FormSelect
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        options={Array.from({ length: 12 }, (_, i) => ({
                          value: (i + 1).toString(),
                          label: new Date(0, i).toLocaleString('tr-TR', { month: 'long' })
                        }))}
                        className="min-w-[120px]"
                      />
                      <FormSelect
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        options={Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - 2 + i;
                          return {
                            value: year.toString(),
                            label: year.toString()
                          };
                        })}
                        className="min-w-[100px]"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {invoicesLoading ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="spinner" />
                      <span className="text-base font-medium">Yükleniyor...</span>
                    </div>
                  ) : invoicesData.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="Bu ay için fatura bulunmuyor"
                      description="Seçilen ay için henüz fatura oluşturulmamış"
                    />
                  ) : (
                    <div className="space-y-4">
                      {invoicesData.map((invoice: any) => (
                        <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-foreground">
                                  Fatura #{invoice.invoiceNumber}
                                </h3>
                                <p className="text-muted-foreground">
                                  {invoice.customer.name} ({invoice.customer.email})
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(0, invoice.month - 1).toLocaleString('tr-TR', { month: 'long' })} {invoice.year}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 lg:items-end">
                                <p className="text-2xl font-bold text-foreground">
                                  {formatCurrency(invoice.totalAmount, currencyOptions)}
                                </p>
                                <FormSelect
                                  value={invoice.status}
                                  onChange={(e) => handleUpdateInvoiceStatus(invoice.id, e.target.value)}
                                  options={[
                                    { value: "draft", label: "Taslak" },
                                    { value: "sent", label: "Gönderildi" },
                                    { value: "paid", label: "Ödendi" },
                                    { value: "overdue", label: "Gecikmiş" },
                                  ]}
                                  className="min-w-[120px]"
                                />
                              </div>
                            </div>

                            <div className="mt-4 space-y-2">
                              <h4 className="font-medium text-foreground">Fatura Detayları:</h4>
                              <div className="space-y-2">
                                {invoice.items.map((item: any) => (
                                  <div key={item.id} className="flex justify-between items-center p-3 bg-accent/10 rounded border border-border">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{item.service.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Sipariş: #{item.order.orderNumber} • {item.quantity} {item.service.unit}
                                      </p>
                                    </div>
                                    <p className="text-sm font-medium text-foreground">
                                      {formatCurrency(item.totalPrice, currencyOptions)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-border">
                              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center text-sm text-muted-foreground">
                                <span>Vade Tarihi: {new Date(invoice.dueDate).toLocaleDateString('tr-TR')}</span>
                                <span>Oluşturulma: {new Date(invoice.createdAt).toLocaleDateString('tr-TR')}</span>
                              </div>
                              {invoice.notes && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  <strong>Notlar:</strong> {invoice.notes}
                                </p>
                              )}
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
        </main>
      </div>
    </ProtectedRoute>
  );
}