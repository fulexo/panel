import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from '../../../apps/api/src/jobs/job.service';
import { EnvService } from '../../../apps/api/src/config/env.service';

describe('JobService', () => {
  let service: JobService;
  let envService: EnvService;

  const mockEnvService = {
    redisUrl: 'redis://localhost:6379',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        {
          provide: EnvService,
          useValue: mockEnvService,
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
    envService = module.get<EnvService>(EnvService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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

    it('should handle job queue errors gracefully', async () => {
      const storeId = 'store-123';
      const tenantId = 'tenant-123';

      const mockQueue = {
        add: jest.fn().mockRejectedValue(new Error('Queue error')),
      };

      (service as unknown as { queues: Map<string, { add: jest.Mock }> }).queues = new Map([['woo-sync', mockQueue]]);

      await expect(service.addWooSyncProductJob(storeId, tenantId)).rejects.toThrow('Queue error');
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

    it('should add email job with template', async () => {
      const tenantId = 'tenant-123';
      const to = 'user@example.com';
      const subject = 'Test Email';
      const template = 'welcome';
      const templateData = { name: 'John' };

      const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      };

      (service as unknown as { queues: Map<string, { add: jest.Mock }> }).queues = new Map([['email', mockQueue]]);

      await service.addEmailJob(tenantId, to, subject, undefined, undefined, template, templateData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-email',
        {
          tenantId,
          to,
          subject,
          html: undefined,
          text: undefined,
          template,
          templateData,
          priority: 'normal',
        },
        expect.any(Object)
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

    it('should handle queue errors in stats', async () => {
      const mockQueue = {
        getWaiting: jest.fn().mockRejectedValue(new Error('Queue error')),
        getActive: jest.fn().mockResolvedValue([]),
        getCompleted: jest.fn().mockResolvedValue([]),
        getFailed: jest.fn().mockResolvedValue([]),
      };

      (service as unknown as { queues: Map<string, { add: jest.Mock }> }).queues = new Map([['woo-sync', mockQueue]]);

      const stats = await service.getQueueStats();

      expect(stats['woo-sync'].waiting).toBe(0);
      expect(stats['woo-sync'].error).toBe('Queue error');
    });
  });

  describe('addWooSyncOrderJob', () => {
    it('should add WooCommerce order sync job', async () => {
      const storeId = 'store-123';
      const tenantId = 'tenant-123';

      const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      };

      (service as unknown as { queues: Map<string, { add: jest.Mock }> }).queues = new Map([['woo-sync', mockQueue]]);

      await service.addWooSyncOrderJob(storeId, tenantId);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'woo-sync-orders',
        {
          storeId,
          tenantId,
          syncType: 'orders',
        },
        expect.any(Object)
      );
    });
  });

  describe('addInventorySyncJob', () => {
    it('should add inventory sync job', async () => {
      const tenantId = 'tenant-123';
      const productIds = ['prod-1', 'prod-2'];

      const mockQueue = {
        add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      };

      (service as unknown as { queues: Map<string, { add: jest.Mock }> }).queues = new Map([['inventory-sync', mockQueue]]);

      await service.addInventorySyncJob(tenantId, productIds);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'sync-inventory',
        {
          tenantId,
          productIds,
        },
        expect.any(Object)
      );
    });
  });
});