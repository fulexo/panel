const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use default error message if JSON parsing fails
        }

        throw new ApiError(errorMessage, response.status, response.statusText);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return {} as T;
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0,
        'Network Error'
      );
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Stores endpoints
  async getStores(params?: { page?: number; limit?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    
    const queryString = searchParams.toString();
    return this.request(`/stores${queryString ? `?${queryString}` : ''}`);
  }

  async getStore(id: string) {
    return this.request(`/stores/${id}`);
  }

  async createStore(data: {
    name: string;
    url: string;
    consumerKey: string;
    consumerSecret: string;
    customerId: string;
  }) {
    return this.request('/stores', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStore(id: string, data: {
    name?: string;
    url?: string;
    consumerKey?: string;
    consumerSecret?: string;
  }) {
    return this.request(`/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStore(id: string) {
    return this.request(`/stores/${id}`, {
      method: 'DELETE',
    });
  }

  async syncStore(id: string) {
    return this.request(`/stores/${id}/sync`, {
      method: 'POST',
    });
  }

  async testStoreConnection(id: string) {
    return this.request(`/stores/${id}/test-connection`, {
      method: 'POST',
    });
  }

  async getStoreStatus(id: string) {
    return this.request(`/stores/${id}/status`);
  }

  // Orders endpoints
  async getOrders(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: string;
    storeId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.storeId) searchParams.set('storeId', params.storeId);
    
    const queryString = searchParams.toString();
    return this.request(`/orders${queryString ? `?${queryString}` : ''}`);
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateOrderShipping(id: string, data: {
    trackingNumber?: string;
    carrier?: string;
    status?: string;
  }) {
    return this.request(`/orders/${id}/shipping`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Products endpoints
  async getProducts(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    storeId?: string;
    status?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.storeId) searchParams.set('storeId', params.storeId);
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return this.request(`/products${queryString ? `?${queryString}` : ''}`);
  }

  async getProduct(id: string) {
    return this.request(`/products/${id}`);
  }

  async updateProductStock(id: string, stockQuantity: number) {
    return this.request(`/products/${id}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ stockQuantity }),
    });
  }

  async updateProductPrice(id: string, price: number, salePrice?: number) {
    return this.request(`/products/${id}/price`, {
      method: 'PUT',
      body: JSON.stringify({ price, salePrice }),
    });
  }

  // Customers endpoints
  async getCustomers(params?: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    storeId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.storeId) searchParams.set('storeId', params.storeId);
    
    const queryString = searchParams.toString();
    return this.request(`/customers${queryString ? `?${queryString}` : ''}`);
  }

  async getCustomer(id: string) {
    return this.request(`/customers/${id}`);
  }

  // Inventory endpoints
  async getInventoryApprovals(params?: { 
    page?: number; 
    limit?: number; 
    status?: string;
    storeId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.storeId) searchParams.set('storeId', params.storeId);
    
    const queryString = searchParams.toString();
    return this.request(`/inventory/approvals${queryString ? `?${queryString}` : ''}`);
  }

  async approveInventoryChange(id: string) {
    return this.request(`/inventory/approvals/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectInventoryChange(id: string, reason: string) {
    return this.request(`/inventory/approvals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async requestInventoryChange(data: {
    productId: string;
    changeType: string;
    newValue: Record<string, unknown>;
    reason?: string;
  }) {
    return this.request('/inventory/approvals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Returns endpoints
  async getReturns(params?: { 
    page?: number; 
    limit?: number; 
    status?: string;
    storeId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.storeId) searchParams.set('storeId', params.storeId);
    
    const queryString = searchParams.toString();
    return this.request(`/returns${queryString ? `?${queryString}` : ''}`);
  }

  async getReturn(id: string) {
    return this.request(`/returns/${id}`);
  }

  async updateReturnStatus(id: string, status: string, notes?: string) {
    return this.request(`/returns/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  // Support endpoints
  async getSupportTickets(params?: { 
    page?: number; 
    limit?: number; 
    status?: string;
    priority?: string;
    storeId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.storeId) searchParams.set('storeId', params.storeId);
    
    const queryString = searchParams.toString();
    return this.request(`/support/tickets${queryString ? `?${queryString}` : ''}`);
  }

  async getSupportTicket(id: string) {
    return this.request(`/support/tickets/${id}`);
  }

  async createSupportTicket(data: {
    subject: string;
    description: string;
    priority?: string;
    storeId?: string;
  }) {
    return this.request('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupportTicket(id: string, data: {
    status?: string;
    priority?: string;
    assignedTo?: string;
  }) {
    return this.request(`/support/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getSupportTicketMessages(ticketId: string) {
    return this.request(`/support/tickets/${ticketId}/messages`);
  }

  async sendSupportMessage(ticketId: string, message: string, isInternal: boolean = false) {
    return this.request(`/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, isInternal }),
    });
  }

  // Dashboard endpoints
  async getDashboardStats(storeId?: string) {
    const searchParams = new URLSearchParams();
    if (storeId) searchParams.set('storeId', storeId);
    
    const queryString = searchParams.toString();
    return this.request(`/dashboard/stats${queryString ? `?${queryString}` : ''}`);
  }
}

export const apiClient = new ApiClient();
export { ApiError };