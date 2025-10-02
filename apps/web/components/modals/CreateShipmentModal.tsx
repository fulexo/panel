"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { X, Package, Truck, CheckCircle2, FileText } from "lucide-react";

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

interface ParcelFormState {
  weight: string;
  length: string;
  width: string;
  height: string;
}

const initialParcelState: ParcelFormState = {
  weight: "",
  length: "",
  width: "",
  height: "",
};

export function CreateShipmentModal({ isOpen, onClose, orderId }: CreateShipmentModalProps) {
  const [step, setStep] = useState(1);
  const [parcel, setParcel] = useState<ParcelFormState>(initialParcelState);
  const [rates, setRates] = useState<any[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [shipmentResult, setShipmentResult] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setParcel(initialParcelState);
      setRates([]);
      setSelectedRateId(null);
      setShipmentResult(null);
      setError(null);
      setRatesLoading(false);
      setCreateLoading(false);
    }
  }, [isOpen]);

  const parcelPayload = useMemo(
    () => ({
      weight: {
        value: Number(parcel.weight) || 0,
        unit: "KG",
      },
      dimensions: {
        length: Number(parcel.length) || 0,
        width: Number(parcel.width) || 0,
        height: Number(parcel.height) || 0,
        unit: "CM",
      },
    }),
    [parcel]
  );

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (!ratesLoading && !createLoading) {
      onClose();
    }
  };

  const validateParcel = () => {
    if (!parcel.weight) {
      setError("Lütfen paket ağırlığını girin.");
      return false;
    }
    if (Number(parcel.weight) <= 0) {
      setError("Ağırlık sıfırdan büyük olmalıdır.");
      return false;
    }
    if (!parcel.length || !parcel.width || !parcel.height) {
      setError("Lütfen paket boyutlarını girin.");
      return false;
    }
    if ([parcel.length, parcel.width, parcel.height].some((value) => Number(value) <= 0)) {
      setError("Boyutlar sıfırdan büyük olmalıdır.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleParcelSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (validateParcel()) {
      setStep(2);
    }
  };

  const handleFetchRates = async () => {
    if (!validateParcel()) return;

    try {
      setRatesLoading(true);
      setError(null);
      const response = await apiClient.getShipmentRates(orderId, {
        parcels: [parcelPayload],
      });
      const ratesResponse = (response as any)?.rates || [];
      setRates(ratesResponse);
      if (ratesResponse.length === 0) {
        setError("Uygun bir kargo fiyatı bulunamadı. Lütfen bilgileri kontrol edin.");
      }
      setStep(ratesResponse.length > 0 ? 3 : 2);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kargo ücretleri alınamadı.";
      setError(message);
    } finally {
      setRatesLoading(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedRateId) {
      setError("Lütfen bir kargo ücreti seçin.");
      return;
    }

    const selectedRate = rates.find((rate) => rate.id === selectedRateId);
    if (!selectedRate) {
      setError("Seçilen kargo ücreti bulunamadı.");
      return;
    }

    try {
      setCreateLoading(true);
      setError(null);
      const response = await apiClient.createShipment(orderId, {
        parcels: [parcelPayload],
        service: selectedRate.service || "standard",
        selected_rate_id: selectedRate.id,
        rates,
      });
      setShipmentResult(response);
      setStep(4);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kargo etiketi oluşturulamadı.";
      setError(message);
    } finally {
      setCreateLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleParcelSubmit} className="space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Package className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Paket Bilgileri</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Lütfen gönderilecek paketin ağırlık ve boyut bilgilerini girin.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Ağırlık (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0"
                  step="0.1"
                  value={parcel.weight}
                  onChange={(event) => setParcel((prev) => ({ ...prev, weight: event.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="length">Uzunluk (cm)</Label>
                <Input
                  id="length"
                  type="number"
                  min="0"
                  step="0.1"
                  value={parcel.length}
                  onChange={(event) => setParcel((prev) => ({ ...prev, length: event.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="width">Genişlik (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  min="0"
                  step="0.1"
                  value={parcel.width}
                  onChange={(event) => setParcel((prev) => ({ ...prev, width: event.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="height">Yükseklik (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  min="0"
                  step="0.1"
                  value={parcel.height}
                  onChange={(event) => setParcel((prev) => ({ ...prev, height: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                İptal
              </Button>
              <Button type="submit">Devam Et</Button>
            </div>
          </form>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Truck className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Kargo Ücretlerini Al</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Paket bilgilerinize göre kargo ücretlerini almak için aşağıdaki butona tıklayın.
            </p>
            <div className="p-4 border rounded-lg bg-muted/40 text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Ağırlık:</strong> {parcel.weight} kg
              </p>
              <p>
                <strong>Boyutlar:</strong> {parcel.length} × {parcel.width} × {parcel.height} cm
              </p>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Geri Dön
              </Button>
              <Button onClick={handleFetchRates} disabled={ratesLoading}>
                {ratesLoading ? "Ücretler Alınıyor..." : "Ücretleri Getir"}
              </Button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Truck className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Kargo Ücretini Seçin</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Aşağıdaki seçeneklerden birini seçerek gönderinizi oluşturun.
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {rates.map((rate) => (
                <button
                  key={rate.id}
                  type="button"
                  onClick={() => {
                    setSelectedRateId(rate.id);
                    setError(null);
                  }}
                  className={`w-full text-left p-4 border rounded-lg transition-colors ${
                    selectedRateId === rate.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {rate.carrier_name || rate.carrier || "Taşıyıcı"}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">{rate.service || "standart"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">
                        {rate.total_charge
                          ? `${rate.total_charge} ${rate.currency || "TRY"}`
                          : "Fiyat Bilinmiyor"}
                      </p>
                      {rate.estimated_delivery && (
                        <p className="text-xs text-muted-foreground">
                          Teslimat: {rate.estimated_delivery}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {rates.length === 0 && (
              <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground">
                Gösterilecek kargo ücreti bulunamadı. Lütfen paket bilgilerini kontrol edin.
              </div>
            )}
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Geri Dön
              </Button>
              <Button onClick={handleCreateShipment} disabled={createLoading || !selectedRateId}>
                {createLoading ? "Gönderi Oluşturuluyor..." : "Gönderi Oluştur"}
              </Button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-3 text-green-600">
              <CheckCircle2 className="w-12 h-12" />
              <h2 className="text-xl font-semibold text-foreground">Gönderi Başarıyla Oluşturuldu</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Etiketi indirerek paketinizi hazırlayabilir ve kargo sürecini takip edebilirsiniz.
            </p>
            {shipmentResult?.labelUrl && (
              <div className="p-4 border rounded-lg bg-muted/40 text-left">
                <p className="font-medium text-foreground mb-2">Etiket ve Takip Bilgileri</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <strong>Taşıyıcı:</strong> {shipmentResult.carrier}
                  </p>
                  <p>
                    <strong>Takip Numarası:</strong> {shipmentResult.trackingNo}
                  </p>
                  {shipmentResult.trackingUrl && (
                    <p>
                      <strong>Takip:</strong>{" "}
                      <a
                        href={shipmentResult.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Takip Bağlantısı
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              {shipmentResult?.labelUrl && (
                <Button asChild variant="outline">
                  <a
                    href={shipmentResult.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Etiketi Aç
                  </a>
                </Button>
              )}
              <Button onClick={handleClose}>Kapat</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-background w-full max-w-2xl rounded-xl shadow-2xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h1 className="text-lg font-semibold text-foreground">Gönderi Oluştur</h1>
          <Button variant="ghost" size="icon" onClick={handleClose} disabled={ratesLoading || createLoading}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`flex items-center gap-2 ${step === stepNumber ? "text-primary" : "text-muted-foreground"}`}
              >
                <span
                  className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs ${
                    step === stepNumber ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  {stepNumber}
                </span>
                <span className="hidden sm:inline">
                  {stepNumber === 1 && "Paket"}
                  {stepNumber === 2 && "Ücret"}
                  {stepNumber === 3 && "Seçim"}
                  {stepNumber === 4 && "Etiket"}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg">
              {error}
            </div>
          )}

          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}
