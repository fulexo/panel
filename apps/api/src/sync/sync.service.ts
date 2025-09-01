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
    private cache: CacheService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://valkey:6379/0');
    // BaseLinker removed
    this.encryptionService = new EncryptionService(
      process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
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
      const token = '';

      // Get sync state
      const syncState = await this.getSyncState(accountId, 'orders');
      const lastSyncDate = (syncState?.checkpoint && (syncState.checkpoint as any).lastDate)
        ? new Date((syncState!.checkpoint as any).lastDate)
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Source system removed (BaseLinker). Placeholder for Woo import.
      const params = {
        date_confirmed_from: Math.floor(lastSyncDate.getTime() / 1000),
        get_unconfirmed_orders: false,
      };

      const orders: any[] = [];

      this.logger.log(`Fetched ${orders.length} orders`);

      // Process orders
      for (const blOrder of orders) {
        await this.processOrder(blOrder, account);
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

  private async processOrder(blOrder: any, account: any) {
    try {
      // Determine tenant ownership
      const tenantId = await this.determineOwnership(blOrder, account);
      if (!tenantId) {
        this.logger.warn(`Could not determine ownership for order ${blOrder.order_id}`);
        return;
      }

      // Check if order exists
      const existingOrder = await this.prisma.order.findFirst({
        where: {
          blOrderId: String(blOrder.order_id),
          tenantId,
        },
      });

      // Find or create customer
      let customerId = null;
      if (blOrder.email) {
        const customer = await this.prisma.customer.upsert({
          where: {
            tenantId_emailNormalized: {
              tenantId,
              emailNormalized: blOrder.email.toLowerCase(),
            },
          },
          update: {
            name: blOrder.delivery_fullname || blOrder.invoice_fullname,
            phoneE164: blOrder.phone,
          },
          create: {
            tenantId,
            email: blOrder.email,
            emailNormalized: blOrder.email.toLowerCase(),
            name: blOrder.delivery_fullname || blOrder.invoice_fullname,
            phoneE164: blOrder.phone,
            company: blOrder.invoice_company,
            addressLine1: blOrder.delivery_address,
            city: blOrder.delivery_city,
            postalCode: blOrder.delivery_postcode,
            country: blOrder.delivery_country_code,
          },
        });
        customerId = customer.id;
      }

      const orderData = {
        tenantId,
        customerId,
        
        blOrderId: String(blOrder.order_id),
        externalOrderNo: blOrder.external_order_id,
        orderSource: blOrder.order_source,
        status: this.mapOrderStatus(blOrder.order_status_id),
        mappedStatus: blOrder.order_status_id,
        total: parseFloat(blOrder.payment_done || 0),
        currency: blOrder.currency,
        customerEmail: blOrder.email,
        customerPhone: blOrder.phone,
        shippingAddress: {
          fullName: blOrder.delivery_fullname,
          company: blOrder.delivery_company,
          address: blOrder.delivery_address,
          city: blOrder.delivery_city,
          postcode: blOrder.delivery_postcode,
          country: blOrder.delivery_country_code,
        },
        billingAddress: {
          fullName: blOrder.invoice_fullname,
          company: blOrder.invoice_company,
          address: blOrder.invoice_address,
          city: blOrder.invoice_city,
          postcode: blOrder.invoice_postcode,
          country: blOrder.invoice_country_code,
          nip: blOrder.invoice_nip,
        },
        paymentMethod: blOrder.payment_method,
        confirmedAt: new Date(blOrder.date_confirmed * 1000),
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
        if (blOrder.products && Array.isArray(blOrder.products)) {
          for (const product of blOrder.products) {
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
      this.logger.error(`Failed to process order ${blOrder.order_id}:`, error);
    }
  }

  private async determineOwnership(blOrder: any, account: any): Promise<string | null> {
    // If account has direct tenant assignment
    if (account.tenantId) {
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
      if (this.matchesRule(blOrder, rule.conditionsJson)) {
        return rule.tenantId;
      }
    }

    // Check entity map
    const entityMap = await this.prisma.entityMap.findUnique({
      where: {
        entityType_blId: {
          entityType: 'order',
          blId: String(blOrder.order_id),
        },
      },
    });

    return entityMap?.tenantId || null;
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

  private decryptToken(encryptedToken: Buffer | Uint8Array): string {
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