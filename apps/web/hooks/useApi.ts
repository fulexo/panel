import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Query keys
export const queryKeys = {
  stores: ['stores'] as const,
  store: (id: string) => ['stores', id] as const,
  orders: (params?: any) => ['orders', params] as const,
  order: (id: string) => ['orders', id] as const,
  products: (params?: any) => ['products', params] as const,
  product: (id: string) => ['products', id] as const,
  customers: (params?: any) => ['customers', params] as const,
  customer: (id: string) => ['customers', id] as const,
  inventoryApprovals: (params?: any) => ['inventory-approvals', params] as const,
  returns: (params?: any) => ['returns', params] as const,
  return: (id: string) => ['returns', id] as const,
  supportTickets: (params?: any) => ['support-tickets', params] as const,
  supportTicket: (id: string) => ['support-tickets', id] as const,
  supportTicketMessages: (ticketId: string) => ['support-tickets', ticketId, 'messages'] as const,
  dashboardStats: (storeId?: string) => ['dashboard-stats', storeId] as const,
  me: ['me'] as const,
};

// Stores hooks
export const useStores = (params?: { page?: number; limit?: number; search?: string }) => {
  return useQuery({
    queryKey: queryKeys.stores,
    queryFn: () => apiClient.getStores(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useStore = (id: string) => {
  return useQuery({
    queryKey: queryKeys.store(id),
    queryFn: () => apiClient.getStore(id),
    enabled: !!id,
  });
};

export const useCreateStore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.createStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores });
    },
  });
};

export const useUpdateStore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiClient.updateStore(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores });
      queryClient.invalidateQueries({ queryKey: queryKeys.store(id) });
    },
  });
};

export const useDeleteStore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.deleteStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores });
    },
  });
};

export const useSyncStore = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.syncStore,
    onSuccess: (_, storeId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores });
      queryClient.invalidateQueries({ queryKey: queryKeys.store(storeId) });
    },
  });
};

export const useTestStoreConnection = () => {
  return useMutation({
    mutationFn: apiClient.testStoreConnection,
  });
};

// Dashboard hooks
export const useDashboardStats = (storeId?: string) => {
  return useQuery({
    queryKey: queryKeys.dashboardStats(storeId),
    queryFn: () => apiClient.getDashboardStats(storeId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useOrders = (params: { page?: number; limit?: number; search?: string; status?: string; storeId?: string } = {}) => {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () => apiClient.getOrders(params),
    staleTime: 30 * 1000, // 30 seconds
  });
};