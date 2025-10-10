"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useApp } from "@/contexts/AppContext";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useCreateCustomerOrder } from "@/hooks/useOrders";
import {
  useShippingOptions,
  useCalculateShipping,
  type ShippingOption,
  type CalculateShippingResponse,
} from "@/hooks/useShipping";
import { SectionShell } from "@/components/patterns/SectionShell";
import { FormLayout } from "@/components/patterns/FormLayout";
import { FormField as TextField } from "@/components/forms/FormField";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormTextarea } from "@/components/forms/FormTextarea";
import { FormCheckbox } from "@/components/forms/FormCheckbox";
import { ImagePlaceholder } from "@/components/patterns/ImagePlaceholder";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { Truck, Info, ShoppingCart } from "lucide-react";

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    images: string[];
    stockQuantity: number | null;
  };
}

interface Address {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

const defaultAddress: Address = {
  firstName: "",
  lastName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Turkey",
  phone: "",
};

export default function CreateOrderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addNotification } = useApp();

  const [storeId, setStoreId] = useState<string>("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shippingAddress, setShippingAddress] = useState<Address>({ ...defaultAddress });
  const [billingAddress, setBillingAddress] = useState<Address>({ ...defaultAddress });
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedShippingZone, setSelectedShippingZone] = useState("");
  const [selectedShippingOption, setSelectedShippingOption] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [calculatedShipping, setCalculatedShipping] = useState<CalculateShippingResponse | null>(
    null
  );

  const currencyOptions = useMemo(
    () => ({
      locale: "tr-TR",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    []
  );

  useEffect(() => {
    if (user?.stores?.[0]?.id) {
      setStoreId(user.stores[0].id);
    }
  }, [user]);

  const { data: cartData, isLoading: cartLoading } = useCart(storeId) as {
    data: { cart?: { items?: CartItem[] } } | undefined;
    isLoading: boolean;
    error: unknown;
  };

  const { isLoading: productsLoading } = useProducts({
    storeId,
    limit: 100,
  });

  const createOrderMutation = useCreateCustomerOrder();
  const {
    data: shippingOptionsData,
    isLoading: shippingLoading,
  } = useShippingOptions(user?.id) as {
    data: ShippingOption[] | undefined;
    isLoading: boolean;
    error: unknown;
  };
  const calculateShippingMutation = useCalculateShipping();

  useEffect(() => {
    setCartItems(cartData?.cart?.items ?? []);
  }, [cartData]);

  const cartSubtotal = useMemo(
    () =>
      cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0),
    [cartItems]
  );

  const orderTotal = useMemo(() => cartSubtotal + shippingCost, [cartSubtotal, shippingCost]);

  const shippingZoneOptions = useMemo(
    () =>
      (shippingOptionsData ?? []).map((option) => ({
        value: option.zone.id,
        label: option.zone.name,
      })),
    [shippingOptionsData]
  );

  const clearError = (key: string) => {
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAddressChange = (
    key: keyof Address,
    value: string,
    addressType: "shipping" | "billing" = "shipping"
  ) => {
    const errorKey = `${addressType}.${key}`;
    clearError(errorKey);

    if (addressType === "shipping") {
      setShippingAddress((prev) => ({ ...prev, [key]: value }));
      if (useSameAddress) {
        setBillingAddress((prev) => ({ ...prev, [key]: value }));
      }
    } else {
      setBillingAddress((prev) => ({ ...prev, [key]: value }));
    }
  };

  const resetShippingSelection = () => {
    setCalculatedShipping(null);
    setSelectedShippingOption("");
    setShippingCost(0);
  };

  const applyShippingResponse = (shippingResponse: CalculateShippingResponse) => {
    setCalculatedShipping(shippingResponse);

    if (shippingResponse.options.length === 1) {
      const singleOption = shippingResponse.options[0];
      if (singleOption) {
        setSelectedShippingOption(singleOption.id);
        setShippingCost(singleOption.finalPrice);
        clearError("shippingOption");
      }
    } else {
      setSelectedShippingOption("");
      setShippingCost(0);
    }
  };

  useEffect(() => {
    if (!selectedShippingZone || cartItems.length === 0) {
      resetShippingSelection();
      return;
    }

    let cancelled = false;

    const computeShipping = async () => {
      try {
        const result = await calculateShippingMutation.mutateAsync({
          zoneId: selectedShippingZone,
          ...(user?.id ? { customerId: user.id } : {}),
          orderTotal: cartSubtotal,
        });

        if (cancelled) return;

        applyShippingResponse(result as CalculateShippingResponse);
      } catch (error) {
        if (!cancelled) {
          logger.error("Failed to calculate shipping", error);
          addNotification({
            type: "error",
            title: "Kargo hesaplanamadı",
            message: "Lütfen daha sonra tekrar deneyin veya farklı bir kargo bölgesi seçin.",
          });
        }
      }
    };

    void computeShipping();

    return () => {
      cancelled = true;
    };
  }, [
    selectedShippingZone,
    cartItems,
    cartSubtotal,
    calculateShippingMutation,
    user?.id,
    addNotification,
  ]);

  useEffect(() => {
    if (cartItems.length === 0) {
      resetShippingSelection();
    }
  }, [cartItems]);

  const handleShippingOptionSelect = (optionId: string) => {
    if (!calculatedShipping) return;
    const option = calculatedShipping.options.find((opt) => opt.id === optionId);
    setSelectedShippingOption(optionId);
    clearError("shippingOption");
    setShippingCost(option?.finalPrice ?? 0);
  };

  const handleManualRecalculate = async () => {
    if (!selectedShippingZone || cartItems.length === 0) {
      return;
    }

    resetShippingSelection();

    try {
      const result = await calculateShippingMutation.mutateAsync({
        zoneId: selectedShippingZone,
        ...(user?.id ? { customerId: user.id } : {}),
        orderTotal: cartSubtotal,
      });

      applyShippingResponse(result as CalculateShippingResponse);
    } catch (error) {
      logger.error("Failed to recalculate shipping", error);
      addNotification({
        type: "error",
        title: "Kargo hesaplanamadı",
        message: "Kargo hesaplaması sırasında bir hata oluştu. Lütfen tekrar deneyin.",
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (cartItems.length === 0) {
      errors['cart'] = "Sepetiniz boş. Sipariş oluşturmak için ürün ekleyin.";
    }

    if (!customerName.trim()) {
      errors['customerName'] = "Müşteri adı gereklidir.";
    }

    if (!customerEmail.trim()) {
      errors['customerEmail'] = "Müşteri e-postası gereklidir.";
    }

    const requiredShippingFields: Array<keyof Address> = [
      "firstName",
      "lastName",
      "addressLine1",
      "city",
      "state",
      "postalCode",
      "country",
    ];

    requiredShippingFields.forEach((field) => {
      if (!shippingAddress[field]?.toString().trim()) {
        errors[`shipping.${field}`] = "Zorunlu alan";
      }
    });

    if (!useSameAddress) {
      requiredShippingFields.forEach((field) => {
        if (!billingAddress[field]?.toString().trim()) {
          errors[`billing.${field}`] = "Zorunlu alan";
        }
      });
    }

    if (!selectedShippingZone) {
      errors['shippingZone'] = "Kargo bölgesi seçin.";
    }

    if ((calculatedShipping?.options?.length ?? 0) > 0 && !selectedShippingOption) {
      errors['shippingOption'] = "Bir kargo seçeneği seçin.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      addNotification({
        type: "error",
        title: "Eksik bilgiler var",
        message: "Lütfen formdaki zorunlu alanları doldurun.",
      });
      return;
    }

    if (!storeId) {
      addNotification({
        type: "error",
        title: "Mağaza bulunamadı",
        message: "Sipariş oluşturmak için bağlı olduğunuz mağaza bilgisi gereklidir.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createOrderMutation.mutateAsync({
        storeId,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        })),
        customerEmail,
        customerPhone,
        customerName,
        shippingAddress,
        billingAddress: useSameAddress ? shippingAddress : billingAddress,
        notes,
        shippingZoneId: selectedShippingZone,
        shippingOptionId: selectedShippingOption || undefined,
        shippingCost,
      });

      addNotification({
        type: "info",
        title: "Sipariş oluşturuldu",
        message: "Siparişiniz başarıyla oluşturuldu ve onay bekliyor.",
      });

      router.push("/orders");
    } catch (error) {
      logger.error("Failed to create order", error);
      addNotification({
        type: "error",
        title: "Sipariş oluşturulamadı",
        message: "Sipariş oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartLoading || productsLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="spinner" aria-hidden />
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
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-5xl flex-col gap-6">
            <div className="space-y-2">
              <h1 className="mobile-heading text-foreground flex items-center gap-3">
                <ShoppingCart className="h-7 w-7 text-foreground" aria-hidden />
                Yeni Sipariş
              </h1>
              <p className="text-sm text-muted-foreground">
                Sipariş detaylarını, kargo seçeneklerini ve müşteri bilgilerini eksiksiz doldurun.
              </p>
            </div>

            {formErrors['cart'] && (
              <div className="rounded-lg border border-border bg-accent/10 p-4 text-sm text-foreground">
                {formErrors['cart']}
              </div>
            )}

            <SectionShell
              title="Sepet Özeti"
              description="Siparişe dahil edilecek ürünler ve miktarlar"
            >
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
                  <Info className="h-5 w-5" aria-hidden />
                  Sepetinizde ürün bulunmuyor. Sipariş oluşturmak için ürün ekleyin.
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-lg border border-border/70 bg-accent/10 p-4 transition hover:bg-accent/20 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="h-16 w-16 overflow-hidden rounded-md border border-border bg-muted">
                          {item.product.images?.[0] ? (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImagePlaceholder className="h-full w-full" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-medium text-foreground">{item.product.name}</h3>
                          <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                          <p className="text-sm text-muted-foreground">
                            Adet: <span className="font-semibold text-foreground">{item.quantity}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">
                          {formatCurrency(item.product.price, currencyOptions)} × {item.quantity}
                        </div>
                        <div className="text-base font-semibold text-foreground">
                          {formatCurrency(item.product.price * item.quantity, currencyOptions)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="space-y-2 rounded-lg border border-border px-4 py-3 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ara toplam</span>
                      <span className="font-medium text-foreground">{formatCurrency(cartSubtotal, currencyOptions)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Kargo</span>
                      <span className="font-medium text-foreground">{formatCurrency(shippingCost, currencyOptions)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border/60 pt-2 text-base font-semibold text-foreground">
                      <span>Genel toplam</span>
                      <span>{formatCurrency(orderTotal, currencyOptions)}</span>
                    </div>
                  </div>
                </div>
              )}
            </SectionShell>

            <SectionShell
              title="Müşteri Bilgileri"
              description="İletişim bilgileri ve sipariş sahibi detayı"
            >
              <FormLayout>
                <FormLayout.Section columns={2}>
                  <TextField
                    label="Ad Soyad"
                    placeholder="Müşteri adını girin"
                    value={customerName}
                    onChange={(event) => {
                      clearError("customerName");
                      setCustomerName(event.target.value);
                    }}
                    required
                    error={formErrors['customerName'] || ''}
                  />
                  <TextField
                    label="E-posta"
                    type="email"
                    placeholder="ornek@firma.com"
                    value={customerEmail}
                    onChange={(event) => {
                      clearError("customerEmail");
                      setCustomerEmail(event.target.value);
                    }}
                    required
                    error={formErrors['customerEmail'] || ''}
                  />
                  <TextField
                    label="Telefon"
                    type="tel"
                    placeholder="05xx xxx xx xx"
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                  />
                </FormLayout.Section>
              </FormLayout>
            </SectionShell>

            <SectionShell
              title="Teslimat Adresi"
              description="Kargo gönderimi için kullanılacak adres"
            >
              <FormLayout>
                <FormLayout.Section columns={2}>
                  <TextField
                    label="Ad"
                    placeholder="Ad"
                    value={shippingAddress.firstName}
                    onChange={(event) => handleAddressChange("firstName", event.target.value, "shipping")}
                    required
                    error={formErrors["shipping.firstName"] || ''}
                  />
                  <TextField
                    label="Soyad"
                    placeholder="Soyad"
                    value={shippingAddress.lastName}
                    onChange={(event) => handleAddressChange("lastName", event.target.value, "shipping")}
                    required
                    error={formErrors["shipping.lastName"] || ''}
                  />
                  <TextField
                    label="Adres Satırı 1"
                    placeholder="Mahalle, cadde, numara"
                    value={shippingAddress.addressLine1}
                    onChange={(event) => handleAddressChange("addressLine1", event.target.value, "shipping")}
                    required
                    error={formErrors["shipping.addressLine1"] || ''}
                    className="md:col-span-2"
                  />
                  <TextField
                    label="Adres Satırı 2"
                    placeholder="Daire, apartman, ekstra bilgi"
                    value={shippingAddress.addressLine2}
                    onChange={(event) => handleAddressChange("addressLine2", event.target.value, "shipping")}
                    className="md:col-span-2"
                  />
                  <TextField
                    label="Şehir"
                    value={shippingAddress.city}
                    onChange={(event) => handleAddressChange("city", event.target.value, "shipping")}
                    required
                    error={formErrors["shipping.city"] || ''}
                  />
                  <TextField
                    label="İlçe"
                    value={shippingAddress.state}
                    onChange={(event) => handleAddressChange("state", event.target.value, "shipping")}
                    required
                    error={formErrors["shipping.state"] || ''}
                  />
                  <TextField
                    label="Posta Kodu"
                    value={shippingAddress.postalCode}
                    onChange={(event) => handleAddressChange("postalCode", event.target.value, "shipping")}
                    required
                    error={formErrors["shipping.postalCode"] || ''}
                  />
                  <TextField
                    label="Ülke"
                    value={shippingAddress.country}
                    onChange={(event) => handleAddressChange("country", event.target.value, "shipping")}
                    required
                    error={formErrors["shipping.country"] || ''}
                  />
                  <TextField
                    label="Telefon"
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(event) => handleAddressChange("phone", event.target.value, "shipping")}
                  />
                </FormLayout.Section>

                <FormCheckbox
                  label="Fatura adresi teslimat adresi ile aynı"
                  checked={useSameAddress}
                  onChange={(event) => {
                    setUseSameAddress(event.target.checked);
                    clearError("billing.firstName");
                    clearError("billing.lastName");
                  }}
                />
              </FormLayout>
            </SectionShell>

            {!useSameAddress && (
              <SectionShell
                title="Fatura Adresi"
                description="Fatura gönderimi için kullanılacak adres"
              >
                <FormLayout>
                  <FormLayout.Section columns={2}>
                    <TextField
                      label="Ad"
                      value={billingAddress.firstName}
                      onChange={(event) => handleAddressChange("firstName", event.target.value, "billing")}
                      required
                      error={formErrors["billing.firstName"] || ''}
                    />
                    <TextField
                      label="Soyad"
                      value={billingAddress.lastName}
                      onChange={(event) => handleAddressChange("lastName", event.target.value, "billing")}
                      required
                      error={formErrors["billing.lastName"] || ''}
                    />
                    <TextField
                      label="Adres Satırı 1"
                      value={billingAddress.addressLine1}
                      onChange={(event) => handleAddressChange("addressLine1", event.target.value, "billing")}
                      required
                      error={formErrors["billing.addressLine1"] || ''}
                      className="md:col-span-2"
                    />
                    <TextField
                      label="Adres Satırı 2"
                      value={billingAddress.addressLine2}
                      onChange={(event) => handleAddressChange("addressLine2", event.target.value, "billing")}
                      className="md:col-span-2"
                    />
                    <TextField
                      label="Şehir"
                      value={billingAddress.city}
                      onChange={(event) => handleAddressChange("city", event.target.value, "billing")}
                      required
                      error={formErrors["billing.city"] || ''}
                    />
                    <TextField
                      label="İlçe"
                      value={billingAddress.state}
                      onChange={(event) => handleAddressChange("state", event.target.value, "billing")}
                      required
                      error={formErrors["billing.state"] || ''}
                    />
                    <TextField
                      label="Posta Kodu"
                      value={billingAddress.postalCode}
                      onChange={(event) => handleAddressChange("postalCode", event.target.value, "billing")}
                      required
                      error={formErrors["billing.postalCode"] || ''}
                    />
                    <TextField
                      label="Ülke"
                      value={billingAddress.country}
                      onChange={(event) => handleAddressChange("country", event.target.value, "billing")}
                      required
                      error={formErrors["billing.country"] || ''}
                    />
                    <TextField
                      label="Telefon"
                      type="tel"
                      value={billingAddress.phone}
                      onChange={(event) => handleAddressChange("phone", event.target.value, "billing")}
                    />
                  </FormLayout.Section>
                </FormLayout>
              </SectionShell>
            )}

            <SectionShell
              title="Kargo Seçenekleri"
              description="Sipariş için kargo bölgesi ve hizmetini seçin"
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleManualRecalculate}
                  disabled={!selectedShippingZone || calculateShippingMutation.isPending}
                >
                  <Truck className="h-4 w-4" aria-hidden />
                  Yeniden Hesapla
                </Button>
              }
            >
              <FormLayout>
                <FormLayout.Section>
                  <FormSelect
                    label="Kargo Bölgesi"
                    placeholder={shippingLoading ? "Bölgeler yükleniyor..." : "Bölge seçin"}
                    value={selectedShippingZone}
                    onChange={(event) => {
                      setSelectedShippingZone(event.target.value);
                      resetShippingSelection();
                      clearError("shippingZone");
                    }}
                    options={shippingZoneOptions}
                    disabled={shippingLoading || shippingZoneOptions.length === 0}
                    required
                    error={formErrors['shippingZone'] || ''}
                  />
                </FormLayout.Section>
              </FormLayout>

              {calculateShippingMutation.isPending && (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4 animate-pulse" aria-hidden />
                  Kargo seçenekleri hesaplanıyor...
                </div>
              )}

              {calculatedShipping && calculatedShipping.options.length === 0 && (
                <div className="rounded-md border border-border bg-accent/10 px-4 py-3 text-sm text-foreground">
                  Seçtiğiniz bölge için aktif kargo seçeneği bulunamadı.
                </div>
              )}

              {calculatedShipping && calculatedShipping.options.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Bölgeye uygun kargo seçeneklerinden birini seçin.
                  </p>
                  <div className="space-y-2">
                    {calculatedShipping.options.map((option) => (
                      <label
                        key={option.id}
                        className={cn(
                          "flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition",
                          selectedShippingOption === option.id
                            ? "border-border bg-accent/10"
                            : "border-border/70 hover:border-border hover:bg-accent/10"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shipping-option"
                              value={option.id}
                              checked={selectedShippingOption === option.id}
                              onChange={(event) => handleShippingOptionSelect(event.target.value)}
                              className="h-4 w-4 accent-foreground"
                            />
                            <div>
                              <p className="font-medium text-foreground">{option.name}</p>
                              {option.description && (
                                <p className="text-xs text-muted-foreground">{option.description}</p>
                              )}
                              {option.estimatedDays && (
                                <p className="text-xs text-muted-foreground">
                                  Tahmini süre: {option.estimatedDays}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm font-semibold text-foreground">
                            {option.isFree ? "Ücretsiz" : formatCurrency(option.finalPrice, currencyOptions)}
                          </div>
                        </div>
                        {option.freeShippingThreshold && (
                          <p className="text-xs text-muted-foreground">
                          {formatCurrency(option.freeShippingThreshold, currencyOptions)} ve üzeri siparişlerde ücretsiz.
                          </p>
                        )}
                      </label>
                    ))}
                  </div>
                  {formErrors['shippingOption'] && (
                    <p className="text-sm font-medium text-foreground">
                      {formErrors['shippingOption']}
                    </p>
                  )}
                </div>
              )}
            </SectionShell>

            <SectionShell title="Ek Notlar" description="Siparişe ilişkin iç notlar">
              <FormLayout>
                <FormLayout.Section>
                  <FormTextarea
                    label="Not"
                    placeholder="Sipariş hakkında ek notlar..."
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </FormLayout.Section>
              </FormLayout>
            </SectionShell>

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                İptal
              </Button>
              <Button
                type="submit"
                className="gap-2"
                disabled={isSubmitting || cartItems.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4" aria-hidden />
                    Sipariş Oluştur
                  </>
                )}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </ProtectedRoute>
  );
}
