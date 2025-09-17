import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface ErrorContext {
  userId?: string;
  tenantId?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleError(
    error: Error,
    context: ErrorContext = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      severity,
      context,
      timestamp: new Date(),
    };

    // Log to console based on severity
    switch (severity) {
      case 'critical':
        this.logger.error('CRITICAL ERROR', errorInfo);
        break;
      case 'high':
        this.logger.error('HIGH SEVERITY ERROR', errorInfo);
        break;
      case 'medium':
        this.logger.warn('MEDIUM SEVERITY ERROR', errorInfo);
        break;
      case 'low':
        this.logger.log('LOW SEVERITY ERROR', errorInfo);
        break;
    }

    // Store in database for critical and high severity errors
    if (severity === 'critical' || severity === 'high') {
      try {
        await this.storeErrorInDatabase(errorInfo);
      } catch (dbError) {
        this.logger.error('Failed to store error in database', dbError);
      }
    }

    // Send alerts for critical errors
    if (severity === 'critical') {
      await this.sendCriticalErrorAlert(errorInfo);
    }
  }

  private async storeErrorInDatabase(errorInfo: Record<string, unknown>): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'ERROR_OCCURRED',
          entityType: 'ERROR',
          changes: {
            error: errorInfo,
          } as any,
          metadata: {
            severity: errorInfo['severity'],
            context: errorInfo['context'],
          } as any,
          tenantId: (errorInfo['context'] as any)?.tenantId,
          userId: (errorInfo['context'] as any)?.userId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to store error in audit log', error);
    }
  }

  private async sendCriticalErrorAlert(errorInfo: Record<string, unknown>): Promise<void> {
    this.logger.error('CRITICAL ERROR ALERT - Manual intervention required', errorInfo);
    
    try {
      // Send to monitoring service (Prometheus, DataDog, etc.)
      await this.sendToMonitoringService(errorInfo);
      
      // Send email notification if configured
      if (process.env['ALERT_EMAIL']) {
        await this.sendEmailAlert(errorInfo);
      }
      
      // Send Slack notification if configured
      if (process.env['SLACK_WEBHOOK_URL']) {
        await this.sendSlackAlert(errorInfo);
      }
    } catch (alertError) {
      this.logger.error('Failed to send critical error alert', alertError);
    }
  }

  private async sendToMonitoringService(errorInfo: Record<string, unknown>): Promise<void> {
    // Implementation for monitoring service integration
    // This could be Prometheus, DataDog, New Relic, etc.
    this.logger.debug('Sending error to monitoring service', errorInfo);
  }

  private async sendEmailAlert(errorInfo: Record<string, unknown>): Promise<void> {
    // Implementation for email alerts
    this.logger.debug('Sending email alert', errorInfo);
  }

  private async sendSlackAlert(errorInfo: Record<string, unknown>): Promise<void> {
    // Implementation for Slack alerts
    this.logger.debug('Sending Slack alert', errorInfo);
  }

  async handleDatabaseError(error: Error | unknown, context: ErrorContext = {}): Promise<void> {
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let message = 'Database operation failed';

    if (error instanceof Error) {
      message = error.message;
      
      // Determine severity based on error type
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        severity = 'high';
      } else if (error.message.includes('constraint') || error.message.includes('foreign key')) {
        severity = 'medium';
      } else if (error.message.includes('not found')) {
        severity = 'low';
      }
    }

    await this.handleError(new Error(`Database Error: ${message}`), {
      ...context,
      action: 'DATABASE_OPERATION',
      resource: 'DATABASE',
    }, severity);
  }

  async handleValidationError(error: Error | unknown, context: ErrorContext = {}): Promise<void> {
    await this.handleError(new Error(`Validation Error: ${(error as any).message}`), {
      ...context,
      action: 'VALIDATION',
      resource: 'INPUT_VALIDATION',
    }, 'low');
  }

  async handleAuthenticationError(error: Error | unknown, context: ErrorContext = {}): Promise<void> {
    await this.handleError(new Error(`Authentication Error: ${(error as any).message}`), {
      ...context,
      action: 'AUTHENTICATION',
      resource: 'AUTH',
    }, 'medium');
  }

  async handleAuthorizationError(error: Error | unknown, context: ErrorContext = {}): Promise<void> {
    await this.handleError(new Error(`Authorization Error: ${(error as any).message}`), {
      ...context,
      action: 'AUTHORIZATION',
      resource: 'AUTH',
    }, 'medium');
  }

  async handleExternalServiceError(service: string, error: Error | unknown, context: ErrorContext = {}): Promise<void> {
    await this.handleError(new Error(`External Service Error (${service}): ${(error as any).message}`), {
      ...context,
      action: 'EXTERNAL_SERVICE_CALL',
      resource: service.toUpperCase(),
    }, 'high');
  }
}