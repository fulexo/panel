import { Processor, Worker, Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WooCommerceService } from '../../woocommerce/woo.service';
import Redis from 'ioredis';

export interface WooSyncJobData {
  storeId: string;
  tenantId: string;
  syncType: 'products' | 'orders' | 'customers' | 'all';
}

@Processor('woo-sync')
export class WooSyncProcessor {
  private readonly logger = new Logger(WooSyncProcessor.name);

  constructor(
    private prisma: PrismaService,
    private wooService: WooCommerceService,
  ) {}

  @Processor('woo-sync-orders')
  async processOrderSync(job: Job<WooSyncJobData>) {
    const { storeId, tenantId } = job.data;
    
    try {
      this.logger.log(`Starting order sync for store ${storeId}`);
      
      const store = await this.prisma.wooStore.findFirst({
        where: { id: storeId, tenantId },
      });

      if (!store) {
        throw new Error(`Store ${storeId} not found`);
      }

      const result = await this.wooService.syncStore(
        {
          id: store.id,
          url: store.baseUrl,
          consumerKey: store.consumerKey,
          consumerSecret: store.consumerSecret,
        },
        tenantId
      );

      this.logger.log(`Order sync completed for store ${storeId}: ${result.syncedItems.orders} orders`);
      
      return result;
    } catch (error) {
      this.logger.error(`Order sync failed for store ${storeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  @Processor('woo-sync-products')
  async processProductSync(job: Job<WooSyncJobData>) {
    const { storeId, tenantId } = job.data;
    
    try {
      this.logger.log(`Starting product sync for store ${storeId}`);
      
      const store = await this.prisma.wooStore.findFirst({
        where: { id: storeId, tenantId },
      });

      if (!store) {
        throw new Error(`Store ${storeId} not found`);
      }

      const result = await this.wooService.syncStore(
        {
          id: store.id,
          url: store.baseUrl,
          consumerKey: store.consumerKey,
          consumerSecret: store.consumerSecret,
        },
        tenantId
      );

      this.logger.log(`Product sync completed for store ${storeId}: ${result.syncedItems.products} products`);
      
      return result;
    } catch (error) {
      this.logger.error(`Product sync failed for store ${storeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  @Processor('woo-sync-customers')
  async processCustomerSync(job: Job<WooSyncJobData>) {
    const { storeId, tenantId } = job.data;
    
    try {
      this.logger.log(`Starting customer sync for store ${storeId}`);
      
      const store = await this.prisma.wooStore.findFirst({
        where: { id: storeId, tenantId },
      });

      if (!store) {
        throw new Error(`Store ${storeId} not found`);
      }

      const result = await this.wooService.syncStore(
        {
          id: store.id,
          url: store.baseUrl,
          consumerKey: store.consumerKey,
          consumerSecret: store.consumerSecret,
        },
        tenantId
      );

      this.logger.log(`Customer sync completed for store ${storeId}: ${result.syncedItems.customers} customers`);
      
      return result;
    } catch (error) {
      this.logger.error(`Customer sync failed for store ${storeId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}

export function createWooSyncWorker(redis: Redis): Worker {
  return new Worker('woo-sync', async (job) => {
    const processor = new WooSyncProcessor(
      new PrismaService(),
      new WooCommerceService(new PrismaService())
    );

    switch (job.name) {
      case 'woo-sync-orders':
        return processor.processOrderSync(job);
      case 'woo-sync-products':
        return processor.processProductSync(job);
      case 'woo-sync-customers':
        return processor.processCustomerSync(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }, {
    connection: redis,
    concurrency: 5,
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}