import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { EnvService } from '../config/env.service';
import { createWooSyncWorker } from './processors/woo-sync.processor';
import { createEmailWorker } from './processors/email.processor';
import { createFileCleanupWorker } from './processors/file-cleanup.processor';

@Injectable()
export class JobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobService.name);
  private redis: Redis;
  private workers: Worker[] = [];
  private queues: Map<string, Queue> = new Map();

  constructor(private envService: EnvService) {
    this.redis = new Redis(this.envService.redisUrl, { maxRetriesPerRequest: null });
  }

  async onModuleInit() {
    try {
      // Initialize workers
      this.workers = [
        createWooSyncWorker(this.redis),
        createEmailWorker(this.redis),
        createFileCleanupWorker(this.redis),
      ];

      // Initialize queues
      this.queues.set('woo-sync', new Queue('woo-sync', { connection: this.redis }));
      this.queues.set('email', new Queue('email', { connection: this.redis }));
      this.queues.set('file-cleanup', new Queue('file-cleanup', { connection: this.redis }));

      this.logger.log('Job service initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize job service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async onModuleDestroy() {
    try {
      // Close all workers
      await Promise.all(this.workers.map(worker => worker.close()));

      // Close all queues
      await Promise.all(Array.from(this.queues.values()).map(queue => queue.close()));

      // Close Redis connection
      await this.redis.quit();

      this.logger.log('Job service destroyed successfully');
    } catch (error) {
      this.logger.error(`Failed to destroy job service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // WooCommerce sync jobs
  async addWooSyncOrderJob(storeId: string, tenantId: string, delay?: number) {
    const queue = this.queues.get('woo-sync');
    if (!queue) throw new Error('Woo sync queue not initialized');

    const job = await queue.add('woo-sync-orders', {
      storeId,
      tenantId,
      syncType: 'orders',
    }, {
      delay: delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    this.logger.log(`Added WooCommerce order sync job: ${job.id}`);
    return job;
  }

  async addWooSyncProductJob(storeId: string, tenantId: string, delay?: number) {
    const queue = this.queues.get('woo-sync');
    if (!queue) throw new Error('Woo sync queue not initialized');

    const job = await queue.add('woo-sync-products', {
      storeId,
      tenantId,
      syncType: 'products',
    }, {
      delay: delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    this.logger.log(`Added WooCommerce product sync job: ${job.id}`);
    return job;
  }

  async addWooSyncCustomerJob(storeId: string, tenantId: string, delay?: number) {
    const queue = this.queues.get('woo-sync');
    if (!queue) throw new Error('Woo sync queue not initialized');

    const job = await queue.add('woo-sync-customers', {
      storeId,
      tenantId,
      syncType: 'customers',
    }, {
      delay: delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    this.logger.log(`Added WooCommerce customer sync job: ${job.id}`);
    return job;
  }

  // Email jobs
  async addEmailJob(
    tenantId: string,
    to: string,
    subject: string,
    html?: string,
    text?: string,
    template?: string,
    templateData?: Record<string, unknown>,
    priority: 'low' | 'normal' | 'high' = 'normal',
    delay?: number
  ) {
    const queue = this.queues.get('email');
    if (!queue) throw new Error('Email queue not initialized');

    const job = await queue.add('send-email', {
      tenantId,
      to,
      subject,
      html,
      text,
      template,
      templateData,
      priority,
    }, {
      delay: delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      priority: priority === 'high' ? 10 : priority === 'low' ? 1 : 5,
    });

    this.logger.log(`Added email job: ${job.id}`);
    return job;
  }

  async addWelcomeEmailJob(tenantId: string, userEmail: string, userName: string, delay?: number) {
    const queue = this.queues.get('email');
    if (!queue) throw new Error('Email queue not initialized');

    const job = await queue.add('send-welcome-email', {
      tenantId,
      userEmail,
      userName,
    }, {
      delay: delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    this.logger.log(`Added welcome email job: ${job.id}`);
    return job;
  }

  async addPasswordResetEmailJob(tenantId: string, userEmail: string, resetToken: string, delay?: number) {
    const queue = this.queues.get('email');
    if (!queue) throw new Error('Email queue not initialized');

    const job = await queue.add('send-password-reset-email', {
      tenantId,
      userEmail,
      resetToken,
    }, {
      delay: delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    this.logger.log(`Added password reset email job: ${job.id}`);
    return job;
  }

  async addOrderNotificationJob(tenantId: string, orderData: Record<string, unknown>, delay?: number) {
    const queue = this.queues.get('email');
    if (!queue) throw new Error('Email queue not initialized');

    const job = await queue.add('send-order-notification', {
      tenantId,
      orderData,
    }, {
      delay: delay || 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    this.logger.log(`Added order notification job: ${job.id}`);
    return job;
  }

  // File cleanup jobs
  async addFileCleanupJob(tenantId?: string, olderThanHours: number = 24, delay?: number) {
    const queue = this.queues.get('file-cleanup');
    if (!queue) throw new Error('File cleanup queue not initialized');

    const job = await queue.add('cleanup-expired-files', {
      tenantId,
      olderThanHours,
    }, {
      delay: delay || 0,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    this.logger.log(`Added file cleanup job: ${job.id}`);
    return job;
  }

  async addOrphanedFileCleanupJob(delay?: number) {
    const queue = this.queues.get('file-cleanup');
    if (!queue) throw new Error('File cleanup queue not initialized');

    const job = await queue.add('cleanup-orphaned-files', {}, {
      delay: delay || 0,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    this.logger.log(`Added orphaned file cleanup job: ${job.id}`);
    return job;
  }

  // Schedule recurring jobs
  async scheduleRecurringJobs() {
    try {
      // Schedule file cleanup every 6 hours
      await this.addFileCleanupJob(undefined, 24, 0);
      
      // Schedule orphaned file cleanup daily
      await this.addOrphanedFileCleanupJob(0);

      this.logger.log('Recurring jobs scheduled successfully');
    } catch (error) {
      this.logger.error(`Failed to schedule recurring jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get queue statistics
  async getQueueStats() {
    const stats: Record<string, {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    }> = {};

    for (const [name, queue] of this.queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    }

    return stats;
  }
}