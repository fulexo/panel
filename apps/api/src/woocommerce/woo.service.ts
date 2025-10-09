import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { toPrismaJsonValue } from '../common/utils/prisma-json.util';
import { Prisma } from '@prisma/client';
import { Decimal } from 'decimal.js';
import * as crypto from 'crypto';

function buildAuthHeader(ck: string, cs: string){
  const token = Buffer.from(`${ck}:${cs}`).toString('base64');
  return `Basic ${token}`;
}

export interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
  apiVersion?: string;
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
  // Bundle product specific fields
  bundle_items?: Array<{
    id: number;
    product_id: number;
    quantity: number;
    optional: boolean;
    min_quantity?: number;
    max_quantity?: number;
    discount?: number;
    sort_order?: number;
  }>;
  bundle_pricing?: string;
  bundle_discount?: number;
  min_bundle_items?: number;
  max_bundle_items?: number;
  bundle_stock?: string;
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

@Injectable()
export class WooCommerceService {
  constructor(private prisma: PrismaService) {}


  // New methods for the updated stores system
  async testConnection(config: WooCommerceConfig): Promise<{ success: boolean; message: string; error?: string }> {
    const urlFormats = [
      `${config.url.replace(/\/$/, '')}/wp-json/wc/v3/system_status`,
      `${config.url.replace(/\/$/, '')}/index.php?rest_route=/wc/v3/system_status`,
      `${config.url.replace(/\/$/, '')}/wp-json/wc/v2/system_status`,
      `${config.url.replace(/\/$/, '')}/index.php?rest_route=/wc/v2/system_status`
    ];

    for (const url of urlFormats) {
      try {
        console.log(`Testing URL: ${url}`);
        const response = await fetch(url, {
          headers: {
            'Authorization': buildAuthHeader(config.consumerKey, config.consumerSecret),
            'Content-Type': 'application/json',
          },
        });

        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Connection successful, response:', data);
          return { success: true, message: `Connection successful using ${url}` };
        } else if (response.status === 401) {
          const errorText = await response.text();
          console.log(`401 Error for ${url}:`, errorText);
          // Try next URL format for 401 errors
          continue;
        } else {
          const errorText = await response.text();
          console.log(`Error ${response.status} for ${url}:`, errorText);
          return { 
            success: false, 
            message: 'Connection failed', 
            error: `HTTP ${response.status}: ${response.statusText} - ${errorText}` 
          };
        }
      } catch (error) {
        console.log(`Network error for ${url}:`, error);
        // Try next URL format for network errors
        continue;
      }
    }

