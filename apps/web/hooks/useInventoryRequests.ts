import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface InventoryRequest {
  id: string;
  tenantId: string;
  storeId: string;
  customerId: string;
  type: 'stock_adjustment' | 'new_product' | 'product_update';
  status: 'pending' | 'approved' | 'rejected';
  title: string;
  description?: string;
  productId?: string;
  currentStock?: number;
  requestedStock?: number;
  adjustmentReason?: string;
  productData?: any;
  updateData?: any;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    stockQuantity: number;
    price?: number;
    description?: string;
  };
  store?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface InventoryRequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface CreateInventoryRequestData {
  storeId: string;
  type: 'stock_adjustment' | 'new_product' | 'product_update';
  title: string;
  description?: string;
  productId?: string;
  currentStock?: number;
  requestedStock?: number;
  adjustmentReason?: string;
  productData?: {
    name: string;
    sku?: string;
    price: number;
    regularPrice?: number;
    description?: string;
    shortDescription?: string;
    weight?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
    images?: string[];
    categories?: string[];
    tags?: string[];
  };
  updateData?: Record<string, unknown>;
}

export interface UpdateInventoryRequestData {
  title?: string;
  description?: string;
  currentStock?: number;
  requestedStock?: number;
  adjustmentReason?: string;
  productData?: Record<string, unknown>;
  updateData?: Record<string, unknown>;
}

export interface ReviewInventoryRequestData {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
  adminNotes?: string;
}

// Get inventory requests
export function useInventoryRequests(params?: {
  type?: string;
  status?: string;
  storeId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['inventory-requests', params],
    queryFn: () => apiClient.getInventoryRequests(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Get inventory request by ID
export function useInventoryRequest(id: string) {
  return useQuery({
    queryKey: ['inventory-requests', id],
    queryFn: () => apiClient.getInventoryRequest(id),
    enabled: !!id,
  });
}

// Get inventory request statistics
export function useInventoryRequestStats() {
  return useQuery({
    queryKey: ['inventory-requests', 'stats'],
    queryFn: () => apiClient.getInventoryRequestStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Create inventory request
export function useCreateInventoryRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInventoryRequestData) => 
      apiClient.createInventoryRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-requests'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-requests', 'stats'] });
    },
  });
}

// Update inventory request
export function useUpdateInventoryRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInventoryRequestData }) => 
      apiClient.updateInventoryRequest(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-requests'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-requests', id] });
    },
  });
}

// Review inventory request (admin only)
export function useReviewInventoryRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewInventoryRequestData }) => 
      apiClient.updateInventoryRequest(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-requests'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-requests', id] });
      queryClient.invalidateQueries({ queryKey: ['inventory-requests', 'stats'] });
    },
  });
}

// Delete inventory request
export function useDeleteInventoryRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => 
      apiClient.deleteInventoryRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-requests'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-requests', 'stats'] });
    },
  });
}