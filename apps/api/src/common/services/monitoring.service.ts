import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface ErrorLogData {
  type: string;
  message: string;
  stack?: string;
  timestamp: string;
  url?: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private prisma: PrismaService) {}

  async logError(errorData: ErrorLogData) {
    try {
      // Log to console in development
      if (process.env['NODE_ENV'] === 'development') {
        this.logger.error('Error logged:', errorData);
      }

      // Store in database for analysis
      await this.prisma.auditLog.create({
        data: {
          action: 'ERROR_LOGGED',
          entityType: 'ERROR',
          entityId: errorData.type,
          changes: errorData as any,
          metadata: {
            type: errorData.type,
            url: errorData.url,
            timestamp: errorData.timestamp,
          },
          userId: errorData.userId,
          tenantId: errorData.tenantId,
        },
      });

      // Send to external monitoring service if configured
      await this.sendToExternalService(errorData);
    } catch (error) {
      // Silent fail for error logging
      this.logger.error('Failed to log error:', error);
    }
  }

  async logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'PERFORMANCE_LOG',
          entityType: 'PERFORMANCE',
          changes: {
            operation,
            duration,
            metadata,
          },
          metadata: {
            operation,
            duration,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      // Silent fail for performance logging
      this.logger.error('Failed to log performance:', error);
    }
  }

  async logUserActivity(userId: string, action: string, metadata?: Record<string, unknown>) {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: `USER_${action}`,
          entityType: 'USER_ACTIVITY',
          changes: {
            action,
            metadata,
          },
          metadata: {
            action,
            timestamp: new Date().toISOString(),
          },
          userId,
        },
      });
    } catch (error) {
      // Silent fail for activity logging
      this.logger.error('Failed to log user activity:', error);
    }
  }

  private async sendToExternalService(_errorData: ErrorLogData) {
    // Integration points for external monitoring services
    const externalServices = [
      process.env['SENTRY_DSN'],
      process.env['LOGROCKET_APP_ID'],
      process.env['BUGSNAG_API_KEY'],
    ].filter(Boolean);

    for (const service of externalServices) {
      try {
        // Implement specific service integrations here
        // For now, just log that we would send to external service
        this.logger.debug(`Would send to external service: ${service}`);
      } catch (error) {
        this.logger.error(`Failed to send to external service ${service}:`, error);
      }
    }
  }
}