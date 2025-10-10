"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRBAC } from "@/hooks/useRBAC";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useProducts } from "@/hooks/useProducts";
import { useCart, useAddToCart, useUpdateCartItem, useRemoveFromCart, useClearCart } from "@/hooks/useCart";
import { useApp } from "@/contexts/AppContext";
import { Product } from "@/types/api";
import Link from "next/link";
import { ImagePlaceholder } from "@/components/patterns/ImagePlaceholder";
import { formatCurrency } from "@/lib/formatters";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/forms/FormField";
import { FormSelect } from "@/components/forms/FormSelect";
import { FormCheckbox } from "@/components/forms/FormCheckbox";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  RefreshCw,
  Package,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function CartPage() {
  const { user } = useAuth();
  const { isCustomer, isAdmin } = useRBAC();
  const { addNotification } = useApp();
  
  const [storeId, setStoreId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(8);
  
  const currencyOptions = useMemo(
    () => ({
      locale: "tr-TR",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    []
  );

  // Get user's store ID
  useEffect(() => {
    if (isAdmin() && user?.stores?.length > 0) {
      setStoreId(user.stores[0].id);
    } else if (isCustomer() && user?.stores?.[0]?.id) {
      setStoreId(user.stores[0].id);
    }
  }, [user, isAdmin, isCustomer]);

  const { data: cartData, isLoading: cartLoading } = useCart(storeId);
  const { data: productsData, isLoading: productsLoading } = useProducts({
    storeId,
    limit: 100,
  });

  const addToCartMutation = useAddToCart();
  const updateCartItemMutation = useUpdateCartItem();
  const removeFromCartMutation = useRemoveFromCart();
  const clearCartMutation = useClearCart();

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    if (!productsData?.data) return [];
    
    return productsData.data.filter((product: Product) => {
      const matchesSearch = !searchTerm || 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStock = !stockFilter || 
        (stockFilter === 'in-stock' && (product.stockQuantity === null || product.stockQuantity > 0)) ||
        (stockFilter === 'out-of-stock' && product.stockQuantity !== null && product.stockQuantity <= 0);
      
      return matchesSearch && matchesStock;
    });
  }, [productsData?.data, searchTerm, stockFilter]);

  const cartItems = (cartData as any)?.cart?.items || [];
  const products = (productsData as any)?.data || [];

  const calculateTotal = () => {
    return cartItems.reduce((total: number, item: any) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total: number, item: any) => total + item.quantity, 0);
  };

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
        title: 'Add to Cart Error',
        message: 'An error occurred while adding product to cart'
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
        title: 'Quantity Update Error',
        message: 'An error occurred while updating quantity'
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
        title: 'Remove Item Error',
        message: 'An error occurred while removing item'
      });
    }
  };

  const handleClearCart = async () => {
    if (!storeId) return;

    if (confirm("Are you sure you want to clear the cart?")) {
      try {
        await clearCartMutation.mutateAsync({ storeId });
      } catch {
        addNotification({
          type: 'error',
          title: 'Clear Cart Error',
          message: 'An error occurred while clearing cart'
        });
      }
    }
  };

  // Handle bulk add to cart
  const handleBulkAddToCart = async () => {
    if (!storeId || selectedProducts.length === 0) return;

    try {
      for (const productId of selectedProducts) {
        await addToCartMutation.mutateAsync({
          storeId,
          data: { productId, quantity: 1 },
        });
      }
      setSelectedProducts([]);
      addNotification({
        type: 'info',
        title: 'Success',
        message: `${selectedProducts.length} products added to cart`
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Bulk Add Error',
        message: 'An error occurred while adding products to cart'
      });
    }
  };

  // Handle product selection
  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === currentProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(currentProducts.map((p: Product) => p.id));
    }
  };

  // Pagination functions
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedProducts([]); // Clear selection when changing pages
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stockFilter]);

  // Handle access control
  if (!isCustomer() && !isAdmin()) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <EmptyState
            icon={X}
            title="Access Denied"
            description="You don't have permission to access this page."
          />
        </div>
      </ProtectedRoute>
    );
  }

  // Handle loading state
  if (cartLoading || productsLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="spinner" />
            <span className="text-base font-medium">Loading cart...</span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6 space-y-6">
          {/* Header */}
          <PageHeader
            title="Shopping Cart"
            description="Manage your cart items and add products"
            icon={ShoppingCart}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <Link href="/products">
                    <Package className="h-4 w-4" />
                    <span className="hidden sm:inline">Browse Products</span>
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                {cartItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCart}
                    disabled={clearCartMutation.isPending}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">{clearCartMutation.isPending ? "Clearing..." : "Clear Cart"}</span>
                  </Button>
                )}
              </div>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cart Items</CardTitle>
                  <CardDescription>{getTotalItems()} products in cart</CardDescription>
                </CardHeader>
                <CardContent>
                  {cartItems.length === 0 ? (
                    <EmptyState
                      icon={ShoppingCart}
                      title="Cart is Empty"
                      description="Add products to your cart to get started"
                      action={
                        <Button asChild>
                          <Link href="/products" className="gap-2">
                            <Package className="w-4 h-4" />
                            Browse Products
                          </Link>
                        </Button>
                      }
                    />
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map((item: any) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded border border-border bg-muted">
                                  {item.product.images?.[0] ? (
                                    <img
                                      src={item.product.images[0]}
                                      alt={item.product.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <ImagePlaceholder className="h-full w-full" labelHidden />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-foreground truncate">{item.product.name}</h3>
                                  <p className="text-sm text-muted-foreground">SKU: {item.product.sku}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Stock: {item.product.stockQuantity !== null ? item.product.stockQuantity : "Unlimited"}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between sm:justify-end gap-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                    disabled={updateCartItemMutation.isPending}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="px-3 py-1 bg-background rounded border min-w-[3rem] text-center text-sm">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                    disabled={updateCartItemMutation.isPending || 
                                      (item.product.stockQuantity !== null && item.quantity >= item.product.stockQuantity)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                
                                <div className="text-right">
                                  <p className="font-medium text-foreground">
                                    {formatCurrency(item.product.price * item.quantity, currencyOptions)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatCurrency(item.product.price, currencyOptions)} × {item.quantity}
                                  </p>
                                </div>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveItem(item.productId)}
                                  disabled={removeFromCartMutation.isPending}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
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
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                  <CardDescription>Review your order details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items:</span>
                      <span className="text-foreground">{getTotalItems()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="text-foreground">{formatCurrency(calculateTotal(), currencyOptions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping:</span>
                      <span className="text-foreground">Calculated</span>
                    </div>
                    <div className="border-t border-border pt-3">
                      <div className="flex justify-between text-lg font-semibold">
                        <span className="text-foreground">Total:</span>
                        <span className="text-foreground">{formatCurrency(calculateTotal(), currencyOptions)}</span>
                      </div>
                    </div>
                  </div>

                  {cartItems.length > 0 ? (
                    <Button asChild className="w-full gap-2">
                      <Link href="/orders/create">
                        <CheckCircle className="w-4 h-4" />
                        Create Order
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled className="w-full opacity-50">
                      Cart is Empty
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Available Products */}
          {filteredProducts.length > 0 && (
            <>
              {/* Search & Filter */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Search & Filter Products</CardTitle>
                  <CardDescription>Find products to add to your cart</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <FormField
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search products by name or SKU..."
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <FormSelect
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value)}
                      options={[
                        { value: "", label: "All Stock" },
                        { value: "in-stock", label: "In Stock" },
                        { value: "out-of-stock", label: "Out of Stock" },
                      ]}
                      className="min-w-[140px]"
                    />
                  </div>
                  
                  {selectedProducts.length > 0 && (
                    <Card className="bg-accent/10 border-border">
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm font-medium text-foreground">
                            {selectedProducts.length} product(s) selected
                          </span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleBulkAddToCart}
                              disabled={addToCartMutation.isPending}
                              className="gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              <span className="hidden sm:inline">Add to Cart</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedProducts([])}
                              className="gap-1"
                            >
                              <X className="w-4 h-4" />
                              <span className="hidden sm:inline">Clear</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Products Grid */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-lg">Available Products</CardTitle>
                      <CardDescription>{filteredProducts.length} products available</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                        className="gap-1"
                      >
                        {selectedProducts.length === currentProducts.length ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">
                          {selectedProducts.length === currentProducts.length ? "Deselect All" : "Select All"}
                        </span>
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {currentProducts.map((product: Product) => {
                      const cartItem = cartItems.find((item: any) => item.productId === product.id);
                      const isInCart = !!cartItem;
                      const isOutOfStock = product.stockQuantity !== null && product.stockQuantity !== undefined && product.stockQuantity <= 0;
                      const isSelected = selectedProducts.includes(product.id);

                      return (
                        <Card key={product.id} className={cn(
                          "transition-all duration-200 hover:shadow-md",
                          isSelected ? "bg-accent/10 border-border ring-2 ring-ring/20" : "bg-card border-border"
                        )}>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <FormCheckbox
                                  checked={isSelected}
                                  onChange={() => handleProductSelect(product.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  {product.images[0] ? (
                                    <img
                                      src={product.images[0]}
                                      alt={product.name}
                                      className="w-full h-24 object-cover rounded border border-border"
                                    />
                                  ) : (
                                    <div className="w-full h-24 bg-muted rounded border border-border flex items-center justify-center">
                                      <Package className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h3 className="font-medium text-foreground text-sm line-clamp-2">{product.name}</h3>
                                <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                                <p className="text-xs text-muted-foreground">
                                  Stock: {product.stockQuantity !== null ? product.stockQuantity : "Unlimited"}
                                </p>
                                
                                <div className="flex justify-between items-center pt-2">
                                  <span className="font-semibold text-foreground text-sm">
                                    {formatCurrency(Number(product.price), currencyOptions)}
                                  </span>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddToCart(product.id, 1)}
                                    disabled={addToCartMutation.isPending || isOutOfStock || !product.active}
                                    variant="outline"
                                    className="text-xs px-3 py-1 h-7"
                                  >
                                    {isInCart ? "In Cart" : isOutOfStock ? "Out of Stock" : "Add"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col gap-4 border-t border-border pt-6 mt-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-muted-foreground text-center sm:text-left">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredProducts.length)} of {filteredProducts.length} products
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:inline">Previous</span>
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="min-w-[40px] h-8"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="gap-1"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}