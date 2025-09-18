import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from './useApi';

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
    mutationFn: apiClient.approveInventoryChange,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryApprovals() });
    },
  });
};

export const useRejectInventoryChange = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      apiClient.rejectInventoryChange(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryApprovals() });
    },
  });
};

export const useRequestInventoryChange = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.requestInventoryChange,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryApprovals() });
    },
  });
};