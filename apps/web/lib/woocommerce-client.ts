'use client';

export interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  version?: string;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string | null;
  date_on_sale_to: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: Array<{ id: string; name: string; file: string }>;
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: {
    length: string;
    width: string;
    height: string;
  };
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: Array<{ id: number; name: string; position: number; visible: boolean; variation: boolean; options: string[] }>;
  default_attributes: Array<{ id: number; name: string; option: string }>;
  variations: number[];
  grouped_products: number[];
  menu_order: number;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

export interface WooCommerceOrder {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: string;
  currency: string;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  customer_id: number;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid: string | null;
  date_completed: string | null;
  cart_hash: string;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    tax_class: string;
    subtotal: string;
    subtotal_tax: string;
    total: string;
    total_tax: string;
    taxes: Array<{ id: number; rate_code: string; rate_id: number; label: string; compound: boolean; tax_total: string; shipping_tax_total: string }>;
    meta_data: Array<{ id: number; key: string; value: string }>;
    sku: string;
    price: number;
  }>;
  tax_lines: Array<{ id: number; rate_code: string; rate_id: number; label: string; compound: boolean; tax_total: string; shipping_tax_total: string }>;
  shipping_lines: Array<{ id: number; method_title: string; method_id: string; total: string; total_tax: string; taxes: Array<{ id: number; rate_code: string; rate_id: number; label: string; compound: boolean; tax_total: string; shipping_tax_total: string }> }>;
  fee_lines: Array<{ id: number; name: string; tax_class: string; tax_status: string; total: string; total_tax: string; taxes: Array<{ id: number; rate_code: string; rate_id: number; label: string; compound: boolean; tax_total: string; shipping_tax_total: string }> }>;
  coupon_lines: Array<{ id: number; code: string; discount: string; discount_tax: string }>;
  refunds: Array<{ id: number; reason: string; total: string; total_tax: string }>;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

export interface WooCommerceCustomer {
  id: number;
  date_created: string;
  date_modified: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: Array<{
    id: number;
    key: string;
    value: string;
  }>;
}

export class WooCommerceClient {
  private config: WooCommerceConfig;

  constructor(config: WooCommerceConfig) {
    this.config = {
      version: 'wc/v3',
      ...config,
    };
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.config.consumerKey}:${this.config.consumerSecret}`
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.url}/wp-json/${this.config.version}/${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Products
  async getProducts(params?: Record<string, unknown>): Promise<WooCommerceProduct[]> {
    const queryParams = new URLSearchParams(params as Record<string, string>).toString();
    const endpoint = `products${queryParams ? `?${queryParams}` : ''}`;
    return this.request<WooCommerceProduct[]>(endpoint);
  }

  async getProduct(id: number): Promise<WooCommerceProduct> {
    return this.request<WooCommerceProduct>(`products/${id}`);
  }

  async updateProduct(id: number, data: Partial<WooCommerceProduct>): Promise<WooCommerceProduct> {
    return this.request<WooCommerceProduct>(`products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createProduct(data: Partial<WooCommerceProduct>): Promise<WooCommerceProduct> {
    return this.request<WooCommerceProduct>('products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Orders
  async getOrders(params?: Record<string, unknown>): Promise<WooCommerceOrder[]> {
    const queryParams = new URLSearchParams(params as Record<string, string>).toString();
    const endpoint = `orders${queryParams ? `?${queryParams}` : ''}`;
    return this.request<WooCommerceOrder[]>(endpoint);
  }

  async getOrder(id: number): Promise<WooCommerceOrder> {
    return this.request<WooCommerceOrder>(`orders/${id}`);
  }

  async updateOrder(id: number, data: Partial<WooCommerceOrder>): Promise<WooCommerceOrder> {
    return this.request<WooCommerceOrder>(`orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Customers
  async getCustomers(params?: Record<string, unknown>): Promise<WooCommerceCustomer[]> {
    const queryParams = new URLSearchParams(params as Record<string, string>).toString();
    const endpoint = `customers${queryParams ? `?${queryParams}` : ''}`;
    return this.request<WooCommerceCustomer[]>(endpoint);
  }

  async getCustomer(id: number): Promise<WooCommerceCustomer> {
    return this.request<WooCommerceCustomer>(`customers/${id}`);
  }

  async updateCustomer(id: number, data: Partial<WooCommerceCustomer>): Promise<WooCommerceCustomer> {
    return this.request<WooCommerceCustomer>(`customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('system_status');
      return true;
    } catch {
      return false;
    }
  }
}