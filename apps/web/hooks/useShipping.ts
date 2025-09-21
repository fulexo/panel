import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ShippingZone {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  prices?: ShippingPrice[];
}

export interface ShippingPrice {
  id: string;
  zoneId: string;
  name: string;
  description?: string;
  basePrice: number;
  freeShippingThreshold?: number;
  estimatedDays?: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  zone?: {
    id: string;
    name: string;
  };
}

export interface CustomerShippingPrice {
  id: string;
  customerId?: string;
  zoneId: string;
  priceId: string;
  adjustmentType: 'percentage' | 'fixed';
  adjustmentValue: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  zone?: {
    id: string;
    name: string;
  };
  price?: {
    id: string;
    name: string;
    basePrice: number;
  };
}

export interface ShippingOption {
  zone: {
    id: string;
    name: string;
    description?: string;
  };
  prices: {
    id: string;
    name: string;
    description?: string;
    basePrice: number;
    estimatedDays?: string;
    freeShippingThreshold?: number;
    priority: number;
  }[];
}

export interface CalculateShippingRequest {
  zoneId: string;
  customerId?: string;
  orderTotal: number;
}

export interface CalculateShippingResponse {
  zoneId: string;
  customerId?: string;
  orderTotal: number;
  options: {
    id: string;
    name: string;
    description?: string;
    basePrice: number;
    finalPrice: number;
    estimatedDays?: string;
    isFree: boolean;
    freeShippingThreshold?: number;
    priority: number;
  }[];
}

// Shipping Zones
export function useShippingZones(includeInactive = false) {
  return useQuery({
    queryKey: ['shipping', 'zones', { includeInactive }],
    queryFn: () => apiClient.get<ShippingZone[]>('/shipping/zones', { 
      params: { includeInactive } 
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useShippingZone(id: string) {
  return useQuery({
    queryKey: ['shipping', 'zones', id],
    queryFn: () => apiClient.get<ShippingZone>(`/shipping/zones/${id}`),
    enabled: !!id,
  });
}

export function useCreateShippingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ShippingZone>) => 
      apiClient.post<ShippingZone>('/shipping/zones', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'zones'] });
    },
  });
}

export function useUpdateShippingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShippingZone> }) => 
      apiClient.put<ShippingZone>(`/shipping/zones/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'zones'] });
    },
  });
}

export function useDeleteShippingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => 
      apiClient.delete(`/shipping/zones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'zones'] });
    },
  });
}

// Shipping Prices
export function useShippingPrices(zoneId?: string) {
  return useQuery({
    queryKey: ['shipping', 'prices', { zoneId }],
    queryFn: () => apiClient.get<ShippingPrice[]>('/shipping/prices', { 
      params: zoneId ? { zoneId } : {} 
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useShippingPrice(id: string) {
  return useQuery({
    queryKey: ['shipping', 'prices', id],
    queryFn: () => apiClient.get<ShippingPrice>(`/shipping/prices/${id}`),
    enabled: !!id,
  });
}

export function useCreateShippingPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<ShippingPrice> & { zoneId: string }) => 
      apiClient.post<ShippingPrice>('/shipping/prices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'prices'] });
      queryClient.invalidateQueries({ queryKey: ['shipping', 'zones'] });
    },
  });
}

export function useUpdateShippingPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ShippingPrice> }) => 
      apiClient.put<ShippingPrice>(`/shipping/prices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'prices'] });
    },
  });
}

export function useDeleteShippingPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => 
      apiClient.delete(`/shipping/prices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'prices'] });
    },
  });
}

// Customer-specific pricing
export function useCustomerShippingPrices(customerId?: string) {
  return useQuery({
    queryKey: ['shipping', 'customer-prices', { customerId }],
    queryFn: () => apiClient.get<CustomerShippingPrice[]>('/shipping/customer-prices', { 
      params: customerId ? { customerId } : {} 
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateCustomerShippingPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CustomerShippingPrice> & { zoneId: string; priceId: string }) => 
      apiClient.post<CustomerShippingPrice>('/shipping/customer-prices', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'customer-prices'] });
    },
  });
}

export function useUpdateCustomerShippingPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerShippingPrice> }) => 
      apiClient.put<CustomerShippingPrice>(`/shipping/customer-prices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'customer-prices'] });
    },
  });
}

export function useDeleteCustomerShippingPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => 
      apiClient.delete(`/shipping/customer-prices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping', 'customer-prices'] });
    },
  });
}

// Calculate shipping
export function useCalculateShipping() {
  return useMutation({
    mutationFn: (data: CalculateShippingRequest) => 
      apiClient.post<CalculateShippingResponse>('/shipping/calculate', data),
  });
}

// Get shipping options for customer display
export function useShippingOptions(customerId?: string) {
  return useQuery({
    queryKey: ['shipping', 'options', { customerId }],
    queryFn: () => apiClient.get<ShippingOption[]>('/shipping/options', { 
      params: customerId ? { customerId } : {} 
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}