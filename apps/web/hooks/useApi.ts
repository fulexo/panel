import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Query keys
export const queryKeys = {
  stores: ['stores'] as const,
  store: (id: string) => ['stores', id] as const,
  orders: (params?: Record<string, unknown>) => ['orders', params] as const,
  order: (id: string) => ['orders', id] as const,
  products: (params?: Record<string, unknown>) => ['products', params] as const,
  product: (id: string) => ['products', id] as const,
  productSales: (id: string) => ['products', id, 'sales'] as const,
  customers: (params?: Record<string, unknown>) => ['customers', params] as const,
  customer: (id: string) => ['customers', id] as const,
  inventoryApprovals: (params?: Record<string, unknown>) => ['inventory-approvals', params] as const,
  returns: (params?: Record<string, unknown>) => ['returns', params] as const,
  return: (id: string) => ['returns', id] as const,
  supportTickets: (params?: Record<string, unknown>) => ['support-tickets', params] as const,
  supportTicket: (id: string) => ['support-tickets', id] as const,
  supportTicketMessages: (ticketId: string) => ['support-tickets', ticketId, 'messages'] as const,
  dashboardStats: (storeId?: string) => ['dashboard-stats', storeId] as const,
  me: ['me'] as const,
  // New features query keys
  cart: (storeId: string) => ['cart', storeId] as const,
  shippingZones: (includeInactive?: boolean) => ['shipping', 'zones', { includeInactive }] as const,
  shippingPrices: (zoneId?: string) => ['shipping', 'prices', { zoneId }] as const,
  shippingOptions: (customerId?: string) => ['shipping', 'options', { customerId }] as const,
  inventoryRequests: (params?: Record<string, unknown>) => ['inventory-requests', params] as const,
  inventoryRequest: (id: string) => ['inventory-requests', id] as const,
  fulfillmentServices: (includeInactive?: boolean) => ['fulfillment-services', { includeInactive }] as const,
  fulfillmentBillingItems: (params?: Record<string, unknown>) => ['fulfillment-billing-items', params] as const,
  fulfillmentBillingItem: (id: string) => ['fulfillment-billing-items', id] as const,
  fulfillmentInvoices: (params?: Record<string, unknown>) => ['fulfillment-invoices', params] as const,
  fulfillmentInvoice: (id: string) => ['fulfillment-invoices', id] as const,
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
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => 
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
  // Filter out undefined values to avoid exactOptionalPropertyTypes issues
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  );
  
  return useQuery({
    queryKey: queryKeys.orders(filteredParams),
    queryFn: () => apiClient.getOrders(filteredParams),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => apiClient.getOrder(id),
    enabled: !!id,
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiClient.updateOrderStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
    },
  });
};

export const useUpdateOrderShipping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { trackingNumber: string; carrier: string } }) => 
      apiClient.updateOrderShipping(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
    },
  });
};

// Products hooks
export const useProducts = (params: { page?: number; limit?: number; search?: string; category?: string; storeId?: string } = {}) => {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  );
  
  return useQuery({
    queryKey: queryKeys.products(filteredParams),
    queryFn: () => apiClient.getProducts(filteredParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: () => apiClient.getProduct(id),
    enabled: !!id,
  });
};

export const useProductSales = (id: string) => {
  return useQuery({
    queryKey: queryKeys.productSales(id),
    queryFn: () => apiClient.getProductSales(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => 
      apiClient.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
      queryClient.invalidateQueries({ queryKey: queryKeys.product(id) });
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
  });
};

export const useBulkUpdateProducts = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.bulkUpdateProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
  });
};

// Bundle Product hooks
export const useBundleItems = (bundleId: string) => {
  return useQuery({
    queryKey: ['bundle-items', bundleId],
    queryFn: () => apiClient.getBundleItems(bundleId),
    enabled: !!bundleId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useAddBundleItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ bundleId, data }: { bundleId: string; data: {
      productId: string;
      quantity: number;
      isOptional?: boolean;
      minQuantity?: number;
      maxQuantity?: number;
      discount?: number;
      sortOrder?: number;
    } }) => 
      apiClient.addBundleItem(bundleId, data),
    onSuccess: (_, { bundleId }) => {
      queryClient.invalidateQueries({ queryKey: ['bundle-items', bundleId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
  });
};

export const useUpdateBundleItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ bundleId, productId, data }: { bundleId: string; productId: string; data: Record<string, unknown> }) => 
      apiClient.updateBundleItem(bundleId, productId, data),
    onSuccess: (_, { bundleId }) => {
      queryClient.invalidateQueries({ queryKey: ['bundle-items', bundleId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
  });
};

export const useRemoveBundleItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ bundleId, productId }: { bundleId: string; productId: string }) => 
      apiClient.removeBundleItem(bundleId, productId),
    onSuccess: (_, { bundleId }) => {
      queryClient.invalidateQueries({ queryKey: ['bundle-items', bundleId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.products() });
    },
  });
};

export const useCalculateBundlePrice = () => {
  return useMutation({
    mutationFn: ({ bundleId, data }: { bundleId: string; data: {
      items: Array<{
        productId: string;
        quantity: number;
      }>;
    } }) => 
      apiClient.calculateBundlePrice(bundleId, data),
  });
};

