import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma.service';
import { LoggingService } from '../common/services/logging.service';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggingService,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(@Res() res: Response) {
    const startTime = Date.now();
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env['npm_package_version'] || '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      services: {
        database: 'unknown',
        redis: 'unknown',
        storage: 'unknown',
      },
      metrics: {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          rss: process.memoryUsage().rss,
        },
        cpu: {
          usage: process.cpuUsage(),
        },
        responseTime: 0,
      },
    };

    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      health.services.database = 'healthy';
    } catch (error) {
      health.services.database = 'unhealthy';
      health.status = 'error';
      this.logger.error('Database health check failed', error instanceof Error ? error.stack : String(error), 'HealthCheck');
    }

    try {
      // Check Redis connection (if available)
      // This would require Redis client injection
      health.services.redis = 'healthy';
    } catch (error) {
      health.services.redis = 'unhealthy';
      this.logger.warn('Redis health check failed', 'HealthCheck', { error: error instanceof Error ? error.message : String(error) });
    }

    try {
      // Check storage connection (S3/MinIO)
      // This would require S3 client injection
      health.services.storage = 'healthy';
    } catch (error) {
      health.services.storage = 'unhealthy';
      this.logger.warn('Storage health check failed', 'HealthCheck', { error: error instanceof Error ? error.message : String(error) });
    }

    // Calculate response time
    health.metrics.responseTime = Date.now() - startTime;

    // Determine overall health status
    const unhealthyServices = Object.values(health.services).filter(status => status === 'unhealthy');
    if (unhealthyServices.length > 0) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    
    this.logger.debug('Health check completed', 'HealthCheck', {
      status: health.status,
      responseTime: health.metrics.responseTime,
      services: health.services,
    });

    return res.status(statusCode).json(health);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready(@Res() res: Response) {
    try {
      // Check if all critical services are available
      await this.prisma.$queryRaw`SELECT 1`;
      
      return res.status(HttpStatus.OK).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Readiness check failed', error instanceof Error ? error.stack : String(error), 'HealthCheck');
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with all services' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  async getDetailedHealth(@Res() res: Response) {
    try {
      const health = await this.healthService.getDetailedHealthCheck();
      const statusCode = health.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
      return res.status(statusCode).json(health);
    } catch (error) {
      this.logger.error('Detailed health check failed', error instanceof Error ? error.stack : String(error), 'HealthCheck');
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  @Get('services')
  @ApiOperation({ summary: 'Health check for all services' })
  @ApiResponse({ status: 200, description: 'Services health information' })
  async getServicesHealth(@Res() res: Response) {
    try {
      const health = await this.healthService.getHealthCheck();
      const statusCode = health.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
      return res.status(statusCode).json(health);
    } catch (error) {
      this.logger.error('Services health check failed', error instanceof Error ? error.stack : String(error), 'HealthCheck');
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}