    return { 
      success: false, 
      message: 'Connection failed', 
      error: 'All URL formats failed - WooCommerce REST API may not be enabled or API keys are invalid' 
    };
  }

  async syncStore(store: { id: string; url: string; consumerKey: string; consumerSecret: string }, tenantId: string): Promise<{ success: boolean; message: string; syncedItems: { products: number; orders: number; customers: number } }> {
    try {
      const config: WooCommerceConfig = {
        url: store.url,
        consumerKey: store.consumerKey,
        consumerSecret: store.consumerSecret,
      };

      // Sync products
      const products = await this.syncProducts(config, store.id, tenantId);
      
      // Sync orders
      const orders = await this.syncOrders(config, store.id, tenantId);
      
      // Sync customers
      const customers = await this.syncCustomers(config, store.id, tenantId);

      return {
        success: true,
        message: 'Sync completed successfully',
        syncedItems: {
          products: products.length,
          orders: orders.length,
          customers: customers.length,
        },
      };
        } catch {
      return {
        success: false,
        message: 'Sync failed',
        syncedItems: { products: 0, orders: 0, customers: 0 },
      };
    }
  }

  private async syncProducts(config: WooCommerceConfig, storeId: string, tenantId: string): Promise<WooCommerceProduct[]> {
    const products: WooCommerceProduct[] = [];
    let page = 1;
    const perPage = 100;

    console.log(`Starting products sync for store ${storeId}`);
    
    // Try different URL formats for products
    const urlFormats = [
      `${config.url.replace(/\/$/, '')}/wp-json/wc/v3/products`,
      `${config.url.replace(/\/$/, '')}/index.php?rest_route=/wc/v3/products`,
      `${config.url.replace(/\/$/, '')}/wp-json/wc/v2/products`,
      `${config.url.replace(/\/$/, '')}/index.php?rest_route=/wc/v2/products`
    ];

    let workingUrl = '';
    for (const baseUrl of urlFormats) {
      try {
        const testUrl = `${baseUrl}?page=1&per_page=1`;
        console.log(`Testing products URL: ${testUrl}`);
        const response = await fetch(testUrl, {
          headers: {
            'Authorization': buildAuthHeader(config.consumerKey, config.consumerSecret),
            'Content-Type': 'application/json',
          },
        });

        console.log(`Products test response status: ${response.status}`);
        
        if (response.ok) {
          workingUrl = baseUrl;
          console.log(`Working products URL found: ${baseUrl}`);
          break;
        }
      } catch (error) {
        console.log(`Products URL test failed: ${error}`);
        continue;
      }
    }

    if (!workingUrl) {
      console.log('No working products URL found');
      return products;
    }
    
    while (true) {
      const url = `${workingUrl}?page=${page}&per_page=${perPage}`;
      console.log(`Fetching products from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': buildAuthHeader(config.consumerKey, config.consumerSecret),
          'Content-Type': 'application/json',
        },
      });

      console.log(`Products response status: ${response.status}`);
      
      if (!response.ok) {
        console.log(`Products fetch failed: ${response.status} ${response.statusText}`);
        break;
      }

      const data = await response.json();
      if (data.length === 0) break;

      products.push(...data);
      page++;
    }

    // Store products in database
    for (const product of products) {
      const isBundle = product.type === 'bundle' || product.type === 'woosb';
      
      await this.prisma.product.upsert({
        where: { 
          wooId_storeId: { 
            wooId: product.id.toString(), 
            storeId 
          } 
        },
        update: {
          name: product.name,
          sku: product.sku,
          price: parseFloat(product.price) || 0,
          regularPrice: parseFloat(product.regular_price) || 0,
          salePrice: parseFloat(product.sale_price) || null,
          stockQuantity: product.stock_quantity,
          stockStatus: product.stock_status,
          status: product.status,
          description: product.description,
          shortDescription: product.short_description,
          images: product.images.map(img => img.src),
          categories: product.categories.map(cat => cat.name),
          tags: product.tags.map(tag => tag.name),
          metaData: product.meta_data,
          // Bundle product fields
          productType: product.type,
          isBundle: isBundle,
          bundleItems: product.bundle_items ? toPrismaJsonValue(product.bundle_items) : undefined,
          bundlePricing: product.bundle_pricing || 'fixed',
          bundleDiscount: product.bundle_discount !== undefined ? new Decimal(product.bundle_discount) : null,
          minBundleItems: product.min_bundle_items,
          maxBundleItems: product.max_bundle_items,
          bundleStock: product.bundle_stock || 'parent',
          lastSyncedAt: new Date(),
        },
        create: {
          tenantId,
          wooId: product.id.toString(),
          storeId,
          name: product.name,
          sku: product.sku,
          price: parseFloat(product.price) || 0,
          regularPrice: parseFloat(product.regular_price) || 0,
          salePrice: parseFloat(product.sale_price) || null,
          stockQuantity: product.stock_quantity,
          stockStatus: product.stock_status,
          status: product.status,
          description: product.description,
          shortDescription: product.short_description,
          images: product.images.map(img => img.src),
          categories: product.categories.map(cat => cat.name),
          tags: product.tags.map(tag => tag.name),
          metaData: product.meta_data,
          // Bundle product fields
          productType: product.type,
          isBundle: isBundle,
          bundleItems: product.bundle_items ? toPrismaJsonValue(product.bundle_items) : undefined,
          bundlePricing: product.bundle_pricing || 'fixed',
          bundleDiscount: product.bundle_discount !== undefined ? new Decimal(product.bundle_discount) : null,
          minBundleItems: product.min_bundle_items,
          maxBundleItems: product.max_bundle_items,
          bundleStock: product.bundle_stock || 'parent',
          lastSyncedAt: new Date(),
        },
      });

      // If this is a bundle product, sync bundle items
      if (isBundle && product.bundle_items && product.bundle_items.length > 0) {
        await this.syncBundleItems(tenantId, product.id.toString(), storeId, product.bundle_items);
      }
    }

    return products;
  }

  private async syncOrders(config: WooCommerceConfig, wooStoreId: string, tenantId: string): Promise<WooCommerceOrder[]> {
    const orders: WooCommerceOrder[] = [];
    let page = 1;
    const perPage = 100;

    // Find the corresponding Store ID from WooStore ID
    const wooStore = await this.prisma.wooStore.findUnique({
      where: { id: wooStoreId }
    });

    if (!wooStore) {
      throw new Error('WooStore not found');
    }

    // Find the corresponding Store record
    const store = await this.prisma.store.findFirst({
      where: { url: wooStore.baseUrl }
    });

    if (!store) {
      throw new Error('Corresponding Store not found for WooStore');
    }

    const storeId = store.id;

    // Try different URL formats for orders
    const urlFormats = [
      `${config.url.replace(/\/$/, '')}/wp-json/wc/v3/orders`,
      `${config.url.replace(/\/$/, '')}/index.php?rest_route=/wc/v3/orders`,
      `${config.url.replace(/\/$/, '')}/wp-json/wc/v2/orders`,
      `${config.url.replace(/\/$/, '')}/index.php?rest_route=/wc/v2/orders`
    ];

    let workingUrl = '';
    for (const baseUrl of urlFormats) {
      try {
        const testUrl = `${baseUrl}?page=1&per_page=1`;
        const response = await fetch(testUrl, {
          headers: {
            'Authorization': buildAuthHeader(config.consumerKey, config.consumerSecret),
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          workingUrl = baseUrl;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!workingUrl) {
      throw new Error('No working WooCommerce API URL found for orders');
    }

    while (true) {
      const url = `${workingUrl}?page=${page}&per_page=${perPage}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': buildAuthHeader(config.consumerKey, config.consumerSecret),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) break;

      const data = await response.json();
      if (data.length === 0) break;

      orders.push(...data);
      page++;
    }

    // Store orders in database
    for (const order of orders) {
      const orderRecord = await this.prisma.order.upsert({
        where: { 
          wooId_storeId: { 
            wooId: order.id.toString(), 
            storeId 
          } 
        },
        update: {
          orderNumber: order.number,
          status: order.status,
          currency: order.currency,
          total: parseFloat(order.total) || 0,
          customerId: null, // Set to null to avoid foreign key constraint issues
          customerEmail: order.billing?.email || order.customer_id?.toString(),
          customerPhone: order.billing?.phone,
          billingInfo: order.billing,
          shippingInfo: order.shipping,
          lineItems: order.line_items,
          paymentMethod: order.payment_method,
          paymentMethodTitle: order.payment_method_title,
          transactionId: order.transaction_id,
          datePaid: order.date_paid ? new Date(order.date_paid) : null,
          dateCompleted: order.date_completed ? new Date(order.date_completed) : null,
          metaData: order.meta_data,
          lastSyncedAt: new Date(),
        },
        create: {
          tenantId,
          wooId: order.id.toString(),
          storeId,
          orderNumber: order.number,
          status: order.status,
          currency: order.currency,
          total: parseFloat(order.total) || 0,
          customerId: null, // Set to null to avoid foreign key constraint issues
          customerEmail: order.billing?.email || order.customer_id?.toString(),
          customerPhone: order.billing?.phone,
          billingInfo: order.billing,
          shippingInfo: order.shipping,
          lineItems: order.line_items,
          paymentMethod: order.payment_method,
          paymentMethodTitle: order.payment_method_title,
          transactionId: order.transaction_id,
          datePaid: order.date_paid ? new Date(order.date_paid) : null,
          dateCompleted: order.date_completed ? new Date(order.date_completed) : null,
          metaData: order.meta_data,
          lastSyncedAt: new Date(),
        },
      });

      // Sync order items
      if (order.line_items && order.line_items.length > 0) {
        // Delete existing items first
        await this.prisma.orderItem.deleteMany({
          where: { orderId: orderRecord.id }
        });

        // Create new items
        for (const item of order.line_items) {
          await this.prisma.orderItem.create({
            data: {
              orderId: orderRecord.id,
              sku: item.sku,
              name: item.name,
              qty: Number(item.quantity),
              price: new Decimal(item.price || '0'),
            },
          });
        }
      }
    }

    return orders;
  }

  private async syncCustomers(config: WooCommerceConfig, wooStoreId: string, tenantId: string): Promise<WooCommerceCustomer[]> {
    const customers: WooCommerceCustomer[] = [];
    let page = 1;
    const perPage = 100;

    // Find the corresponding Store ID from WooStore ID
    const wooStore = await this.prisma.wooStore.findUnique({
      where: { id: wooStoreId }
    });

    if (!wooStore) {
      throw new Error('WooStore not found');
    }

    // Find the corresponding Store record
    const store = await this.prisma.store.findFirst({
      where: { url: wooStore.baseUrl }
    });

    if (!store) {
      throw new Error('Corresponding Store not found for WooStore');
    }

    const storeId = store.id;

    while (true) {
      const url = `${config.url}/wp-json/wc/v3/customers?page=${page}&per_page=${perPage}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': buildAuthHeader(config.consumerKey, config.consumerSecret),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) break;

      const data = await response.json();
      if (data.length === 0) break;

      customers.push(...data);
      page++;
    }

    // Store customers in database
    for (const customer of customers) {
      await this.prisma.customer.upsert({
        where: { 
          wooId_storeId: { 
            wooId: customer.id.toString(), 
            storeId 
          } 
        },
        update: {
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          username: customer.username,
          role: customer.role,
          billingInfo: customer.billing,
          shippingInfo: customer.shipping,
          isPayingCustomer: customer.is_paying_customer,
          avatarUrl: customer.avatar_url,
          metaData: customer.meta_data,
          lastSyncedAt: new Date(),
        },
        create: {
          tenantId,
          wooId: customer.id.toString(),
          storeId,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          username: customer.username,
          role: customer.role,
          billingInfo: customer.billing,
          shippingInfo: customer.shipping,
          isPayingCustomer: customer.is_paying_customer,
          avatarUrl: customer.avatar_url,
          metaData: customer.meta_data,
          lastSyncedAt: new Date(),
        },
      });
    }

    return customers;
  }

  private async syncBundleItems(tenantId: string, bundleWooId: string, storeId: string, bundleItems: Array<{
    id: number;
    product_id: number;
    quantity: number;
    optional: boolean;
    min_quantity?: number;
    max_quantity?: number;
    discount?: number;
    sort_order?: number;
  }>) {
    // Find the bundle product in our database
    const bundleProduct = await this.prisma.product.findFirst({
      where: { 
        wooId: bundleWooId, 
        storeId, 
        tenantId 
      }
    });

    if (!bundleProduct) {
      // Bundle product not found for WooCommerce ID
      return;
    }

    // Delete existing bundle items
    await this.prisma.bundleProduct.deleteMany({
      where: { 
        bundleId: bundleProduct.id, 
        tenantId 
      }
    });

    // Create new bundle items
    for (const item of bundleItems) {
      // Find the child product by WooCommerce ID
      const childProduct = await this.prisma.product.findFirst({
        where: { 
          wooId: item.product_id.toString(), 
          storeId, 
          tenantId 
        }
      });

      if (childProduct) {
        await this.prisma.bundleProduct.create({
          data: {
            tenantId,
            bundleId: bundleProduct.id,
            productId: childProduct.id,
            quantity: item.quantity || 1,
            isOptional: item.optional || false,
            minQuantity: item.min_quantity,
            maxQuantity: item.max_quantity,
            discount: item.discount !== undefined ? new Decimal(item.discount) : null,
            sortOrder: item.sort_order || 0,
          }
        });
      } else {
        // Child product not found for WooCommerce ID
      }
    }
  }

  async listStores(tenantId: string){
    return this.prisma.withTenant(tenantId, async (tx) => 
      tx.wooStore.findMany({ orderBy: { createdAt: 'desc' } })
    );
  }

  async getStore(tenantId: string, storeId: string){
    return this.prisma.withTenant(tenantId, async (tx) => 
      tx.wooStore.findUnique({ where: { id: storeId } })
    );
  }

  async addStore(tenantId: string, dto: { name: string; baseUrl: string; consumerKey: string; consumerSecret: string; apiVersion?: string; webhookSecret?: string; }){
    return this.prisma.withTenant(tenantId, async (tx) => {
      const store = await tx.wooStore.create({ data: {
        tenant: {
          connect: { id: tenantId }
        },
        name: dto.name,
        baseUrl: dto.baseUrl.replace(/\/$/, ''),
        consumerKey: dto.consumerKey,
        consumerSecret: dto.consumerSecret,
        apiVersion: dto.apiVersion || 'v3',
        webhookSecret: dto.webhookSecret || null,
        active: true,
      }});
      // schedule initial syncs via fx-jobs
      try {
        const { Queue } = await import('bullmq');
        const Redis = (await import('ioredis')).default;
        const connection = new Redis(process.env['REDIS_URL'] || 'redis://valkey:6379/0', { maxRetriesPerRequest: null });
        const q = new Queue('fx-jobs', { connection });
        await q.add('woo-sync-orders', { storeId: store.id });
        await q.add('woo-sync-products', { storeId: store.id });
        await q.close();
        await connection.quit();
      } catch {
        // noop if queue unavailable
      }
      return store;
    });
  }

  async removeStore(tenantId: string, id: string){
    return this.prisma.withTenant(tenantId, async (tx) => {
      const s = await tx.wooStore.findFirst({ where: { id } });
      if(!s) throw new BadRequestException('Store not found');
      await tx.wooStore.delete({ where: { id } });
      return { ok: true };
    });
  }

  async testStoreConnection(tenantId: string, id: string){
    return this.prisma.withTenant(tenantId, async (tx) => {
      const s = await tx.wooStore.findFirst({ where: { id } });
      if(!s) throw new BadRequestException('Store not found');
      const url = `${s.baseUrl}/wp-json/wc/${s.apiVersion}/orders?per_page=1`;
      const r = await fetch(url, { headers: { Authorization: buildAuthHeader(s.consumerKey, s.consumerSecret) } } as RequestInit);
      return { ok: r.ok, status: r.status };
    });
  }

  async registerWebhooks(tenantId: string, id: string){
    return this.prisma.withTenant(tenantId, async (tx) => {
      const s = await tx.wooStore.findFirst({ where: { id } });
      if(!s) throw new BadRequestException('Store not found');
      const topics = [
        'order.created','order.updated','product.created','product.updated','product.deleted'
      ];
      const results: Record<string, unknown>[] = [];
      for(const topic of topics){
        const body = {
          name: `fx-${topic}`,
          topic,
          delivery_url: `https://${process.env['DOMAIN_API'] || 'api.example.com'}/api/woo/webhooks/${id}`,
          secret: s.webhookSecret || undefined,
        };
        const r = await fetch(`${s.baseUrl}/wp-json/wc/${s.apiVersion}/webhooks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: buildAuthHeader(s.consumerKey, s.consumerSecret) },
          body: JSON.stringify(body)
        } as RequestInit);
        results.push({ topic, ok: r.ok, status: r.status });
      }
      return { results };
    });
  }

  private verifySignature(payload: string | Record<string, unknown>, secret?: string, signature?: string){
    if (!secret) return true; // allow if no secret configured
    if (!signature) return false;
    try{
      // Use raw payload string instead of JSON.stringify
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const computed = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('base64');
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(String(signature)));
    }catch{
      return false;
    }
  }

  async handleWebhook(storeId: string, topic: string, signature: string, payload: string | Record<string, unknown>, rawBody?: string){
    const s = await this.prisma.wooStore.findFirst({ where: { id: storeId } });
    if(!s) throw new BadRequestException('Store not found');

    const valid = this.verifySignature(rawBody || payload, s.webhookSecret || undefined, signature);
    await this.prisma.webhookEvent.create({ data: {
      tenantId: s.tenantId,
      storeId: s.id,
      provider: 'woocommerce',
      topic,
      signature: signature || null,
      payload: toPrismaJsonValue(payload) || Prisma.JsonNull,
      status: valid ? 'received' : 'failed',
      error: valid ? null : 'invalid_signature',
    }});
    if(!valid) return;

    // Basic ingest: keep as event; processing workers can pick it up
    // Optionally, do light transforms here
  }
}