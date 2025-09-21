import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from './useApi';
import { Product, PaginatedResponse } from '@/types/api';

// Products hooks
export const useProducts = (params?: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  storeId?: string;
  status?: string;
}) => {
  return useQuery<PaginatedResponse<Product>>({
    queryKey: queryKeys.products(params),
    queryFn: () => apiClient.getProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => apiClient.getProduct(id),
    enabled: !!id,
  });
};

export const useUpdateProductStock = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, stockQuantity }: { id: string; stockQuantity: number }) => 
      apiClient.updateProduct(id, { stockQuantity }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(id) });
    },
  });
};

export const useUpdateProductPrice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, price, salePrice }: { id: string; price: number; salePrice?: number }) => 
      apiClient.updateProduct(id, { price, ...(salePrice !== undefined && { salePrice }) }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(id) });
    },
  });
};