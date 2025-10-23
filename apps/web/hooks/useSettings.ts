import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface EmailSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: string;
  smtp_from: string;
}

export interface NotificationSettings {
  email_notifications: string;
  push_notifications: string;
  sms_notifications: string;
  low_stock_threshold: string;
  order_notifications: string;
}

export interface GeneralSettings {
  company_name: string;
  support_email: string;
  contact_phone: string;
  address: string;
  timezone: string;
  currency: string;
  date_format: string;
  time_format: string;
}

export type SettingsCategory = 'email' | 'notification' | 'general' | 'woocommerce' | 'security';

export function useSettings(category: SettingsCategory) {
  return useQuery({
    queryKey: ['settings', category],
    queryFn: async () => {
      const response = await apiClient.get<Record<string, any>>(`/api/settings/${category}`);
      return response;
    },
  });
}

export function useUpdateSettings(category: SettingsCategory) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiClient.put(`/api/settings/${category}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', category] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useTestEmailConnection() {
  return useMutation({
    mutationFn: async () => {
      return apiClient.post('/api/settings/test-connection', { service: 'email' });
    },
  });
}

export function useAllSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await apiClient.get<Record<string, any>>('/api/settings');
      return response;
    },
  });
}
