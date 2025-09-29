import { getClientApiBaseUrl } from '@/lib/backend-api';

const API_BASE_URL = getClientApiBaseUrl();

// Debug logging
console.log('API_BASE_URL (resolved):', API_BASE_URL || '[relative]');
console.log('NEXT_PUBLIC_API_BASE env:', process.env['NEXT_PUBLIC_API_BASE']);

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
    // Use relative URL for Next.js API routes
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint;
    
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
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Stores endpoints
  async getStores(params?: { page?: number; limit?: number; search?: string }) {
    const searchParams = new URLSearchParams();
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    searchParams.set('page', page.toString());
    searchParams.set('limit', limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    
    const queryString = searchParams.toString();
    return this.request(`/api/stores${queryString ? `?${queryString}` : ''}`);
  }

  async getStore(id: string) {
    return this.request(`/api/stores/${id}`);
  }

  async createStore(data: {
    name: string;
    url: string;
    consumerKey: string;
    consumerSecret: string;
    customerId: string;
  }) {
    return this.request('/api/stores', {
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
    return this.request(`/api/stores/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStore(id: string) {
    return this.request(`/api/stores/${id}`, {
      method: 'DELETE',
    });
  }

  async syncStore(id: string) {
    return this.request(`/api/stores/${id}/sync`, {
      method: 'POST',
    });
  }

  async testStoreConnection(id: string) {
    return this.request(`/api/stores/${id}/test-connection`, {
      method: 'POST',
    });
  }

  async getStoreStatus(id: string) {
    return this.request(`/api/stores/${id}/status`);
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
    return this.request(`/api/orders${queryString ? `?${queryString}` : ''}`);
  }

  async getOrder(id: string) {
    return this.request(`/api/orders/${id}`);
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request(`/api/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async updateOrderShipping(id: string, data: {
    trackingNumber?: string;
    carrier?: string;
    status?: string;
  }) {
    return this.request(`/api/orders/${id}/shipping`, {
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
    category?: string;
  }) {
    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.search) searchParams.set('search', params.search);
      if (params?.storeId) searchParams.set('storeId', params.storeId);
      if (params?.category) searchParams.set('category', params.category);
      
      const queryString = searchParams.toString();
      return await this.request(`/api/products${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      console.error('getProducts error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Failed to fetch products',
        500,
        'Internal Server Error'
      );
    }
  }

  async getProduct(id: string) {
    return this.request(`/api/products/${id}`);
  }

  async getProductSales(id: string) {
    return this.request(`/api/products/${id}/sales`);
  }

  async createProduct(data: {
    name: string;
    description?: string;
    price: number;
    salePrice?: number;
    sku: string;
    stockQuantity: number;
    category?: string;
    images?: string[];
    storeId: string;
    // Bundle product fields
    productType?: 'simple' | 'variable' | 'bundle' | 'grouped' | 'external';
    isBundle?: boolean;
    bundleItems?: Array<{
      productId: string;
      quantity: number;
      isOptional?: boolean;
      minQuantity?: number;
      maxQuantity?: number;
      discount?: number;
      sortOrder?: number;
    }>;
    bundlePricing?: 'fixed' | 'dynamic';
    bundleDiscount?: number;
    minBundleItems?: number;
    maxBundleItems?: number;
    bundleStock?: 'parent' | 'children' | 'both';
  }) {
    return this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, data: {
    name?: string;
    description?: string;
    price?: number;
    salePrice?: number;
    sku?: string;
    stockQuantity?: number;
    category?: string;
    images?: string[];
    status?: string;
    // Bundle product fields
    productType?: 'simple' | 'variable' | 'bundle' | 'grouped' | 'external';
    isBundle?: boolean;
    bundleItems?: Array<{
      productId: string;
      quantity: number;
      isOptional?: boolean;
      minQuantity?: number;
      maxQuantity?: number;
      discount?: number;
      sortOrder?: number;
    }>;
    bundlePricing?: 'fixed' | 'dynamic';
    bundleDiscount?: number;
    minBundleItems?: number;
    maxBundleItems?: number;
    bundleStock?: 'parent' | 'children' | 'both';
  }) {
    return this.request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: string) {
    return this.request(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkUpdateProducts(data: {
    productIds: string[];
    updates: Record<string, unknown>;
  }) {
    return this.request('/api/products/bulk-update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Bundle Product endpoints
  async getBundleItems(bundleId: string) {
    return this.request(`/api/products/${bundleId}/bundle-items`);
  }

  async addBundleItem(bundleId: string, data: {
    productId: string;
    quantity: number;
    isOptional?: boolean;
    minQuantity?: number;
    maxQuantity?: number;
    discount?: number;
    sortOrder?: number;
  }) {
    return this.request(`/api/products/${bundleId}/bundle-items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBundleItem(bundleId: string, productId: string, data: {
    quantity?: number;
    isOptional?: boolean;
    minQuantity?: number;
    maxQuantity?: number;
    discount?: number;
    sortOrder?: number;
  }) {
    return this.request(`/api/products/${bundleId}/bundle-items/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async removeBundleItem(bundleId: string, productId: string) {
    return this.request(`/api/products/${bundleId}/bundle-items/${productId}`, {
      method: 'DELETE',
    });
  }

  async calculateBundlePrice(bundleId: string, data: {
    items: Array<{
      productId: string;
      quantity: number;
    }>;
  }) {
    return this.request(`/api/products/${bundleId}/calculate-bundle-price`, {
      method: 'POST',
      body: JSON.stringify(data),
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
    return this.request(`/api/customers${queryString ? `?${queryString}` : ''}`);
  }

  async getCustomer(id: string) {
    return this.request(`/api/customers/${id}`);
  }

  async createCustomer(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    storeId: string;
  }) {
    return this.request('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }) {
    return this.request(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/api/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Inventory endpoints
  async getInventory(params?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    storeId?: string;
    lowStock?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.storeId) searchParams.set('storeId', params.storeId);
    if (params?.lowStock) searchParams.set('lowStock', params.lowStock.toString());
    
    const queryString = searchParams.toString();
    return this.request(`/api/inventory/stock-levels${queryString ? `?${queryString}` : ''}`);
  }

    async updateInventory(id: string, data: {
    quantity: number;
    reason?: string;
  }) {
    return this.request('/api/inventory/stock-update', {
      method: 'POST',
      body: JSON.stringify({
        productId: id,
        newQuantity: data.quantity,
        reason: data.reason,
      }),
    });
  }

  async getInventoryApprovals(params?: { 
    page?: number; 
    limit?: number; 
    status?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    
    const queryString = searchParams.toString();
    return this.request(`/api/inventory/approvals${queryString ? `?${queryString}` : ''}`);
  }

  async approveInventoryChange(id: string) {
    return this.request(`/api/inventory/approvals/${id}/approve`, {
      method: 'PUT',
    });
  }

  async rejectInventoryChange(id: string, reason: string) {
    return this.request(`/api/inventory/approvals/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  async requestInventoryChange(data: {
    productId: string;
    newQuantity: number;
    reason: string;
  }) {
    return this.request('/api/inventory/stock-update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Returns endpoints
  async getReturns(params?: { 
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
    return this.request(`/api/returns${queryString ? `?${queryString}` : ''}`);
  }

  async getReturn(id: string) {
    return this.request(`/api/returns/${id}`);
  }

  async createReturn(data: {
    orderId: string;
    productId: string;
    quantity: number;
    reason: string;
    description?: string;
    storeId: string;
  }) {
    return this.request('/api/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReturnStatus(id: string, status: string) {
    return this.request(`/api/returns/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Support endpoints
  async getSupportTickets(params?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    status?: string;
    priority?: string;
    storeId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);
    if (params?.storeId) searchParams.set('storeId', params.storeId);
    
    const queryString = searchParams.toString();
    return this.request(`/api/support/tickets${queryString ? `?${queryString}` : ''}`);
  }

  async getSupportTicket(id: string) {
    return this.request(`/api/support/tickets/${id}`);
  }

  async createSupportTicket(data: {
    subject: string;
    description: string;
    priority?: string;
    storeId?: string;
  }) {
    return this.request('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSupportTicket(id: string, data: {
    status?: string;
    priority?: string;
    assignedTo?: string;
  }) {
    return this.request(`/api/support/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getSupportTicketMessages(ticketId: string) {
    return this.request(`/api/support/tickets/${ticketId}/messages`);
  }

  async sendSupportMessage(ticketId: string, message: string, attachments?: File[]) {
    return this.request(`/api/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        attachments: attachments?.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      }),
    });
  }


  // File upload endpoints
  async getFiles(params: { page?: number; limit?: number; search?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    
    const queryString = searchParams.toString();
    return this.request(`/api/file-upload/files${queryString ? `?${queryString}` : ''}`);
  }

  async getFile(id: string) {
    return this.request(`/api/file-upload/files/${id}`);
  }

  async deleteFile(id: string) {
    return this.request(`/api/file-upload/files/${id}`, {
      method: 'DELETE',
    });
  }

  async getFileDownloadUrl(id: string, expiresIn: number = 3600) {
    const searchParams = new URLSearchParams();
    searchParams.set('expiresIn', expiresIn.toString());
    
    return this.request(`/api/file-upload/files/${id}/download-url?${searchParams.toString()}`);
  }

  // Cart endpoints
  async getCart(storeId: string) {
    return this.request(`/api/orders/cart/${storeId}`);
  }

  async getCartSummary(storeId: string) {
    return this.request(`/api/orders/cart/${storeId}/summary`);
  }

  async addToCart(storeId: string, data: { productId: string; quantity: number }) {
    return this.request(`/api/orders/cart/${storeId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCartItem(storeId: string, productId: string, data: { quantity: number }) {
    return this.request(`/api/orders/cart/${storeId}/items/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async removeFromCart(storeId: string, productId: string) {
    return this.request(`/api/orders/cart/${storeId}/items/${productId}`, {
      method: 'DELETE',
    });
  }

  async clearCart(storeId: string) {
    return this.request(`/api/orders/cart/${storeId}`, {
      method: 'DELETE',
    });
  }

  // Customer order creation
  async createCustomerOrder(data: any) {
    return this.request('/api/orders/customer', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Order approvals
  async getPendingApprovals() {
    return this.request('/api/orders/pending-approvals');
  }

  async approveOrder(id: string, data: { notes?: string }) {
    return this.request(`/api/orders/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async rejectOrder(id: string, data: { reason: string; notes?: string }) {
    return this.request(`/api/orders/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Shipping endpoints
  async getShippingZones(includeInactive = false) {
    const searchParams = new URLSearchParams();
    if (includeInactive) searchParams.set('includeInactive', 'true');
    const queryString = searchParams.toString();
    return this.request(`/api/shipping/zones${queryString ? `?${queryString}` : ''}`);
  }

  async getShippingPrices(zoneId?: string) {
    const searchParams = new URLSearchParams();
    if (zoneId) searchParams.set('zoneId', zoneId);
    const queryString = searchParams.toString();
    return this.request(`/api/shipping/prices${queryString ? `?${queryString}` : ''}`);
  }

  async getShippingOptions(customerId?: string) {
    const searchParams = new URLSearchParams();
    if (customerId) searchParams.set('customerId', customerId);
    const queryString = searchParams.toString();
    return this.request(`/api/shipping/options${queryString ? `?${queryString}` : ''}`);
  }

  async getCustomerShippingPrices(customerId?: string) {
    const searchParams = new URLSearchParams();
    if (customerId) searchParams.set('customerId', customerId);
    const queryString = searchParams.toString();
    return this.request(`/api/shipping/customer-prices${queryString ? `?${queryString}` : ''}`);
  }

  async calculateShipping(data: { zoneId: string; customerId?: string; orderTotal: number }) {
    return this.request('/api/shipping/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Shipping zone CRUD
  async createShippingZone(data: any) {
    return this.request('/api/shipping/zones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateShippingZone(id: string, data: any) {
    return this.request(`/api/shipping/zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteShippingZone(id: string) {
    return this.request(`/api/shipping/zones/${id}`, {
      method: 'DELETE',
    });
  }

  // Shipping price CRUD
  async createShippingPrice(data: any) {
    return this.request('/api/shipping/prices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateShippingPrice(id: string, data: any) {
    return this.request(`/api/shipping/prices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteShippingPrice(id: string) {
    return this.request(`/api/shipping/prices/${id}`, {
      method: 'DELETE',
    });
  }

  // Customer shipping price CRUD
  async createCustomerShippingPrice(data: any) {
    return this.request('/api/shipping/customer-prices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomerShippingPrice(id: string, data: any) {
    return this.request(`/api/shipping/customer-prices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomerShippingPrice(id: string) {
    return this.request(`/api/shipping/customer-prices/${id}`, {
      method: 'DELETE',
    });
  }

  // Inventory request endpoints
  async getInventoryRequests(params?: any) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`/api/inventory-requests${queryString ? `?${queryString}` : ''}`);
  }

  async getInventoryRequest(id: string) {
    return this.request(`/api/inventory-requests/${id}`);
  }

  async createInventoryRequest(data: any) {
    return this.request('/api/inventory-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInventoryRequest(id: string, data: any) {
    return this.request(`/api/inventory-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInventoryRequest(id: string) {
    return this.request(`/api/inventory-requests/${id}`, {
      method: 'DELETE',
    });
  }

  async getInventoryRequestStats() {
    return this.request('/api/inventory-requests/stats');
  }

  // Fulfillment billing endpoints
  async getFulfillmentServices(includeInactive = false) {
    const searchParams = new URLSearchParams();
    if (includeInactive) searchParams.set('includeInactive', 'true');
    const queryString = searchParams.toString();
    return this.request(`/api/fulfillment-billing/services${queryString ? `?${queryString}` : ''}`);
  }

  async createFulfillmentService(data: any) {
    return this.request('/api/fulfillment-billing/services', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFulfillmentService(id: string, data: any) {
    return this.request(`/api/fulfillment-billing/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFulfillmentService(id: string) {
    return this.request(`/api/fulfillment-billing/services/${id}`, {
      method: 'DELETE',
    });
  }

  async getFulfillmentBillingItems(params?: any) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`/api/fulfillment-billing/billing-items${queryString ? `?${queryString}` : ''}`);
  }

  async getFulfillmentBillingItem(id: string) {
    return this.request(`/api/fulfillment-billing/billing-items/${id}`);
  }

  async createFulfillmentBillingItem(data: any) {
    return this.request('/api/fulfillment-billing/billing-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFulfillmentBillingItem(id: string, data: any) {
    return this.request(`/api/fulfillment-billing/billing-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFulfillmentBillingItem(id: string) {
    return this.request(`/api/fulfillment-billing/billing-items/${id}`, {
      method: 'DELETE',
    });
  }

  async getFulfillmentInvoices(params?: any) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`/api/fulfillment-billing/invoices${queryString ? `?${queryString}` : ''}`);
  }

  async getFulfillmentInvoice(id: string) {
    return this.request(`/api/fulfillment-billing/invoices/${id}`);
  }

  async generateMonthlyInvoice(data: any) {
    return this.request('/api/fulfillment-billing/invoices/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFulfillmentInvoice(id: string, data: any) {
    return this.request(`/api/fulfillment-billing/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getFulfillmentBillingStats(customerId?: string) {
    const searchParams = new URLSearchParams();
    if (customerId) searchParams.set('customerId', customerId);
    const queryString = searchParams.toString();
    return this.request(`/api/fulfillment-billing/stats${queryString ? `?${queryString}` : ''}`);
  }

  // Reports endpoints
  async getDashboardStats(storeId?: string) {
    const searchParams = new URLSearchParams();
    if (storeId) searchParams.set('storeId', storeId);
    const queryString = searchParams.toString();
    return this.request(`/api/reports/dashboard${queryString ? `?${queryString}` : ''}`);
  }

  async getSalesReport(params?: {
    startDate?: string;
    endDate?: string;
    storeId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`/api/reports/sales${queryString ? `?${queryString}` : ''}`);
  }

  async getProductReport(params?: {
    startDate?: string;
    endDate?: string;
    storeId?: string;
    category?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`/api/reports/products${queryString ? `?${queryString}` : ''}`);
  }

  async getCustomerReport(params?: {
    startDate?: string;
    endDate?: string;
    storeId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`/api/reports/customers${queryString ? `?${queryString}` : ''}`);
  }

  async getInventoryReport(params?: {
    storeId?: string;
    category?: string;
    lowStock?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`/api/reports/inventory${queryString ? `?${queryString}` : ''}`);
  }

  async getFinancialReport(params?: {
    startDate?: string;
    endDate?: string;
    storeId?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, value.toString());
        }
      });
    }
    const queryString = searchParams.toString();
    return this.request(`/api/reports/financial${queryString ? `?${queryString}` : ''}`);
  }

  // Store statistics endpoints
  async getStoreStats(storeId: string) {
    return this.request(`/api/stores/${storeId}/stats`);
  }

  async getStoreSyncLogs(storeId: string, params?: { limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const queryString = searchParams.toString();
    return this.request(`/api/stores/${storeId}/sync-logs${queryString ? `?${queryString}` : ''}`);
  }

  // Customer statistics endpoints
  async getCustomerStats(customerId: string) {
    return this.request(`/api/customers/${customerId}/stats`);
  }

  async getCustomerOrders(customerId: string, params?: { limit?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    const queryString = searchParams.toString();
    return this.request(`/api/customers/${customerId}/orders${queryString ? `?${queryString}` : ''}`);
  }

  // Calendar methods
  async getCalendarEvents(params?: { from?: string; to?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    
    const queryString = searchParams.toString();
    return this.request(`/api/calendar/events${queryString ? `?${queryString}` : ''}`);
  }

  async createCalendarEvent(data: {
    title: string;
    description?: string;
    type?: string;
    startDate: string;
    endDate: string;
    allDay?: boolean;
  }) {
    return this.request('/api/calendar/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCalendarEvent(id: string, data: {
    title?: string;
    description?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    allDay?: boolean;
  }) {
    return this.request(`/api/calendar/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCalendarEvent(id: string) {
    return this.request(`/api/calendar/events/${id}`, {
      method: 'DELETE',
    });
  }

  async getBusinessHours() {
    return this.request('/api/calendar/business-hours');
  }

  async setBusinessHours(data: {
    days: Array<{
      day: string;
      startTime?: string;
      endTime?: string;
      isWorkingDay?: boolean;
    }>;
  }) {
    return this.request('/api/calendar/business-hours', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getHolidays() {
    return this.request('/api/calendar/holidays');
  }

  async createHoliday(data: {
    name: string;
    date: string;
    description?: string;
    recurring?: boolean;
  }) {
    return this.request('/api/calendar/holidays', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteHoliday(id: string) {
    return this.request(`/api/calendar/holidays/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
export { ApiError };
