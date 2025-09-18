import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from './useApi';

// Auth hooks
export const useMe = () => {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: apiClient.getMe,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      apiClient.login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.logout,
    onSuccess: () => {
      queryClient.clear();
    },
  });
};