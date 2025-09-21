"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useProducts } from "@/hooks/useProducts";
import { useCart, useAddToCart, useUpdateCartItem, useRemoveFromCart, useClearCart } from "@/hooks/useCart";
import { useApp } from "@/contexts/AppContext";
import { Product } from "@/types/api";
import Link from "next/link";

export default function CartPage() {
  const { user } = useAuth();
  const { isCustomer } = useRBAC();
  const { addNotification } = useApp();
  const [storeId, setStoreId] = useState<string>("");

  // Get user's store ID
  useEffect(() => {
    if (user?.stores?.[0]?.id) {
      setStoreId(user.stores[0].id);
    }
  }, [user]);

  const { data: cartData, isLoading: cartLoading } = useCart(storeId);
  const { data: productsData, isLoading: productsLoading } = useProducts({
    storeId,
    limit: 100,
  });

  const addToCartMutation = useAddToCart();
  const updateCartItemMutation = useUpdateCartItem();
  const removeFromCartMutation = useRemoveFromCart();
  const clearCartMutation = useClearCart();

  const handleAddToCart = async (productId: string, quantity: number = 1) => {
    if (!storeId) return;

    try {
      await addToCartMutation.mutateAsync({
        storeId,
        data: { productId, quantity },
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Sepete Ekleme Hatası',
        message: 'Ürün sepete eklenirken bir hata oluştu'
      });
    }
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    if (!storeId) return;

    try {
      if (quantity <= 0) {
        await removeFromCartMutation.mutateAsync({ storeId, productId });
      } else {
        await updateCartItemMutation.mutateAsync({
          storeId,
          productId,
          data: { quantity },
        });
      }
    } catch {
      addNotification({
        type: 'error',
        title: 'Miktar Güncelleme Hatası',
        message: 'Miktar güncellenirken bir hata oluştu'
      });
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!storeId) return;

    try {
      await removeFromCartMutation.mutateAsync({ storeId, productId });
    } catch {
      addNotification({
        type: 'error',
        title: 'Ürün Kaldırma Hatası',
        message: 'Ürün kaldırılırken bir hata oluştu'
      });
    }
  };

  const handleClearCart = async () => {
    if (!storeId) return;

    if (confirm("Sepeti temizlemek istediğinizden emin misiniz?")) {
      try {
        await clearCartMutation.mutateAsync({ storeId });
    } catch {
      addNotification({
        type: 'error',
        title: 'Sepet Temizleme Hatası',
        message: 'Sepet temizlenirken bir hata oluştu'
      });
    }
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

  const cartItems = cartData?.cart?.items || [];
  const products = (productsData as any)?.data || [];

  const calculateTotal = () => {
    return cartItems.reduce((total: number, item: any) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total: number, item: any) => total + item.quantity, 0);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h1 className="mobile-heading text-foreground">Alışveriş Sepeti</h1>
              <div className="flex gap-2">
                <Link href="/products" className="btn btn-outline">
                  Alışverişe Devam Et
                </Link>
                {cartItems.length > 0 && (
                  <button
                    onClick={handleClearCart}
                    disabled={clearCartMutation.isPending}
                    className="btn btn-danger"
                  >
                    {clearCartMutation.isPending ? "Temizleniyor..." : "Sepeti Temizle"}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="bg-card p-6 rounded-lg border border-border">
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    Sepet İçeriği ({getTotalItems()} ürün)
                  </h2>
                  
                  {cartItems.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Sepetinizde ürün bulunmuyor</p>
                      <Link href="/products" className="btn btn-primary">
                        Ürünleri Görüntüle
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-accent rounded-lg">
                          {item.product.images[0] && (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="w-20 h-20 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">{item.product.name}</h3>
                            <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                            <p className="text-sm text-muted-foreground">
                              Stok: {item.product.stockQuantity !== null ? item.product.stockQuantity : "Sınırsız"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                              disabled={updateCartItemMutation.isPending}
                              className="btn btn-sm btn-outline"
                            >
                              -
                            </button>
                            <span className="px-3 py-1 bg-background rounded border min-w-[3rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                              disabled={updateCartItemMutation.isPending || 
                                (item.product.stockQuantity !== null && item.quantity >= item.product.stockQuantity)}
                              className="btn btn-sm btn-outline"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">
                              ₺{(item.product.price * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ₺{item.product.price.toFixed(2)} × {item.quantity}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            disabled={removeFromCartMutation.isPending}
                            className="btn btn-sm btn-danger"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-card p-6 rounded-lg border border-border sticky top-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Sipariş Özeti</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ürün Sayısı:</span>
                      <span className="text-foreground">{getTotalItems()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ara Toplam:</span>
                      <span className="text-foreground">₺{calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kargo:</span>
                      <span className="text-foreground">Hesaplanacak</span>
                    </div>
                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between text-lg font-semibold">
                        <span className="text-foreground">Toplam:</span>
                        <span className="text-foreground">₺{calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {cartItems.length > 0 ? (
                    <Link href="/orders/create" className="btn btn-primary w-full">
                      Sipariş Oluştur
                    </Link>
                  ) : (
                    <button disabled className="btn btn-primary w-full opacity-50">
                      Sepet Boş
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Available Products */}
            {products.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">Mevcut Ürünler</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.slice(0, 6).map((product: Product) => {
                    const cartItem = cartItems.find((item: any) => item.productId === product.id);
                    const isInCart = !!cartItem;
                    const isOutOfStock = product.stockQuantity !== null && product.stockQuantity !== undefined && product.stockQuantity <= 0;

                    return (
                      <div key={product.id} className="bg-card p-4 rounded-lg border border-border">
                        {product.images[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-32 object-cover rounded mb-3"
                          />
                        )}
                        <h3 className="font-medium text-foreground mb-2">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">SKU: {product.sku}</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Stok: {product.stockQuantity !== null ? product.stockQuantity : "Sınırsız"}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-foreground">₺{Number(product.price).toFixed(2)}</span>
                          <button
                            onClick={() => handleAddToCart(product.id, 1)}
                            disabled={addToCartMutation.isPending || isOutOfStock || !product.active}
                            className="btn btn-sm btn-primary"
                          >
                            {isInCart ? "Sepette" : isOutOfStock ? "Stokta Yok" : "Sepete Ekle"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center mt-4 space-x-2">
                  <Link href="/products" className="btn btn-outline">
                    Tüm Ürünleri Görüntüle
                  </Link>
                  <Link href="/shipping/calculator" className="btn btn-outline">
                    Kargo Fiyatları
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}