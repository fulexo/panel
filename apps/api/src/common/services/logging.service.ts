import { Injectable, LoggerService } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  context?: string;
  metadata?: Record<string, unknown> | undefined;
  userId?: string;
  tenantId?: string;
  requestId?: string;
  timestamp?: Date;
}

@Injectable()
export class LoggingService implements LoggerService {
  private readonly context: string;

  constructor(
    private readonly prisma: PrismaService,
    context: string = 'Application'
  ) {
    this.context = context;
  }

  log(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.writeLog({
      level: 'info',
      message,
      context: context || this.context,
      metadata,
      timestamp: new Date(),
    });
  }

  error(message: string, trace?: string, context?: string, metadata?: Record<string, unknown>) {
    this.writeLog({
      level: 'error',
      message,
      context: context || this.context,
      metadata: {
        ...metadata,
        trace,
      },
      timestamp: new Date(),
    });
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.writeLog({
      level: 'warn',
      message,
      context: context || this.context,
      metadata,
      timestamp: new Date(),
    });
  }

  debug(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.writeLog({
      level: 'debug',
      message,
      context: context || this.context,
      metadata,
      timestamp: new Date(),
    });
  }

  verbose(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.debug(message, context, metadata);
  }

  fatal(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.writeLog({
      level: 'fatal',
      message,
      context: context || this.context,
      metadata,
      timestamp: new Date(),
    });
  }

  private async writeLog(entry: LogEntry) {
    try {
      // Console logging for development
      if (process.env['NODE_ENV'] === 'development') {
        const logMessage = `[${entry.timestamp?.toISOString()}] ${entry.level.toUpperCase()} [${entry.context}] ${entry.message}`;
        
        switch (entry.level) {
          case 'error':
          case 'fatal':
            // eslint-disable-next-line no-console
            console.error(logMessage, entry.metadata);
            break;
          case 'warn':
            // eslint-disable-next-line no-console
            console.warn(logMessage, entry.metadata);
            break;
          case 'debug':
            // eslint-disable-next-line no-console
            console.debug(logMessage, entry.metadata);
            break;
          default:
            // eslint-disable-next-line no-console
            console.log(logMessage, entry.metadata);
        }
      }

      // Database logging for production
      if (process.env['NODE_ENV'] === 'production') {
        await this.prisma.auditLog.create({
          data: {
            tenantId: entry.tenantId,
            userId: entry.userId,
            action: `LOG_${entry.level.toUpperCase()}`,
            entityType: 'LOG_ENTRY',
            entityId: entry.requestId,
            changes: {
              message: entry.message,
              context: entry.context,
              metadata: entry.metadata,
            } as any,
            metadata: {
              level: entry.level,
              timestamp: entry.timestamp,
            },
            ipAddress: entry.metadata?.['ipAddress'] as string,
            userAgent: entry.metadata?.['userAgent'] as string,
          },
        });
      }

      // External logging service integration (e.g., Sentry, DataDog, etc.)
      if (entry.level === 'error' || entry.level === 'fatal') {
        await this.sendToExternalService(entry);
      }
    } catch (error) {
      // Fallback to console if database logging fails
      // eslint-disable-next-line no-console
      console.error('Failed to write log entry:', error);
      // eslint-disable-next-line no-console
      console.error('Original log entry:', entry);
    }
  }

  private async sendToExternalService(_entry: LogEntry) {
    // Integration with external logging services
    // This is a placeholder - implement based on your chosen service
    
    if (process.env['SENTRY_DSN']) {
      // Sentry integration
      // const Sentry = require('@sentry/node');
      // Sentry.captureException(new Error(entry.message), {
      //   tags: {
      //     level: entry.level,
      //     context: entry.context,
      //   },
      //   extra: entry.metadata,
      //   user: entry.userId ? { id: entry.userId } : undefined,
      // });
    }

    if (process.env['DATADOG_API_KEY']) {
      // DataDog integration
      // const dogapi = require('dogapi');
      // dogapi.event.create(entry.message, {
      //   title: `Application ${entry.level}`,
      //   text: entry.message,
      //   priority: entry.level === 'fatal' ? 'high' : 'normal',
      //   tags: [`level:${entry.level}`, `context:${entry.context}`],
      //   alert_type: entry.level === 'fatal' ? 'error' : 'info',
      // });
    }
  }

  // Structured logging methods
  async logUserAction(
    userId: string,
    tenantId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId,
        changes: changes as any,
        metadata: metadata as any,
        ipAddress: metadata?.['ipAddress'] as string,
        userAgent: metadata?.['userAgent'] as string,
      },
    });

    this.log(`User action: ${action}`, 'UserAction', {
      userId,
      tenantId,
      action,
      entityType,
      entityId,
      changes,
      ...metadata,
    });
  }

  async logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, unknown>
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: `SECURITY_${event.toUpperCase()}`,
        entityType: 'SECURITY_EVENT',
        changes: {
          event,
          severity,
          metadata,
        } as any,
        metadata: {
          severity,
          timestamp: new Date(),
        },
        ipAddress: metadata?.['ipAddress'] as string,
        userAgent: metadata?.['userAgent'] as string,
      },
    });

    const level = severity === 'critical' ? 'fatal' : severity === 'high' ? 'error' : 'warn';
    (this as any)[level](`Security event: ${event}`, 'Security', {
      event,
      severity,
      ...metadata,
    });
  }

  async logPerformanceMetric(
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ) {
    this.debug(`Performance metric: ${operation}`, 'Performance', {
      operation,
      duration,
      ...metadata,
    });

    // Store performance metrics in a separate table if needed
    // await this.prisma.performanceMetric.create({
    //   data: {
    //     operation,
    //     duration,
    //     metadata,
    //     timestamp: new Date(),
    //   },
    // });
  }
}