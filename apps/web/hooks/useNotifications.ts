import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Notification {
  id: string;
  tenantId: string;
  userId?: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  type?: string;
  priority?: string;
  read?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export function useNotifications(filters?: NotificationFilters) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.read !== undefined) params.append('read', String(filters.read));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));

      const response = await apiClient.get<{
        data: Notification[];
        pagination: { total: number; limit: number; offset: number };
      }>(`/api/notifications?${params.toString()}`);
      return response;
    },
  });
}

export function useNotificationStats() {
  return useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get<NotificationStats>('/api/notifications/stats');
      return response;
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await apiClient.get<number>('/api/notifications/unread-count');
      return response;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.patch(`/api/notifications/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return apiClient.post('/api/notifications/mark-all-read', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Record<string, any>) => {
      return apiClient.patch('/api/users/me/notification-preferences', preferences);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
