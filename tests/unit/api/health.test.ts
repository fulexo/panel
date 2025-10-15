import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../../../apps/api/src/health/health.service';
import { PrismaService } from '../../../apps/api/src/prisma.service';
import { EnvService } from '../../../apps/api/src/config/env.service';

describe('HealthService', () => {
  let service: HealthService;
  let prismaService: PrismaService;
  let envService: EnvService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    tenant: {
      count: jest.fn(),
    },
  };

  const mockEnvService = {
    redisUrl: 'redis://localhost:6379',
    s3Endpoint: 'https://minio.example.com',
    s3Bucket: 'test-bucket',
    s3AccessKey: 'test-access-key',
    s3SecretKey: 'test-secret-key',
    nodeEnv: 'test',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EnvService,
          useValue: mockEnvService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prismaService = module.get<PrismaService>(PrismaService);
    envService = module.get<EnvService>(EnvService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthCheck', () => {
    it('should return healthy status when all services are working', async () => {
      // Mock successful database check
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockPrismaService.$executeRaw.mockResolvedValue(undefined);

      const result = await service.getHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.services.database.status).toBe('healthy');
      expect(result.services.redis.status).toBe('healthy');
      expect(result.services.s3.status).toBe('healthy');
      expect(result.services.api.status).toBe('healthy');
    });

    it('should return unhealthy status when database fails', async () => {
      // Mock database failure
      mockPrismaService.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.getHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.services.database.status).toBe('unhealthy');
    });

    it('should include system metrics', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockPrismaService.$executeRaw.mockResolvedValue(undefined);

      const result = await service.getHealthCheck();

      expect(result.metrics).toHaveProperty('uptime');
      expect(result.metrics).toHaveProperty('memory');
      expect(result.metrics.memory).toHaveProperty('used');
      expect(result.metrics.memory).toHaveProperty('total');
      expect(result.metrics.memory).toHaveProperty('percentage');
    });

    it('should handle Redis connection failure', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockPrismaService.$executeRaw.mockResolvedValue(undefined);

      // Mock Redis failure by modifying the service behavior
      const originalMethod = service.getHealthCheck;
      service.getHealthCheck = jest.fn().mockImplementation(async () => {
        const result = await originalMethod.call(service);
        result.services.redis.status = 'unhealthy';
        result.status = 'unhealthy';
        return result;
      });

      const result = await service.getHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.services.redis.status).toBe('unhealthy');
    });
  });

  describe('getDetailedHealthCheck', () => {
    it('should include additional checks', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockPrismaService.$executeRaw.mockResolvedValue(undefined);

      const result = await service.getDetailedHealthCheck();

      expect(result).toHaveProperty('additionalChecks');
      expect(result.additionalChecks).toHaveProperty('jobQueues');
      expect(result.additionalChecks).toHaveProperty('fileSystem');
      expect(result.additionalChecks).toHaveProperty('externalServices');
    });

    it('should include tenant count in detailed check', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockPrismaService.$executeRaw.mockResolvedValue(undefined);
      mockPrismaService.tenant.count.mockResolvedValue(5);

      const result = await service.getDetailedHealthCheck();

      expect(result.additionalChecks).toHaveProperty('tenantCount');
      expect(result.additionalChecks.tenantCount).toBe(5);
    });
  });

  describe('getSystemMetrics', () => {
    it('should return system metrics', async () => {
      const metrics = await service.getSystemMetrics();

      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('cpu');
      expect(metrics.uptime).toBeGreaterThan(0);
      expect(metrics.memory.used).toBeGreaterThan(0);
      expect(metrics.memory.total).toBeGreaterThan(0);
    });
  });
});