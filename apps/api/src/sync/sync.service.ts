import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../cache/cache.service';
import { EncryptionService } from '../crypto';
import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private redis: Redis;
  private encryptionService: EncryptionService;
  private syncQueue: Queue;
  private readonly queueName = 'fx-jobs';

  constructor(
    private prisma: PrismaService,
    private _cache: CacheService,
  ) {
    this.redis = new Redis(process.env['REDIS_URL'] || 'redis://valkey:6379/0');
    // BaseLinker removed
    this.encryptionService = new EncryptionService(
      process.env['ENCRYPTION_KEY'] || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    );
    
    // Initialize sync queue
    this.syncQueue = new Queue(this.queueName, {
      connection: this.redis as any,
    });
  }

  async syncOrdersForAccount(accountId: string) {
    this.logger.log(`Starting order sync for account ${accountId}`);

    try {
      // Get account details
      // Placeholder: account retrieval removed with BaseLinker; use WooStore in new flows
      const account: any = null;

      // No-op if account concept not applicable

      // Decrypt token
      // const token = '';

      // Get sync state
      const syncState = await this.getSyncState(accountId, 'orders');
      const lastSyncDate = (syncState?.checkpoint && (syncState.checkpoint as any).lastDate)
        ? new Date((syncState!.checkpoint as any).lastDate)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Source system removed. Placeholder for Woo import.
      // const params = {
      //   date_confirmed_from: Math.floor(lastSyncDate.getTime() / 1000),
      //   get_unconfirmed_orders: false,
      // };

      const orders: any[] = [];

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
      await this.updateSyncState(accountId, 'orders', null, 'failed', (error as any).message);
      throw error;
    }
  }

  private async processOrder(remoteOrder: any, account: any) {
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
        const customer = await this.prisma.customer.upsert({
          where: {
            tenantId_emailNormalized: {
              tenantId,
              emailNormalized: remoteOrder.email.toLowerCase(),
            },
          },
          update: {
            name: remoteOrder.delivery_fullname || remoteOrder.invoice_fullname,
            phoneE164: remoteOrder.phone,
          },
          create: {
            tenantId,
            email: remoteOrder.email,
            emailNormalized: remoteOrder.email.toLowerCase(),
            name: remoteOrder.delivery_fullname || remoteOrder.invoice_fullname,
            phoneE164: remoteOrder.phone,
            company: remoteOrder.invoice_company,
            addressLine1: remoteOrder.delivery_address,
            city: remoteOrder.delivery_city,
            postalCode: remoteOrder.delivery_postcode,
            country: remoteOrder.delivery_country_code,
          },
        });
        customerId = customer.id;
      }

      const orderData = {
        tenantId,
        customerId,
        externalOrderNo: remoteOrder.external_order_id,
        orderSource: remoteOrder.order_source,
        status: this.mapOrderStatus(remoteOrder.order_status_id),
        mappedStatus: remoteOrder.order_status_id,
        total: parseFloat(remoteOrder.payment_done || 0),
        currency: remoteOrder.currency,
        customerEmail: remoteOrder.email,
        customerPhone: remoteOrder.phone,
        shippingAddress: {
          fullName: remoteOrder.delivery_fullname,
          company: remoteOrder.delivery_company,
          address: remoteOrder.delivery_address,
          city: remoteOrder.delivery_city,
          postcode: remoteOrder.delivery_postcode,
          country: remoteOrder.delivery_country_code,
        },
        billingAddress: {
          fullName: remoteOrder.invoice_fullname,
          company: remoteOrder.invoice_company,
          address: remoteOrder.invoice_address,
          city: remoteOrder.invoice_city,
          postcode: remoteOrder.invoice_postcode,
          country: remoteOrder.invoice_country_code,
          nip: remoteOrder.invoice_nip,
        },
        paymentMethod: remoteOrder.payment_method,
        confirmedAt: new Date(remoteOrder.date_confirmed * 1000),
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
          data: orderData,
        });

        // Process order items
        if (remoteOrder.products && Array.isArray(remoteOrder.products)) {
          for (const product of remoteOrder.products) {
            await this.prisma.orderItem.create({
              data: {
                orderId: order.id,
                sku: product.sku || product.product_id,
                name: product.name,
                qty: parseInt(product.quantity),
                price: parseFloat(product.price_brutto),
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process remote order:`, error);
    }
  }

  private async determineOwnership(remoteOrder: any, account: any): Promise<string | null> {
    // If account has direct tenant assignment
    if (account && account.tenantId) {
      return account.tenantId;
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
      if (this.matchesRule(remoteOrder, rule.conditionsJson)) {
        return rule.tenantId;
      }
    }

    return null;
  }

  private matchesRule(order: any, conditions: any): boolean {
    if (!conditions || !conditions.conditions) return false;

    for (const condition of conditions.conditions) {
      const fieldValue = this.getFieldValue(order, condition.field);
      
      switch (condition.op) {
        case 'equals':
          if (fieldValue !== condition.value) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(fieldValue)) return false;
          break;
        case 'contains':
          if (!String(fieldValue).includes(condition.value)) return false;
          break;
        case 'startsWith':
          if (!String(fieldValue).startsWith(condition.value)) return false;
          break;
        default:
          return false;
      }
    }

    return true;
  }

  private getFieldValue(order: any, field: string): any {
    const parts = field.split('.');
    let value = order;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
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

  private _decryptToken(encryptedToken: Buffer | Uint8Array): string {
    try {
      const raw = Buffer.isBuffer(encryptedToken)
        ? encryptedToken
        : Buffer.from(encryptedToken as Uint8Array);
      const payload = JSON.parse(raw.toString());
      return this.encryptionService.decrypt(payload);
    } catch (error) {
      this.logger.error('Failed to decrypt token:', error);
      throw new Error('Invalid token encryption');
    }
  }

  private async getSyncState(accountId: string, entityType: string) {
    return this.prisma.syncState.findUnique({
      where: {
        accountId_entityType: {
          accountId,
          entityType,
        },
      },
    });
  }

  private async updateSyncState(
    accountId: string,
    entityType: string,
    checkpoint: any,
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
        checkpoint,
        status,
        error,
      },
      create: {
        accountId,
        entityType,
        lastSyncAt: new Date(),
        checkpoint,
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