import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
// import { CacheService } from '../cache/cache.service';
// import { EncryptionService } from '../crypto';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { toPrismaJsonValue } from '../common/utils/prisma-json.util';

interface RemoteOrder {
  external_order_id?: string;
  email?: string;
  delivery_fullname?: string;
  invoice_fullname?: string;
  phone?: string;
  invoice_company?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_postcode?: string;
  delivery_country_code?: string;
  order_source?: string;
  order_status_id?: number;
  payment_done?: string;
  currency?: string;
  delivery_company?: string;
  invoice_address?: string;
  invoice_city?: string;
  invoice_postcode?: string;
  invoice_country_code?: string;
  invoice_nip?: string;
  payment_method?: string;
  date_confirmed?: number;
  products?: Array<{
    id?: string;
    name?: string;
    sku?: string;
    quantity?: number;
    price?: string;
    total?: string;
  }>;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private redis: Redis;
  // private encryptionService: EncryptionService;
  private syncQueue: Queue;
  private readonly queueName = 'fx-jobs';

  constructor(
    private prisma: PrismaService,
    // private _cache: CacheService,
  ) {
    this.redis = new Redis(process.env['REDIS_URL'] || 'redis://valkey:6379/0');
    // BaseLinker removed
    // this.encryptionService = new EncryptionService(
    //   process.env['ENCRYPTION_KEY'] || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    // );
    
    // Initialize sync queue
    this.syncQueue = new Queue(this.queueName, {
      connection: this.redis as unknown as Record<string, unknown>,
    });
  }

