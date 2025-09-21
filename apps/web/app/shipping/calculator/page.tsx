"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
import { useShippingOptions, useCalculateShipping } from "@/hooks/useShipping";

export default function ShippingCalculatorPage() {
  const { user } = useAuth();
  const { isCustomer } = useRBAC();
  const { addNotification } = useApp();
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [calculatedPrices, setCalculatedPrices] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const { data: shippingOptions, isLoading } = useShippingOptions(user?.id);
  const calculateShippingMutation = useCalculateShipping();

  const handleCalculate = async () => {
    if (!selectedZone || orderTotal <= 0) {
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Lütfen bölge seçin ve sipariş tutarını girin'
      });
      return;
    }

    setIsCalculating(true);
    try {
      const result = await calculateShippingMutation.mutateAsync({
        zoneId: selectedZone,
        ...(user?.id && { customerId: user.id }),
        orderTotal,
      });
      setCalculatedPrices(result);
    } catch (error) {
      console.error("Kargo hesaplama hatası:", error);
      addNotification({
        type: 'error',
        title: 'Hata',
        message: 'Kargo hesaplanırken bir hata oluştu'
      });
    } finally {
      setIsCalculating(false);
    }
  };

  if (!isCustomer()) {
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="mobile-heading text-foreground mb-6">Kargo Fiyatları Hesaplayıcısı</h1>

            {/* Calculator Form */}
            <div className="bg-card p-6 rounded-lg border border-border mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Kargo Hesapla</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Bölge Seçin *
                  </label>
                  <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="">Bölge Seçin</option>
                    {(shippingOptions as any)?.map((option: any) => (
                      <option key={option.zone.id} value={option.zone.id}>
                        {option.zone.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Sipariş Tutarı (₺) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={orderTotal}
                    onChange={(e) => setOrderTotal(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                onClick={handleCalculate}
                disabled={!selectedZone || orderTotal <= 0 || isCalculating}
                className="btn btn-primary"
              >
                {isCalculating ? "Hesaplanıyor..." : "Kargo Hesapla"}
              </button>
            </div>

            {/* Calculated Results */}
            {calculatedPrices && (
              <div className="bg-card p-6 rounded-lg border border-border mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">Kargo Seçenekleri</h2>
                <div className="space-y-4">
                  {(calculatedPrices as any)?.options?.map((option: any) => (
                    <div key={option.id} className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-foreground">{option.name}</h3>
                          {option.description && (
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-foreground">
                            {option.isFree ? "Ücretsiz" : `₺${option.finalPrice.toFixed(2)}`}
                          </div>
                          {option.estimatedDays && (
                            <div className="text-sm text-muted-foreground">
                              {option.estimatedDays}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {option.freeShippingThreshold && (
                        <div className="text-sm text-muted-foreground">
                          Ücretsiz kargo: ₺{option.freeShippingThreshold.toFixed(2)} ve üzeri
                        </div>
                      )}
                      
                      {option.basePrice !== option.finalPrice && !option.isFree && (
                        <div className="text-sm text-muted-foreground">
                          Temel fiyat: ₺{option.basePrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available Zones and Prices */}
            <div className="bg-card p-6 rounded-lg border border-border">
              <h2 className="text-xl font-semibold text-foreground mb-4">Mevcut Kargo Seçenekleri</h2>
              
              {(shippingOptions as any)?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Henüz kargo seçeneği bulunmuyor
                </p>
              ) : (
                <div className="space-y-6">
                  {(shippingOptions as any)?.map((option: any) => (
                    <div key={option.zone.id} className="border border-border rounded-lg p-4">
                      <h3 className="font-medium text-foreground mb-3">{option.zone.name}</h3>
                      {option.zone.description && (
                        <p className="text-sm text-muted-foreground mb-3">{option.zone.description}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(option as any).prices?.map((price: any) => (
                          <div key={price.id} className="bg-accent p-3 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-foreground">{price.name}</h4>
                              <span className="text-sm font-medium text-foreground">
                                ₺{price.basePrice.toFixed(2)}
                              </span>
                            </div>
                            
                            {price.description && (
                              <p className="text-sm text-muted-foreground mb-2">{price.description}</p>
                            )}
                            
                            <div className="space-y-1 text-sm text-muted-foreground">
                              {price.estimatedDays && (
                                <div>Tahmini süre: {price.estimatedDays}</div>
                              )}
                              {price.freeShippingThreshold && (
                                <div>Ücretsiz: ₺{price.freeShippingThreshold.toFixed(2)}+</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}