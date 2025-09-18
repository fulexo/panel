import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma.service';
import { EnvService } from '../config/env.service';

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
  });
});