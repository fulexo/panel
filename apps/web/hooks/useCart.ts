import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CartItem {
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
    active: boolean;
  };
}

export interface Cart {
  id: string;
  userId: string;
  storeId: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CartSummary {
  cart: Cart;
  summary: {
    totalItems: number;
    totalAmount: number;
    itemCount: number;
  };
}

export interface AddToCartDto {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}

export function useCart(storeId: string) {
  return useQuery({
    queryKey: ['cart', storeId],
    queryFn: () => apiClient.get<Cart>(`/orders/cart/${storeId}`),
    enabled: !!storeId,
  });
}

export function useCartSummary(storeId: string) {
  return useQuery({
    queryKey: ['cart', 'summary', storeId],
    queryFn: () => apiClient.get<CartSummary>(`/orders/cart/${storeId}/summary`),
    enabled: !!storeId,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, data }: { storeId: string; data: AddToCartDto }) =>
      apiClient.post<CartItem>(`/orders/cart/${storeId}/items`, data),
    onSuccess: (_, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: ['cart', storeId] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'summary', storeId] });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      storeId, 
      productId, 
      data 
    }: { 
      storeId: string; 
      productId: string; 
      data: UpdateCartItemDto 
    }) =>
      apiClient.put<CartItem>(`/orders/cart/${storeId}/items/${productId}`, data),
    onSuccess: (_, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: ['cart', storeId] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'summary', storeId] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, productId }: { storeId: string; productId: string }) =>
      apiClient.delete(`/orders/cart/${storeId}/items/${productId}`),
    onSuccess: (_, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: ['cart', storeId] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'summary', storeId] });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId }: { storeId: string }) =>
      apiClient.delete(`/orders/cart/${storeId}`),
    onSuccess: (_, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: ['cart', storeId] });
      queryClient.invalidateQueries({ queryKey: ['cart', 'summary', storeId] });
    },
  });
}