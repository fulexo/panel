"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useCreateCustomerOrder } from "@/hooks/useOrders";
import { useShippingOptions, useCalculateShipping } from "@/hooks/useShipping";

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

export default function CreateOrderPage() {
  const { user } = useAuth();
  const { isCustomer } = useRBAC();
  const [storeId, setStoreId] = useState<string>("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [shippingAddress, setShippingAddress] = useState<Address>({
    firstName: "",
    lastName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Turkey",
    phone: "",
  });
  const [billingAddress, setBillingAddress] = useState<Address>({
    firstName: "",
    lastName: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "Turkey",
    phone: "",
  });
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedShippingZone, setSelectedShippingZone] = useState<string>("");
  const [selectedShippingOption, setSelectedShippingOption] = useState<string>("");
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [calculatedShipping, setCalculatedShipping] = useState<any>(null);

  // Get user's store ID
  useEffect(() => {
    if (user?.stores?.[0]?.id) {
      setStoreId(user.stores[0].id);
    }
  }, [user]);

  // Get cart data
  const { data: cartData, isLoading: cartLoading } = useCart(storeId);
  const { isLoading: productsLoading } = useProducts({
    storeId,
    limit: 100,
  });

  const createOrderMutation = useCreateCustomerOrder();
  const { data: shippingOptions, isLoading: shippingLoading } = useShippingOptions(user?.id);
  const calculateShippingMutation = useCalculateShipping();

  useEffect(() => {
    if ((cartData as any)?.cart?.items) {
      setCartItems((cartData as any).cart.items);
    }
  }, [cartData]);

  const handleAddressChange = (field: keyof Address, value: string, isShipping = true) => {
    if (isShipping) {
      setShippingAddress(prev => ({ ...prev, [field]: value }));
      if (useSameAddress) {
        setBillingAddress(prev => ({ ...prev, [field]: value }));
      }
    } else {
      setBillingAddress(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleUseSameAddressChange = (checked: boolean) => {
    setUseSameAddress(checked);
    if (checked) {
      setBillingAddress(shippingAddress);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  };

  const calculateShippingCost = async () => {
    if (!selectedShippingZone || cartItems.length === 0) return;

    const orderTotal = calculateTotal();
    try {
      const result = await calculateShippingMutation.mutateAsync({
        zoneId: selectedShippingZone,
        ...(user?.id && { customerId: user.id }),
        orderTotal,
      });
      setCalculatedShipping(result);
    } catch (error) {
      console.error("Kargo hesaplama hatası:", error);
    }
  };

  // Calculate shipping when zone changes
  useEffect(() => {
    if (selectedShippingZone && cartItems.length > 0) {
      calculateShippingCost();
    }
  }, [selectedShippingZone, cartItems]);

  // Update shipping cost when option changes
  useEffect(() => {
    if (calculatedShipping && selectedShippingOption) {
      const option = calculatedShipping.options.find((opt: any) => opt.id === selectedShippingOption);
      if (option) {
        setShippingCost(option.finalPrice);
      }
    }
  }, [selectedShippingOption, calculatedShipping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      alert("Sepetinizde ürün bulunmuyor");
      return;
    }

    if (!storeId) {
      alert("Mağaza seçilmedi");
      return;
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        storeId,
        items: cartItems.map((item: any) => ({
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
        shippingOptionId: selectedShippingOption,
        shippingCost,
      };

      await createOrderMutation.mutateAsync(orderData);
      alert("Siparişiniz başarıyla oluşturuldu! Onay bekliyor.");
      // Redirect to orders page or clear cart
      window.location.href = "/orders";
    } catch (error) {
      console.error("Sipariş oluşturma hatası:", error);
      alert("Sipariş oluşturulurken bir hata oluştu");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cartLoading || productsLoading) {
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="mobile-heading text-foreground mb-6">Yeni Sipariş Oluştur</h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Cart Items */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">Sepet İçeriği</h2>
                {cartItems.length === 0 ? (
                  <p className="text-muted-foreground">Sepetinizde ürün bulunmuyor</p>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                        <div className="flex items-center gap-4">
                          {item.product.images[0] && (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div>
                            <h3 className="font-medium text-foreground">{item.product.name}</h3>
                            <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                            <p className="text-sm text-muted-foreground">Adet: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-foreground">
                            ₺{(item.product.price * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ₺{item.product.price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-border pt-4 space-y-2">
                      <div className="flex justify-between text-foreground">
                        <span>Ara Toplam:</span>
                        <span>₺{calculateTotal().toFixed(2)}</span>
                      </div>
                      {shippingCost > 0 && (
                        <div className="flex justify-between text-foreground">
                          <span>Kargo:</span>
                          <span>₺{shippingCost.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-semibold text-foreground border-t border-border pt-2">
                        <span>Toplam:</span>
                        <span>₺{(calculateTotal() + shippingCost).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Information */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">Müşteri Bilgileri</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ad Soyad *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      E-posta *
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">Teslimat Adresi</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ad *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.firstName}
                      onChange={(e) => handleAddressChange("firstName", e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Soyad *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.lastName}
                      onChange={(e) => handleAddressChange("lastName", e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Adres Satırı 1 *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.addressLine1}
                      onChange={(e) => handleAddressChange("addressLine1", e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Adres Satırı 2
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.addressLine2}
                      onChange={(e) => handleAddressChange("addressLine2", e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Şehir *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => handleAddressChange("city", e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      İlçe *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      onChange={(e) => handleAddressChange("state", e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Posta Kodu *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.postalCode}
                      onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Ülke *
                    </label>
                    <input
                      type="text"
                      value={shippingAddress.country}
                      onChange={(e) => handleAddressChange("country", e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={shippingAddress.phone}
                      onChange={(e) => handleAddressChange("phone", e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="useSameAddress"
                    checked={useSameAddress}
                    onChange={(e) => handleUseSameAddressChange(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="useSameAddress" className="text-sm font-medium text-foreground">
                    Fatura adresi teslimat adresi ile aynı
                  </label>
                </div>

                {!useSameAddress && (
                  <>
                    <h2 className="text-xl font-semibold text-foreground mb-4">Fatura Adresi</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Ad *
                        </label>
                        <input
                          type="text"
                          value={billingAddress.firstName}
                          onChange={(e) => handleAddressChange("firstName", e.target.value, false)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Soyad *
                        </label>
                        <input
                          type="text"
                          value={billingAddress.lastName}
                          onChange={(e) => handleAddressChange("lastName", e.target.value, false)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Adres Satırı 1 *
                        </label>
                        <input
                          type="text"
                          value={billingAddress.addressLine1}
                          onChange={(e) => handleAddressChange("addressLine1", e.target.value, false)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Adres Satırı 2
                        </label>
                        <input
                          type="text"
                          value={billingAddress.addressLine2}
                          onChange={(e) => handleAddressChange("addressLine2", e.target.value, false)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Şehir *
                        </label>
                        <input
                          type="text"
                          value={billingAddress.city}
                          onChange={(e) => handleAddressChange("city", e.target.value, false)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          İlçe *
                        </label>
                        <input
                          type="text"
                          value={billingAddress.state}
                          onChange={(e) => handleAddressChange("state", e.target.value, false)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Posta Kodu *
                        </label>
                        <input
                          type="text"
                          value={billingAddress.postalCode}
                          onChange={(e) => handleAddressChange("postalCode", e.target.value, false)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Ülke *
                        </label>
                        <input
                          type="text"
                          value={billingAddress.country}
                          onChange={(e) => handleAddressChange("country", e.target.value, false)}
                          required
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Telefon
                        </label>
                        <input
                          type="tel"
                          value={billingAddress.phone}
                          onChange={(e) => handleAddressChange("phone", e.target.value, false)}
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Shipping Options */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">Kargo Seçenekleri</h2>
                
                {shippingLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Kargo seçenekleri yükleniyor...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Kargo Bölgesi *
                      </label>
                      <select
                        value={selectedShippingZone}
                        onChange={(e) => setSelectedShippingZone(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      >
                        <option value="">Bölge Seçin</option>
                        {shippingOptions?.map((option: any) => (
                          <option key={option.zone.id} value={option.zone.id}>
                            {option.zone.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {calculatedShipping && calculatedShipping.options.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Kargo Türü *
                        </label>
                        <div className="space-y-2">
                          {calculatedShipping.options.map((option: any) => (
                            <div key={option.id} className="border border-border rounded-lg p-3">
                              <label className="flex items-center justify-between cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="radio"
                                    name="shippingOption"
                                    value={option.id}
                                    checked={selectedShippingOption === option.id}
                                    onChange={(e) => setSelectedShippingOption(e.target.value)}
                                    className="rounded"
                                  />
                                  <div>
                                    <div className="font-medium text-foreground">{option.name}</div>
                                    {option.description && (
                                      <div className="text-sm text-muted-foreground">{option.description}</div>
                                    )}
                                    {option.estimatedDays && (
                                      <div className="text-sm text-muted-foreground">
                                        Tahmini süre: {option.estimatedDays}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-foreground">
                                    {option.isFree ? "Ücretsiz" : `₺${option.finalPrice.toFixed(2)}`}
                                  </div>
                                  {option.freeShippingThreshold && (
                                    <div className="text-xs text-muted-foreground">
                                      Ücretsiz: ₺{option.freeShippingThreshold.toFixed(2)}+
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedShippingZone && !calculatedShipping && (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground">Kargo seçenekleri hesaplanıyor...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="bg-card p-6 rounded-lg border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">Notlar</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="Sipariş hakkında ek notlar..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="btn btn-outline"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || cartItems.length === 0}
                  className="btn btn-primary"
                >
                  {isSubmitting ? "Oluşturuluyor..." : "Sipariş Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}