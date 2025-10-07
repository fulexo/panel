"use client";

import { useMemo, useState } from "react";
// import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
import { 
  useFulfillmentServices,
  useFulfillmentBillingItems,
  useFulfillmentInvoices,
  useFulfillmentBillingStats,
  useCreateFulfillmentService,
  // useUpdateFulfillmentService,
  useDeleteFulfillmentService,
  useGenerateMonthlyInvoice,
  useUpdateFulfillmentInvoice
} from "@/hooks/useFulfillmentBilling";
import { formatCurrency } from "@/lib/formatters";
import { SectionShell } from "@/components/patterns/SectionShell";
import { StatusPill } from "@/components/patterns/StatusPill";
import { MetricCard } from "@/components/patterns/MetricCard";
import { FormLayout } from "@/components/patterns/FormLayout";
import { FormField } from "@/components/forms/FormField";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormTextarea } from "@/components/forms/FormTextarea";
import { FormCheckbox } from "@/components/forms/FormCheckbox";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function FulfillmentPage() {
  const { isAdmin } = useRBAC();
  const { addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'services' | 'billing' | 'invoices'>('services');
  const [showCreateService, setShowCreateService] = useState(false);
  const [showGenerateInvoice, setShowGenerateInvoice] = useState(false);
  // const [editingService, setEditingService] = useState<string | null>(null);
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
  // const updateServiceMutation = useUpdateFulfillmentService();
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
        type: 'warning',
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
        type: 'success',
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
          type: 'success',
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
        type: 'warning',
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
        type: 'success',
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
        type: 'success',
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
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Erişim Reddedildi</h1>
            <p className="text-muted-foreground">Bu sayfaya erişim yetkiniz yok.</p>
          </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="mobile-heading text-foreground">Fulfillment Faturalandırma</h1>
              <p className="text-muted-foreground mobile-text">
                Fulfillment hizmetlerini yönetin ve aylık faturalar oluşturun
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          {(stats as any) && (
            <SectionShell
              title="Fulfillment Overview"
              description="Fulfillment hizmetlerinin genel durumu ve faturalandırma özeti"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Toplam Hizmet"
                  value={(stats as any).totalItems}
                  tone="default"
                />
                <MetricCard
                  label="Faturalanmamış"
                  value={(stats as any).unbilledItems}
                  tone="warning"
                />
                <MetricCard
                  label="Toplam Tutar"
                  value={formatCurrency(Number((stats as any).totalAmount ?? 0), currencyOptions)}
                  tone="default"
                />
                <MetricCard
                  label="Faturalanmamış Tutar"
                  value={formatCurrency(Number((stats as any).unbilledAmount ?? 0), currencyOptions)}
                  tone="warning"
                />
              </div>
            </SectionShell>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 bg-accent p-1 rounded-lg">
            <Button
              onClick={() => setActiveTab('services')}
              variant={activeTab === 'services' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === 'services'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Hizmetler
            </Button>
            <Button
              onClick={() => setActiveTab('billing')}
              variant={activeTab === 'billing' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === 'billing'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Faturalanmamış Hizmetler
            </Button>
            <Button
              onClick={() => setActiveTab('invoices')}
              variant={activeTab === 'invoices' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                activeTab === 'invoices'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Aylık Faturalar
            </Button>
          </div>

          {/* Services Tab */}
          {activeTab === 'services' && (
            <SectionShell
              title="Fulfillment Hizmetleri"
              description="Fulfillment hizmetlerini yönetin ve yeni hizmetler ekleyin"
              actions={
                <Button
                  onClick={() => setShowCreateService(true)}
                  variant="default"
                >
                  Yeni Hizmet
                </Button>
              }
            >

              {servicesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(services as any)?.map((service: any) => (
                    <div key={service.id} className="p-4 bg-muted/40 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-foreground">{service.name}</h3>
                        <div className="flex gap-1">
                          {/* <Button
                            onClick={() => {
                              setEditingService(service.id);
                              setServiceForm({
                                name: service.name,
                                description: service.description || '',
                                unit: service.unit,
                                basePrice: service.basePrice,
                                isActive: service.isActive,
                              });
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Düzenle
                          </Button> */}
                          <Button
                            onClick={() => handleDeleteService(service.id)}
                            variant="destructive"
                            size="sm"
                          >
                            Sil
                          </Button>
                        </div>
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(service.basePrice, currencyOptions)}/{service.unit}
                        </span>
                        <StatusPill
                          label={service.isActive ? 'Aktif' : 'Pasif'}
                          tone={service.isActive ? 'success' : 'destructive'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionShell>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <SectionShell
              title="Faturalanmamış Hizmetler"
              description="Faturalanmamış hizmetleri görüntüleyin ve aylık fatura oluşturun"
              actions={
                <Button
                  onClick={() => setShowGenerateInvoice(true)}
                  variant="default"
                >
                  Aylık Fatura Oluştur
                </Button>
              }
            >

              {billingLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(billingItemsData as any)?.map((item: any) => (
                    <div key={item.id} className="p-4 bg-muted/40 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
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
                    </div>
                  ))}

                  {billingItemsData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Faturalanmamış hizmet bulunmuyor
                    </div>
                  )}
                </div>
              )}
            </SectionShell>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <SectionShell
              title="Aylık Faturalar"
              description="Aylık faturaları görüntüleyin ve yönetin"
              actions={
                <div className="flex gap-2">
                  <FormSelect
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    options={Array.from({ length: 12 }, (_, i) => ({
                      value: i + 1,
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
                        value: year,
                        label: year.toString()
                      };
                    })}
                    className="min-w-[100px]"
                  />
                </div>
              }
            >

              {invoicesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(invoicesData as any)?.map((invoice: any) => (
                    <div key={invoice.id} className="p-6 bg-muted/40 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-4">
                        <div>
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
                        <div className="text-right">
                          <p className="text-2xl font-bold text-foreground">
                            {formatCurrency(invoice.totalAmount, currencyOptions)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <select
                              value={invoice.status}
                              onChange={(e) => handleUpdateInvoiceStatus(invoice.id, e.target.value)}
                              className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                            >
                              <option value="draft">Taslak</option>
                              <option value="sent">Gönderildi</option>
                              <option value="paid">Ödendi</option>
                              <option value="overdue">Gecikmiş</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground">Fatura Detayları:</h4>
                        {invoice.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between items-center p-2 bg-accent rounded">
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

                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>Vade Tarihi: {new Date(invoice.dueDate).toLocaleDateString('tr-TR')}</span>
                          <span>Oluşturulma: {new Date(invoice.createdAt).toLocaleDateString('tr-TR')}</span>
                        </div>
                        {invoice.notes && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            <strong>Notlar:</strong> {invoice.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {invoicesData.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Bu ay için fatura bulunmuyor
                    </div>
                  )}
                </div>
              )}
            </SectionShell>
          )}

          {/* Create Service Modal */}
          {showCreateService && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border max-w-md w-full mx-4 shadow-lg">
                <FormLayout
                  title="Yeni Fulfillment Hizmeti"
                  description="Fulfillment hizmeti oluşturun"
                >
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

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        onClick={() => setShowCreateService(false)}
                        variant="outline"
                      >
                        İptal
                      </Button>
                      <Button
                        type="submit"
                        disabled={createServiceMutation.isPending}
                        variant="default"
                      >
                        {createServiceMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                      </Button>
                    </div>
                  </form>
                </FormLayout>
              </div>
            </div>
          )}

          {/* Generate Invoice Modal */}
          {showGenerateInvoice && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-background p-6 rounded-lg border border-border max-w-md w-full mx-4 shadow-lg">
                <FormLayout
                  title="Aylık Fatura Oluştur"
                  description="Aylık fatura oluşturun"
                >
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
                          value: i + 1,
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
                            value: year,
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

                    <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => setShowGenerateInvoice(false)}
                      variant="outline"
                    >
                      İptal
                    </Button>
                    <Button
                      type="submit"
                      disabled={generateInvoiceMutation.isPending}
                      variant="default"
                    >
                      {generateInvoiceMutation.isPending ? 'Oluşturuluyor...' : 'Fatura Oluştur'}
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
