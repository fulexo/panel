import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from './useApi';

// Orders hooks
export const useOrders = (params?: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  status?: string;
  storeId?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => apiClient.getOrders(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => apiClient.getOrder(id),
    enabled: !!id,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiClient.updateOrderStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
    },
  });
};

export const useUpdateOrderShipping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { trackingNumber: string; carrier: string; status: string } }) => 
      apiClient.updateOrderShipping(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
    },
  });
};

// Customer order creation
export const useCreateCustomerOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/orders/customer', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
    },
  });
};

// Order approvals
export const usePendingApprovals = (params?: { 
  page?: number; 
  limit?: number; 
  storeId?: string;
}) => {
  return useQuery({
    queryKey: ['orders', 'pending-approvals', params],
    queryFn: () => apiClient.get('/orders/pending-approvals', { params }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useApproveOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => 
      apiClient.put(`/orders/${id}/approve`, { notes }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'pending-approvals'] });
    },
  });
};

export const useRejectOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason, notes }: { id: string; reason: string; notes?: string }) => 
      apiClient.put(`/orders/${id}/reject`, { reason, notes }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
      queryClient.invalidateQueries({ queryKey: ['orders', 'pending-approvals'] });
    },
  });
};