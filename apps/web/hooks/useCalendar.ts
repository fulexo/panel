import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Calendar Events
export const useCalendarEvents = (params?: { from?: string; to?: string }) => {
  return useQuery({
    queryKey: ['calendar-events', params],
    queryFn: () => apiClient.getCalendarEvents(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      type?: string;
      startDate: string;
      endDate: string;
      allDay?: boolean;
    }) => apiClient.createCalendarEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
};

export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: {
      id: string;
      data: {
        title?: string;
        description?: string;
        type?: string;
        startDate?: string;
        endDate?: string;
        allDay?: boolean;
      };
    }) => apiClient.updateCalendarEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
};

export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteCalendarEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
};

// Business Hours
export const useBusinessHours = () => {
  return useQuery({
    queryKey: ['business-hours'],
    queryFn: () => apiClient.getBusinessHours(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useSetBusinessHours = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      days: Array<{
        day: string;
        startTime?: string;
        endTime?: string;
        isWorkingDay?: boolean;
      }>;
    }) => apiClient.setBusinessHours(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
    },
  });
};

// Holidays
export const useHolidays = () => {
  return useQuery({
    queryKey: ['holidays'],
    queryFn: () => apiClient.getHolidays(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateHoliday = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      name: string;
      date: string;
      description?: string;
      recurring?: boolean;
    }) => apiClient.createHoliday(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
};

export const useDeleteHoliday = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteHoliday(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });
};