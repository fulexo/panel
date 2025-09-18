import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from './useApi';
import { logger } from '@/lib/logger';

// Inventory approval hooks
export const useInventoryApprovals = (params?: { 
  page?: number; 
  limit?: number; 
  status?: string;
  storeId?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.inventoryApprovals(params),
    queryFn: () => apiClient.getInventoryApprovals(params),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useApproveInventoryChange = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) => 
      apiClient.approveInventoryChange(id, approved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryApprovals() });
    },
  });
};

export const useRejectInventoryChange = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      // Mock implementation - replace with actual API call
      logger.info('Rejecting inventory change:', { id, reason });
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryApprovals() });
    },
  });
};

export const useRequestInventoryChange = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      productId: string;
      newQuantity: number;
      reason: string;
    }) => {
      // Mock implementation - replace with actual API call
      logger.info('Requesting inventory change:', data);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryApprovals() });
    },
  });
};