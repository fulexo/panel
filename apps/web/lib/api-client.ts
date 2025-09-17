import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Base API client
export const apiClient = async (path: string, init?: RequestInit) => {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
};

// Generic API hooks
export function useApiQuery<T>(
  queryKey: (string | number)[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
  }
) {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
}

export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    invalidateQueries?: (string | number)[][];
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      options?.onSuccess?.(data);
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    },
    onError: options?.onError,
  });
}

// Specific API hooks
export function useOrders(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  storeId?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.storeId) queryParams.set('storeId', params.storeId);

  return useApiQuery(
    ['orders', params],
    () => apiClient(`/orders?${queryParams.toString()}`),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

export function useProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  storeId?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.category) queryParams.set('category', params.category);
  if (params?.storeId) queryParams.set('storeId', params.storeId);

  return useApiQuery(
    ['products', params],
    () => apiClient(`/products?${queryParams.toString()}`),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

export function useCustomers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tag?: string;
  storeId?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', params.page.toString());
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.search) queryParams.set('search', params.search);
  if (params?.status) queryParams.set('status', params.status);
  if (params?.tag) queryParams.set('tag', params.tag);
  if (params?.storeId) queryParams.set('storeId', params.storeId);

  return useApiQuery(
    ['customers', params],
    () => apiClient(`/customers?${queryParams.toString()}`),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

export function useSettings(category: string) {
  return useApiQuery(
    ['settings', category],
    () => apiClient(`/settings/${category}`),
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );
}

// Mutation hooks
export function useCreateOrder() {
  return useApiMutation(
    (data: any) => apiClient('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    {
      invalidateQueries: [['orders']],
    }
  );
}

export function useUpdateOrder() {
  return useApiMutation(
    ({ id, data }: { id: string; data: any }) => apiClient(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    {
      invalidateQueries: [['orders']],
    }
  );
}

export function useDeleteOrder() {
  return useApiMutation(
    (id: string) => apiClient(`/orders/${id}`, {
      method: 'DELETE',
    }),
    {
      invalidateQueries: [['orders']],
    }
  );
}

export function useCreateProduct() {
  return useApiMutation(
    (data: any) => apiClient('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    {
      invalidateQueries: [['products']],
    }
  );
}

export function useUpdateProduct() {
  return useApiMutation(
    ({ id, data }: { id: string; data: any }) => apiClient(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    {
      invalidateQueries: [['products']],
    }
  );
}

export function useDeleteProduct() {
  return useApiMutation(
    (id: string) => apiClient(`/products/${id}`, {
      method: 'DELETE',
    }),
    {
      invalidateQueries: [['products']],
    }
  );
}

export function useCreateCustomer() {
  return useApiMutation(
    (data: any) => apiClient('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    {
      invalidateQueries: [['customers']],
    }
  );
}

export function useUpdateCustomer() {
  return useApiMutation(
    ({ id, data }: { id: string; data: any }) => apiClient(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    {
      invalidateQueries: [['customers']],
    }
  );
}

export function useDeleteCustomer() {
  return useApiMutation(
    (id: string) => apiClient(`/customers/${id}`, {
      method: 'DELETE',
    }),
    {
      invalidateQueries: [['customers']],
    }
  );
}

export function useUpdateSettings() {
  return useApiMutation(
    ({ category, data }: { category: string; data: any }) => apiClient(`/settings/${category}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    {
      invalidateQueries: [['settings']],
    }
  );
}