import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EnvService } from '../config/env.service';
import Redis from 'ioredis';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    s3: ServiceHealth;
    api: ServiceHealth;
  };
  metrics: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu?: {
      usage: number;
    };
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private redis: Redis;
  private s3Client: S3Client;
  private startTime: number;

  constructor(
    private prisma: PrismaService,
    private envService: EnvService,
  ) {
    this.startTime = Date.now();
    this.redis = new Redis(this.envService.redisUrl, { maxRetriesPerRequest: null });
    this.s3Client = new S3Client({
      endpoint: this.envService.s3Endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.envService.s3AccessKey,
        secretAccessKey: this.envService.s3SecretKey,
      },
      forcePathStyle: true,
    });
  }

  async getHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    
    // Check all services in parallel
    const [database, redis, s3, api] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkS3(),
      this.checkApi(),
    ]);

    const services = {
      database: database.status === 'fulfilled' ? database.value : { status: 'unhealthy' as const, error: 'Database check failed' },
      redis: redis.status === 'fulfilled' ? redis.value : { status: 'unhealthy' as const, error: 'Redis check failed' },
      s3: s3.status === 'fulfilled' ? s3.value : { status: 'unhealthy' as const, error: 'S3 check failed' },
      api: api.status === 'fulfilled' ? api.value : { status: 'unhealthy' as const, error: 'API check failed' },
    };

    // Determine overall status
    const serviceStatuses = Object.values(services).map(s => s.status);
    const overallStatus = this.determineOverallStatus(serviceStatuses);

    // Get system metrics
    const metrics = await this.getSystemMetrics();

    return {
      status: overallStatus,
      timestamp,
      services,
      metrics,
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test basic connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Test tenant isolation
      await this.prisma.$executeRaw`SET LOCAL app.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid`;
      
      // Test a simple query
      const result = await this.prisma.tenant.count();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        details: {
          tenantCount: result,
          connectionPool: 'active',
        },
      };
    } catch (error) {
      this.logger.error(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test basic connection
      await this.redis.ping();
      
      // Test set/get operations
      const testKey = `health-check:${Date.now()}`;
      const testValue = 'test-value';
      
      await this.redis.set(testKey, testValue, 'EX', 10);
      const retrievedValue = await this.redis.get(testKey);
      await this.redis.del(testKey);
      
      if (retrievedValue !== testValue) {
        throw new Error('Redis set/get test failed');
      }
      
      // Get Redis info
      const info = await this.redis.info('memory');
      const memoryInfo = this.parseRedisInfo(info);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        details: {
          version: memoryInfo.redis_version,
          usedMemory: memoryInfo.used_memory_human,
          connectedClients: memoryInfo.connected_clients,
        },
      };
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }

  private async checkS3(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test bucket access
      const command = new HeadBucketCommand({
        Bucket: this.envService.s3Bucket,
      });
      
      await this.s3Client.send(command);
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        details: {
          bucket: this.envService.s3Bucket,
          endpoint: this.envService.s3Endpoint,
        },
      };
    } catch (error) {
      this.logger.error(`S3 health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown S3 error',
      };
    }
  }

  private async checkApi(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Basic API functionality test
      // const testData = {
      //   timestamp: new Date().toISOString(),
      //   test: true,
      // };
      
      // Test environment variables
      const requiredEnvVars = [
        'DATABASE_URL',
        'REDIS_URL',
        'JWT_SECRET',
        'S3_ENDPOINT',
        'S3_ACCESS_KEY',
        'S3_SECRET_KEY',
        'S3_BUCKET',
      ];
      
      const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
      
      if (missingEnvVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        details: {
          nodeVersion: process.version,
          platform: process.platform,
          environment: this.envService.nodeEnv,
          uptime: process.uptime(),
        },
      };
    } catch (error) {
      this.logger.error(`API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown API error',
      };
    }
  }

  private async getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed + memoryUsage.external;
    
    return {
      uptime: Date.now() - this.startTime,
      memory: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
    };
  }

  private determineOverallStatus(serviceStatuses: string[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (serviceStatuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    if (serviceStatuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    
    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':', 2);
        result[key] = value;
      }
    });
    
    return result;
  }

  async getDetailedHealthCheck(): Promise<HealthCheckResult & { 
    additionalChecks: {
      jobQueues: ServiceHealth;
      fileSystem: ServiceHealth;
      externalServices: ServiceHealth;
    }
  }> {
    const basicHealth = await this.getHealthCheck();
    
    // Additional checks
    const [jobQueues, fileSystem, externalServices] = await Promise.allSettled([
      this.checkJobQueues(),
      this.checkFileSystem(),
      this.checkExternalServices(),
    ]);

    const additionalChecks = {
      jobQueues: jobQueues.status === 'fulfilled' ? jobQueues.value : { status: 'unhealthy' as const, error: 'Job queues check failed' },
      fileSystem: fileSystem.status === 'fulfilled' ? fileSystem.value : { status: 'unhealthy' as const, error: 'File system check failed' },
      externalServices: externalServices.status === 'fulfilled' ? externalServices.value : { status: 'unhealthy' as const, error: 'External services check failed' },
    };

    return {
      ...basicHealth,
      additionalChecks,
    };
  }

  private async checkJobQueues(): Promise<ServiceHealth> {
    try {
      // Check Redis for job queue status
      const keys = await this.redis.keys('bull:*');
      const queueCount = keys.filter(key => key.includes(':waiting') || key.includes(':active')).length;
      
      return {
        status: 'healthy',
        details: {
          activeQueues: queueCount,
          redisKeys: keys.length,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkFileSystem(): Promise<ServiceHealth> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Check if we can write to temp directory
      const tempDir = path.join(process.cwd(), 'temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      const testFile = path.join(tempDir, `health-check-${Date.now()}.txt`);
      await fs.writeFile(testFile, 'health check test');
      await fs.unlink(testFile);
      
      return {
        status: 'healthy',
        details: {
          tempDirectory: tempDir,
          writable: true,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkExternalServices(): Promise<ServiceHealth> {
    try {
      // Check if external monitoring services are configured
      const externalServices = [
        process.env['SENTRY_DSN'],
        process.env['LOGROCKET_APP_ID'],
        process.env['BUGSNAG_API_KEY'],
      ].filter(Boolean);
      
      return {
        status: externalServices.length > 0 ? 'healthy' : 'degraded',
        details: {
          configuredServices: externalServices.length,
          services: externalServices.map(service => service ? 'configured' : 'not configured'),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}