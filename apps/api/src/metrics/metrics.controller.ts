import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { LoggingService } from '../common/services/logging.service';

@ApiTags('metrics')
@Controller('metrics')
@UseGuards(ThrottlerGuard)
export class MetricsController {
  constructor(private readonly logger: LoggingService) {}

  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  @ApiResponse({ status: 200, description: 'Metrics in Prometheus format' })
  async getMetrics(@Res() res: Response) {
    try {
      const metrics = await this.generateMetrics();
      
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      return res.send(metrics);
    } catch (error) {
      this.logger.error('Failed to generate metrics', error.stack, 'Metrics');
      return res.status(500).send('# Error generating metrics\n');
    }
  }

  private async generateMetrics(): Promise<string> {
    const metrics: string[] = [];

    // Application metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    // Memory metrics
    metrics.push('# HELP nodejs_memory_heap_used_bytes Process heap used in bytes');
    metrics.push('# TYPE nodejs_memory_heap_used_bytes gauge');
    metrics.push(`nodejs_memory_heap_used_bytes ${memoryUsage.heapUsed}`);

    metrics.push('# HELP nodejs_memory_heap_total_bytes Process heap total in bytes');
    metrics.push('# TYPE nodejs_memory_heap_total_bytes gauge');
    metrics.push(`nodejs_memory_heap_total_bytes ${memoryUsage.heapTotal}`);

    metrics.push('# HELP nodejs_memory_external_bytes Process external memory in bytes');
    metrics.push('# TYPE nodejs_memory_external_bytes gauge');
    metrics.push(`nodejs_memory_external_bytes ${memoryUsage.external}`);

    metrics.push('# HELP nodejs_memory_rss_bytes Process resident set size in bytes');
    metrics.push('# TYPE nodejs_memory_rss_bytes gauge');
    metrics.push(`nodejs_memory_rss_bytes ${memoryUsage.rss}`);

    // CPU metrics
    metrics.push('# HELP nodejs_cpu_user_seconds_total Total user CPU time in seconds');
    metrics.push('# TYPE nodejs_cpu_user_seconds_total counter');
    metrics.push(`nodejs_cpu_user_seconds_total ${cpuUsage.user / 1000000}`);

    metrics.push('# HELP nodejs_cpu_system_seconds_total Total system CPU time in seconds');
    metrics.push('# TYPE nodejs_cpu_system_seconds_total counter');
    metrics.push(`nodejs_cpu_system_seconds_total ${cpuUsage.system / 1000000}`);

    // Uptime metrics
    metrics.push('# HELP nodejs_uptime_seconds_total Process uptime in seconds');
    metrics.push('# TYPE nodejs_uptime_seconds_total counter');
    metrics.push(`nodejs_uptime_seconds_total ${uptime}`);

    // Event loop metrics
    const eventLoopLag = await this.getEventLoopLag();
    metrics.push('# HELP nodejs_eventloop_lag_seconds Event loop lag in seconds');
    metrics.push('# TYPE nodejs_eventloop_lag_seconds gauge');
    metrics.push(`nodejs_eventloop_lag_seconds ${eventLoopLag}`);

    // Application-specific metrics
    metrics.push('# HELP fulexo_application_info Application information');
    metrics.push('# TYPE fulexo_application_info gauge');
    metrics.push(`fulexo_application_info{version="${process.env.npm_package_version || '1.0.0'}",environment="${process.env.NODE_ENV || 'development'}"} 1`);

    // Database connection metrics (placeholder)
    metrics.push('# HELP fulexo_database_connections_active Active database connections');
    metrics.push('# TYPE fulexo_database_connections_active gauge');
    metrics.push('fulexo_database_connections_active 1');

    // Redis connection metrics (placeholder)
    metrics.push('# HELP fulexo_redis_connections_active Active Redis connections');
    metrics.push('# TYPE fulexo_redis_connections_active gauge');
    metrics.push('fulexo_redis_connections_active 1');

    // Request metrics (placeholder - would be implemented with middleware)
    metrics.push('# HELP fulexo_http_requests_total Total HTTP requests');
    metrics.push('# TYPE fulexo_http_requests_total counter');
    metrics.push('fulexo_http_requests_total{method="GET",status="200"} 0');
    metrics.push('fulexo_http_requests_total{method="POST",status="200"} 0');
    metrics.push('fulexo_http_requests_total{method="PUT",status="200"} 0');
    metrics.push('fulexo_http_requests_total{method="DELETE",status="200"} 0');

    // Error metrics (placeholder)
    metrics.push('# HELP fulexo_http_errors_total Total HTTP errors');
    metrics.push('# TYPE fulexo_http_errors_total counter');
    metrics.push('fulexo_http_errors_total{status="4xx"} 0');
    metrics.push('fulexo_http_errors_total{status="5xx"} 0');

    return metrics.join('\n') + '\n';
  }

  private async getEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        resolve(lag / 1000); // Convert to seconds
      });
    });
  }
}