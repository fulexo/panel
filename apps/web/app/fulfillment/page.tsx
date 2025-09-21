"use client";

import { useState } from "react";
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

  const billingItemsData = billingItems?.data || [];
  const invoicesData = invoices?.data || [];

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
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="text-2xl font-bold text-foreground">{stats.totalItems}</div>
                <div className="text-sm text-muted-foreground">Toplam Hizmet</div>
              </div>
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="text-2xl font-bold text-yellow-600">{stats.unbilledItems}</div>
                <div className="text-sm text-muted-foreground">Faturalanmamış</div>
              </div>
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="text-2xl font-bold text-foreground">₺{stats.totalAmount.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Toplam Tutar</div>
              </div>
              <div className="bg-card p-4 rounded-lg border border-border">
                <div className="text-2xl font-bold text-yellow-600">₺{stats.unbilledAmount.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Faturalanmamış Tutar</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex space-x-1 bg-accent p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'services'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hizmetler
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'billing'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Faturalanmamış Hizmetler
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'invoices'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Aylık Faturalar
            </button>
          </div>

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">Fulfillment Hizmetleri</h2>
                <button
                  onClick={() => setShowCreateService(true)}
                  className="btn btn-primary"
                >
                  Yeni Hizmet
                </button>
              </div>

              {servicesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services?.map((service: any) => (
                    <div key={service.id} className="bg-card p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-foreground">{service.name}</h3>
                        <div className="flex gap-1">
                          {/* <button
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
                            className="btn btn-sm btn-outline"
                          >
                            Düzenle
                          </button> */}
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="btn btn-sm btn-danger"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          ₺{service.basePrice.toFixed(2)}/{service.unit}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          service.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {service.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">Faturalanmamış Hizmetler</h2>
                <button
                  onClick={() => setShowGenerateInvoice(true)}
                  className="btn btn-primary"
                >
                  Aylık Fatura Oluştur
                </button>
              </div>

              {billingLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {billingItemsData.map((item: any) => (
                    <div key={item.id} className="bg-card p-4 rounded-lg border border-border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-foreground">{item.service.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Sipariş: #{item.order.orderNumber} • {item.order.customer.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {item.service.unit} × ₺{item.unitPrice.toFixed(2)}
                          </p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">
                            ₺{item.totalPrice.toFixed(2)}
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
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-foreground">Aylık Faturalar</h2>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('tr-TR', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {invoicesLoading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoicesData.map((invoice: any) => (
                    <div key={invoice.id} className="bg-card p-6 rounded-lg border border-border">
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
                            ₺{invoice.totalAmount.toFixed(2)}
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
                              ₺{item.totalPrice.toFixed(2)}
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
            </div>
          )}

          {/* Create Service Modal */}
          {showCreateService && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Yeni Fulfillment Hizmeti</h3>
                <form onSubmit={handleCreateService} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Hizmet Adı *
                    </label>
                    <input
                      type="text"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Açıklama
                    </label>
                    <textarea
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Birim *
                      </label>
                      <select
                        value={serviceForm.unit}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, unit: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      >
                        <option value="adet">Adet</option>
                        <option value="kg">Kilogram</option>
                        <option value="m3">Metreküp</option>
                        <option value="saat">Saat</option>
                        <option value="paket">Paket</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Birim Fiyat (₺) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceForm.basePrice}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                        required
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={serviceForm.isActive}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                      Aktif
                    </label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateService(false)}
                      className="btn btn-outline"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={createServiceMutation.isPending}
                      className="btn btn-primary"
                    >
                      {createServiceMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Generate Invoice Modal */}
          {showGenerateInvoice && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card p-6 rounded-lg border border-border max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Aylık Fatura Oluştur</h3>
                <form onSubmit={handleGenerateInvoice} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Müşteri ID *
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.customerId}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, customerId: e.target.value }))}
                      required
                      placeholder="Müşteri ID girin"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Ay *
                      </label>
                      <select
                        value={invoiceForm.month}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                        required
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(0, i).toLocaleString('tr-TR', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Yıl *
                      </label>
                      <select
                        value={invoiceForm.year}
                        onChange={(e) => setInvoiceForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                        required
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - 2 + i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Vade Tarihi
                    </label>
                    <input
                      type="date"
                      value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Notlar
                    </label>
                    <textarea
                      value={invoiceForm.notes}
                      onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      placeholder="Fatura notları..."
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGenerateInvoice(false)}
                      className="btn btn-outline"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={generateInvoiceMutation.isPending}
                      className="btn btn-primary"
                    >
                      {generateInvoiceMutation.isPending ? 'Oluşturuluyor...' : 'Fatura Oluştur'}
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