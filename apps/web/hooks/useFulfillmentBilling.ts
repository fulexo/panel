import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface FulfillmentService {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  unit: string;
  basePrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FulfillmentBillingItem {
  id: string;
  tenantId: string;
  orderId: string;
  serviceId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  description?: string;
  serviceDate: string;
  isBilled: boolean;
  billedAt?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
  service: FulfillmentService;
  order: {
    id: string;
    orderNumber: string;
    customer: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface FulfillmentInvoice {
  id: string;
  tenantId: string;
  customerId: string;
  invoiceNumber: string;
  month: number;
  year: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  items: FulfillmentBillingItem[];
}

export interface FulfillmentBillingStats {
  totalItems: number;
  unbilledItems: number;
  totalAmount: number;
  unbilledAmount: number;
}

export interface CreateFulfillmentServiceData {
  name: string;
  description?: string;
  unit: string;
  basePrice: number;
  isActive?: boolean;
}

export interface UpdateFulfillmentServiceData {
  name?: string;
  description?: string;
  unit?: string;
  basePrice?: number;
  isActive?: boolean;
}

export interface CreateFulfillmentBillingItemData {
  orderId: string;
  serviceId: string;
  quantity: number;
  unitPrice?: number;
  description?: string;
  serviceDate?: string;
}

export interface UpdateFulfillmentBillingItemData {
  quantity?: number;
  unitPrice?: number;
  description?: string;
  serviceDate?: string;
}

export interface GenerateMonthlyInvoiceData {
  customerId: string;
  month: number;
  year: number;
  notes?: string;
  dueDate?: string;
}

export interface UpdateFulfillmentInvoiceData {
  status?: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  dueDate?: string;
  paidAt?: string;
}

// Fulfillment Services
export function useFulfillmentServices(includeInactive = false) {
  return useQuery({
    queryKey: ['fulfillment-services', { includeInactive }],
    queryFn: () => apiClient.get<FulfillmentService[]>('/fulfillment-billing/services', { 
      params: { includeInactive } 
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFulfillmentService(id: string) {
  return useQuery({
    queryKey: ['fulfillment-services', id],
    queryFn: () => apiClient.get<FulfillmentService>(`/fulfillment-billing/services/${id}`),
    enabled: !!id,
  });
}

export function useCreateFulfillmentService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFulfillmentServiceData) => 
      apiClient.post<FulfillmentService>('/fulfillment-billing/services', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-services'] });
    },
  });
}

export function useUpdateFulfillmentService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFulfillmentServiceData }) => 
      apiClient.put<FulfillmentService>(`/fulfillment-billing/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-services'] });
    },
  });
}

export function useDeleteFulfillmentService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => 
      apiClient.delete(`/fulfillment-billing/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-services'] });
    },
  });
}

// Fulfillment Billing Items
export function useFulfillmentBillingItems(params?: {
  orderId?: string;
  customerId?: string;
  isBilled?: boolean;
  serviceId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['fulfillment-billing-items', params],
    queryFn: () => apiClient.get<{
      data: FulfillmentBillingItem[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>('/fulfillment-billing/billing-items', { params }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useFulfillmentBillingItem(id: string) {
  return useQuery({
    queryKey: ['fulfillment-billing-items', id],
    queryFn: () => apiClient.get<FulfillmentBillingItem>(`/fulfillment-billing/billing-items/${id}`),
    enabled: !!id,
  });
}

export function useCreateFulfillmentBillingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFulfillmentBillingItemData) => 
      apiClient.post<FulfillmentBillingItem>('/fulfillment-billing/billing-items', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-billing-items'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-billing-stats'] });
    },
  });
}

export function useUpdateFulfillmentBillingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFulfillmentBillingItemData }) => 
      apiClient.put<FulfillmentBillingItem>(`/fulfillment-billing/billing-items/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-billing-items'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-billing-stats'] });
    },
  });
}

export function useDeleteFulfillmentBillingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => 
      apiClient.delete(`/fulfillment-billing/billing-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-billing-items'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-billing-stats'] });
    },
  });
}

// Fulfillment Invoices
export function useFulfillmentInvoices(params?: {
  customerId?: string;
  status?: string;
  month?: number;
  year?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['fulfillment-invoices', params],
    queryFn: () => apiClient.get<{
      data: FulfillmentInvoice[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>('/fulfillment-billing/invoices', { params }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useFulfillmentInvoice(id: string) {
  return useQuery({
    queryKey: ['fulfillment-invoices', id],
    queryFn: () => apiClient.get<FulfillmentInvoice>(`/fulfillment-billing/invoices/${id}`),
    enabled: !!id,
  });
}

export function useGenerateMonthlyInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateMonthlyInvoiceData) => 
      apiClient.post<FulfillmentInvoice>('/fulfillment-billing/invoices/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-billing-items'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-billing-stats'] });
    },
  });
}

export function useUpdateFulfillmentInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFulfillmentInvoiceData }) => 
      apiClient.put<FulfillmentInvoice>(`/fulfillment-billing/invoices/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fulfillment-invoices'] });
    },
  });
}

// Statistics
export function useFulfillmentBillingStats(customerId?: string) {
  return useQuery({
    queryKey: ['fulfillment-billing-stats', { customerId }],
    queryFn: () => apiClient.get<FulfillmentBillingStats>('/fulfillment-billing/stats', { 
      params: customerId ? { customerId } : {} 
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}