// Customers hooks
export const useCustomers = (params: { page?: number; limit?: number; search?: string; storeId?: string } = {}) => {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  );
  
  return useQuery({
    queryKey: queryKeys.customers(filteredParams),
    queryFn: () => apiClient.getCustomers(filteredParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: () => apiClient.getCustomer(id),
    enabled: !!id,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers() });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => 
      apiClient.updateCustomer(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers() });
      queryClient.invalidateQueries({ queryKey: queryKeys.customer(id) });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers() });
    },
  });
};

// Inventory hooks
export const useInventory = (params: { page?: number; limit?: number; search?: string; storeId?: string; lowStock?: boolean } = {}) => {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  );
  
  return useQuery({
    queryKey: ['inventory', filteredParams],
    queryFn: () => apiClient.getInventory(filteredParams),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { quantity: number; reason?: string } }) => 
      apiClient.updateInventory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryApprovals() });
    },
  });
};

export const useInventoryApprovals = (params: { page?: number; limit?: number; status?: string } = {}) => {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  );
  
  return useQuery({
    queryKey: queryKeys.inventoryApprovals(filteredParams),
    queryFn: () => apiClient.getInventoryApprovals(filteredParams),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useApproveInventoryChange = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.approveInventoryChange(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryApprovals() });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};

// Returns hooks
export const useReturns = (params: { page?: number; limit?: number; search?: string; status?: string; storeId?: string } = {}) => {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  );
  
  return useQuery({
    queryKey: queryKeys.returns(filteredParams),
    queryFn: () => apiClient.getReturns(filteredParams),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useReturn = (id: string) => {
  return useQuery({
    queryKey: queryKeys.return(id),
    queryFn: () => apiClient.getReturn(id),
    enabled: !!id,
  });
};

export const useCreateReturn = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns() });
    },
  });
};

export const useUpdateReturnStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiClient.updateReturnStatus(id, status),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.returns() });
      queryClient.invalidateQueries({ queryKey: queryKeys.return(id) });
    },
  });
};

// Support hooks
export const useSupportTickets = (params: { page?: number; limit?: number; search?: string; status?: string; priority?: string; storeId?: string } = {}) => {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([_, value]) => value !== undefined)
  );
  
  return useQuery({
    queryKey: queryKeys.supportTickets(filteredParams),
    queryFn: () => apiClient.getSupportTickets(filteredParams),
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSupportTicket = (id: string) => {
  return useQuery({
    queryKey: queryKeys.supportTicket(id),
    queryFn: () => apiClient.getSupportTicket(id),
    enabled: !!id,
  });
};

export const useCreateSupportTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: apiClient.createSupportTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets() });
    },
  });
};

export const useUpdateSupportTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => 
      apiClient.updateSupportTicket(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTickets() });
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTicket(id) });
    },
  });
};

export const useSupportTicketMessages = (ticketId: string) => {
  return useQuery({
    queryKey: queryKeys.supportTicketMessages(ticketId),
    queryFn: () => apiClient.getSupportTicketMessages(ticketId),
    enabled: !!ticketId,
    staleTime: 10 * 1000, // 10 seconds
  });
};

export const useSendSupportMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ ticketId, message, attachments }: { ticketId: string; message: string; attachments?: File[] }) => 
      apiClient.sendSupportMessage(ticketId, message, attachments),
    onSuccess: (_, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supportTicketMessages(ticketId) });
    },
  });
};

// Reports hooks

export const useSalesReport = (params?: {
  startDate?: string;
  endDate?: string;
  storeId?: string;
  groupBy?: 'day' | 'week' | 'month';
}) => {
  return useQuery({
    queryKey: ['sales-report', params],
    queryFn: () => apiClient.getSalesReport(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useProductReport = (params?: {
  startDate?: string;
  endDate?: string;
  storeId?: string;
  category?: string;
}) => {
  return useQuery({
    queryKey: ['product-report', params],
    queryFn: () => apiClient.getProductReport(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCustomerReport = (params?: {
  startDate?: string;
  endDate?: string;
  storeId?: string;
}) => {
  return useQuery({
    queryKey: ['customer-report', params],
    queryFn: () => apiClient.getCustomerReport(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useInventoryReport = (params?: {
  storeId?: string;
  category?: string;
  lowStock?: boolean;
}) => {
  return useQuery({
    queryKey: ['inventory-report', params],
    queryFn: () => apiClient.getInventoryReport(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useFinancialReport = (params?: {
  startDate?: string;
  endDate?: string;
  storeId?: string;
}) => {
  return useQuery({
    queryKey: ['financial-report', params],
    queryFn: () => apiClient.getFinancialReport(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Store statistics hooks
export const useStoreStats = (storeId: string) => {
  return useQuery({
    queryKey: ['store-stats', storeId],
    queryFn: () => apiClient.getStoreStats(storeId),
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useStoreSyncLogs = (storeId: string, params?: { limit?: number }) => {
  return useQuery({
    queryKey: ['store-sync-logs', storeId, params],
    queryFn: () => apiClient.getStoreSyncLogs(storeId, params),
    enabled: !!storeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Customer statistics hooks
export const useCustomerStats = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-stats', customerId],
    queryFn: () => apiClient.getCustomerStats(customerId),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCustomerOrders = (customerId: string, params?: { limit?: number; status?: string }) => {
  return useQuery({
    queryKey: ['customer-orders', customerId, params],
    queryFn: () => apiClient.getCustomerOrders(customerId, params),
    enabled: !!customerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};