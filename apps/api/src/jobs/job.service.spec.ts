// import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from './job.service';
import type { EnvService } from '../config/env.service';

describe('JobService', () => {
  let service: JobService;

  const mockEnvService = {
    redisUrl: 'redis://localhost:6379',
  };

  beforeEach(async () => {
    // Mock implementation for testing
    service = new JobService(mockEnvService as unknown as EnvService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addWooSyncProductJob', () => {
    it('should add WooCommerce product sync job', async () => {
      const storeId = 'store-123';
      const tenantId = 'tenant-123';

      // Mock the queue methods
      const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      };

      // Mock the queues map
      (service as unknown as { queues: Map<string, { add: jest.Mock }> }).queues = new Map([['woo-sync', mockQueue]]);

      await service.addWooSyncProductJob(storeId, tenantId);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'woo-sync-products',
        {
          storeId,
          tenantId,
          syncType: 'products',
        },
        expect.objectContaining({
          delay: 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        })
      );
    });
  });

  describe('addEmailJob', () => {
    it('should add email job', async () => {
      const tenantId = 'tenant-123';
      const to = 'user@example.com';
      const subject = 'Test Email';
      const html = '<p>Test content</p>';

      const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      };

      (service as unknown as { queues: Map<string, { add: jest.Mock }> }).queues = new Map([['email', mockQueue]]);

      await service.addEmailJob(tenantId, to, subject, html);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        {
          tenantId,
          to,
          subject,
          html,
          text: undefined,
          template: undefined,
          templateData: undefined,
          priority: 'normal',
        },
        expect.objectContaining({
          delay: 0,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          priority: 5,
        })
      );
    });
  });

  describe('addFileCleanupJob', () => {
    it('should add file cleanup job', async () => {
      const tenantId = 'tenant-123';
      const olderThanHours = 24;

      const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      };

      (service as unknown as { queues: Map<string, { add: jest.Mock }> }).queues = new Map([['file-cleanup', mockQueue]]);

      await service.addFileCleanupJob(tenantId, olderThanHours);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'cleanup-expired-files',
        {
          tenantId,
          olderThanHours,
        },
        expect.objectContaining({
          delay: 0,
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        })
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockQueue = {
        getWaiting: jest.fn().mockResolvedValue([]),
        getActive: jest.fn().mockResolvedValue([]),
        getCompleted: jest.fn().mockResolvedValue([]),
        getFailed: jest.fn().mockResolvedValue([]),
      };

      (service as unknown as { queues: Map<string, { add: jest.Mock }> }).queues = new Map([
        ['woo-sync', mockQueue],
        ['email', mockQueue],
        ['file-cleanup', mockQueue],
      ]);

      const stats = await service.getQueueStats();

      expect(stats).toHaveProperty('woo-sync');
      expect(stats).toHaveProperty('email');
      expect(stats).toHaveProperty('file-cleanup');
      expect(stats['woo-sync']).toHaveProperty('waiting');
      expect(stats['woo-sync']).toHaveProperty('active');
      expect(stats['woo-sync']).toHaveProperty('completed');
      expect(stats['woo-sync']).toHaveProperty('failed');
    });
  });
});