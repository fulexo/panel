import { JobProcessor } from '../lib/job-processor';

// Mock Redis connection
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }));
});

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    order: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  })),
}));

describe('JobProcessor', () => {
  let jobProcessor: JobProcessor;

  beforeEach(() => {
    jobProcessor = new JobProcessor();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(jobProcessor).toBeDefined();
  });

  describe('processWooSyncJob', () => {
    it('should process WooCommerce sync job', async () => {
      const jobData = {
        storeId: 'store-123',
        tenantId: 'tenant-123',
        syncType: 'products',
      };

      // Mock the process method
      const processSpy = jest.spyOn(jobProcessor, 'processWooSyncJob');
      processSpy.mockResolvedValue(undefined);

      await jobProcessor.processWooSyncJob(jobData);

      expect(processSpy).toHaveBeenCalledWith(jobData);
    });

    it('should handle sync errors gracefully', async () => {
      const jobData = {
        storeId: 'store-123',
        tenantId: 'tenant-123',
        syncType: 'products',
      };

      const processSpy = jest.spyOn(jobProcessor, 'processWooSyncJob');
      processSpy.mockRejectedValue(new Error('Sync failed'));

      await expect(jobProcessor.processWooSyncJob(jobData)).rejects.toThrow('Sync failed');
    });
  });

  describe('processEmailJob', () => {
    it('should process email job', async () => {
      const jobData = {
        tenantId: 'tenant-123',
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      };

      const processSpy = jest.spyOn(jobProcessor, 'processEmailJob');
      processSpy.mockResolvedValue(undefined);

      await jobProcessor.processEmailJob(jobData);

      expect(processSpy).toHaveBeenCalledWith(jobData);
    });
  });

  describe('processFileCleanupJob', () => {
    it('should process file cleanup job', async () => {
      const jobData = {
        tenantId: 'tenant-123',
        olderThanHours: 24,
      };

      const processSpy = jest.spyOn(jobProcessor, 'processFileCleanupJob');
      processSpy.mockResolvedValue(undefined);

      await jobProcessor.processFileCleanupJob(jobData);

      expect(processSpy).toHaveBeenCalledWith(jobData);
    });
  });
});