  async syncOrdersForAccount(accountId: string) {
    this.logger.log(`Starting order sync for account ${accountId}`);

    try {
      // Get account details
      // Placeholder: account retrieval removed with BaseLinker; use WooStore in new flows
      const account: Record<string, unknown> | null = null;

      // No-op if account concept not applicable

      // Decrypt token
      // const token = '';

      // Get sync state
      // const syncState = await this.getSyncState(accountId, 'orders');
      // const lastSyncDate = (syncState?.checkpoint && (syncState.checkpoint as Record<string, unknown>).lastDate)
      //   ? new Date((syncState.checkpoint as Record<string, unknown>).lastDate)
      //   : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Source system removed. Placeholder for Woo import.
      // const params = {
      //   date_confirmed_from: Math.floor(lastSyncDate.getTime() / 1000),
      //   get_unconfirmed_orders: false,
      // };

      const orders: Record<string, unknown>[] = [];

      this.logger.log(`Fetched ${orders.length} orders`);

      // Process orders
      for (const remoteOrder of orders) {
        await this.processOrder(remoteOrder, account);
      }

      // Update sync state
      await this.updateSyncState(accountId, 'orders', {
        lastDate: new Date(),
        ordersProcessed: orders.length,
      });

      // Invalidate cache
      // noop invalidate until source is defined

      this.logger.log(`Order sync completed for account ${accountId}`);
    } catch (error) {
      this.logger.error(`Order sync failed for account ${accountId}:`, error);
      await this.updateSyncState(accountId, 'orders', null, 'failed', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async processOrder(remoteOrder: RemoteOrder, account: Record<string, unknown> | null) {
    try {
      // Determine tenant ownership
      const tenantId = await this.determineOwnership(remoteOrder, account);
      if (!tenantId) {
        this.logger.warn(`Could not determine ownership for remote order`);
        return;
      }

      // Check if order exists (by externalOrderNo if available)
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          tenantId,
          externalOrderNo: typeof remoteOrder?.external_order_id === 'string' ? remoteOrder.external_order_id : undefined,
        },
      });

      // Find or create customer
      let customerId = null;
      if (remoteOrder.email) {
        let customer = await this.prisma.customer.findFirst({
          where: {
            email: remoteOrder.email as string,
            tenantId,
          },
        });

        if (customer) {
          customer = await this.prisma.customer.update({
            where: { id: customer.id },
            data: {
              name: (remoteOrder.delivery_fullname || remoteOrder.invoice_fullname) as string | null,
              phoneE164: remoteOrder.phone as string | null,
            },
          });
        } else {
          customer = await this.prisma.customer.create({
            data: {
              tenantId,
              storeId: 'default-store',
              email: remoteOrder.email as string,
              emailNormalized: (remoteOrder.email as string).toLowerCase(),
              name: (remoteOrder.delivery_fullname || remoteOrder.invoice_fullname) as string | null,
              phoneE164: remoteOrder.phone as string | null,
              company: remoteOrder.invoice_company as string | null,
              addressLine1: remoteOrder.delivery_address as string | null,
              city: remoteOrder.delivery_city as string | null,
              postalCode: remoteOrder.delivery_postcode as string | null,
              country: remoteOrder.delivery_country_code as string | null,
            },
          });
        }
        customerId = customer.id;
      }

      const orderData = {
        tenantId,
        customerId,
        externalOrderNo: remoteOrder.external_order_id as string | null,
        orderSource: remoteOrder.order_source as string | null,
        status: this.mapOrderStatus(remoteOrder.order_status_id as number),
        mappedStatus: remoteOrder.order_status_id?.toString() || null,
        total: parseFloat((remoteOrder.payment_done as string) || '0'),
            currency: remoteOrder.currency as string || 'TRY',
        customerEmail: remoteOrder.email as string | null,
        customerPhone: remoteOrder.phone as string | null,
        shippingAddress: {
          fullName: remoteOrder.delivery_fullname as string | null,
          company: remoteOrder.delivery_company as string | null,
          address: remoteOrder.delivery_address as string | null,
          city: remoteOrder.delivery_city as string | null,
          postcode: remoteOrder.delivery_postcode as string | null,
          country: remoteOrder.delivery_country_code as string | null,
        },
        billingAddress: {
          fullName: remoteOrder.invoice_fullname as string | null,
          company: remoteOrder.invoice_company as string | null,
          address: remoteOrder.invoice_address as string | null,
          city: remoteOrder.invoice_city as string | null,
          postcode: remoteOrder.invoice_postcode as string | null,
          country: remoteOrder.invoice_country_code as string | null,
          nip: remoteOrder.invoice_nip as string | null,
        },
        paymentMethod: remoteOrder.payment_method as string | null,
        confirmedAt: new Date((remoteOrder.date_confirmed as number) * 1000),
      };

      if (existingOrder) {
        // Update existing order
        await this.prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            ...orderData,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new order
        const order = await this.prisma.order.create({
          data: {
            ...orderData,
            storeId: 'default-store',
          },
        });

        // Process order items
        if (remoteOrder.products && Array.isArray(remoteOrder.products)) {
          for (const product of remoteOrder.products) {
            await this.prisma.orderItem.create({
              data: {
                orderId: order.id,
                sku: product.sku || product.id,
                name: product.name,
                qty: parseInt(product.quantity?.toString() || '0'),
                price: parseFloat(product.price || '0'),
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process remote order:`, error);
    }
  }

  private async determineOwnership(remoteOrder: RemoteOrder | Record<string, unknown>, account: Record<string, unknown> | null): Promise<string | null> {
    // If account has direct tenant assignment
    if (account && account.tenantId) {
      return account.tenantId as string;
    }

    // Apply ownership rules
    const rules = await this.prisma.ownershipRule.findMany({
      where: {
        entityType: 'order',
        active: true,
      },
      orderBy: { priority: 'asc' },
    });

    for (const rule of rules) {
      if (this.matchesRule(remoteOrder as Record<string, unknown>, rule.conditionsJson as Record<string, unknown>)) {
        return rule.tenantId;
      }
    }

    return null;
  }

  private matchesRule(order: Record<string, unknown>, conditions: Record<string, unknown>): boolean {
    if (!conditions || !conditions.conditions) return false;

    for (const condition of ((conditions.conditions as Record<string, unknown>[]) || [])) {
      const fieldValue = this.getFieldValue(order, condition.field as string);
      
      switch (condition.op) {
        case 'equals':
          if (fieldValue !== condition.value) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(fieldValue)) return false;
          break;
        case 'contains':
          if (!String(fieldValue).includes(condition.value as string)) return false;
          break;
        case 'startsWith':
          if (!String(fieldValue).startsWith(condition.value as string)) return false;
          break;
        default:
          return false;
      }
    }

    return true;
  }

  private getFieldValue(order: Record<string, unknown>, field: string): unknown {
    const parts = field.split('.');
    let value = order;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part] as Record<string, unknown>;
      } else {
        return null;
      }
    }
    
    return value;
  }

  private mapOrderStatus(statusId: number): string {
    // Map external status IDs to internal statuses
    const statusMap: { [key: number]: string } = {
      1: 'pending',
      2: 'processing',
      3: 'ready_for_shipment',
      4: 'waiting_for_shipment',
      5: 'shipped',
      6: 'delivered',
      7: 'cancelled',
      8: 'returned',
    };

    return statusMap[statusId] || 'unknown';
  }

  // private _decryptToken(encryptedToken: Buffer | Uint8Array): string {
  //   try {
  //     const raw = Buffer.isBuffer(encryptedToken)
  //       ? encryptedToken
  //       : Buffer.from(encryptedToken as Uint8Array);
  //     const payload = JSON.parse(raw.toString());
  //     return this.encryptionService.decrypt(payload);
  //   } catch (error) {
  //     this.logger.error('Failed to decrypt token:', error);
  //     throw new Error('Invalid token encryption');
  //   }
  // }

  // private async getSyncState(accountId: string, entityType: string) {
  //   return this.prisma.syncState.findUnique({
  //     where: {
  //       accountId_entityType: {
  //         accountId,
  //         entityType,
  //       },
  //     },
  //   });
  // }

  private async updateSyncState(
    accountId: string,
    entityType: string,
    checkpoint: Record<string, unknown> | null,
    status: string = 'idle',
    error: string | null = null,
  ) {
    await this.prisma.syncState.upsert({
      where: {
        accountId_entityType: {
          accountId,
          entityType,
        },
      },
      update: {
        lastSyncAt: new Date(),
        checkpoint: toPrismaJsonValue(checkpoint),
        status,
        error,
      },
      create: {
        accountId,
        entityType,
        lastSyncAt: new Date(),
        checkpoint: toPrismaJsonValue(checkpoint),
        status,
        error,
      },
    });
  }

  // Schedule sync jobs
  async scheduleSync(accountId: string, entityType: string) {
    await this.syncQueue.add(
      `sync-${entityType}`,
      {
        accountId,
        entityType,
      },
      {
        repeat: {
          pattern: '*/5 * * * *', // Every 5 minutes
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async scheduleSyncForAllAccounts() {
    // Placeholder: iterate Woo stores when implementing Woo sync
    this.logger.log(`Scheduled sync - no accounts configured`);
  }
}