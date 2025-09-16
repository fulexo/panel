import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface ErrorContext {
  userId?: string;
  tenantId?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
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

  private async storeErrorInDatabase(errorInfo: any): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'ERROR_OCCURRED',
          entityType: 'ERROR',
          changes: {
            error: errorInfo,
          },
          metadata: {
            severity: errorInfo.severity,
            context: errorInfo.context,
          },
          tenantId: errorInfo.context.tenantId,
          userId: errorInfo.context.userId,
        },
      });
    } catch (error) {
      this.logger.error('Failed to store error in audit log', error);
    }
  }

  private async sendCriticalErrorAlert(errorInfo: any): Promise<void> {
    // TODO: Implement actual alert sending (email, Slack, etc.)
    this.logger.error('CRITICAL ERROR ALERT - Manual intervention required', errorInfo);
    
    // For now, just log to a separate file or send to monitoring service
    // In production, this should integrate with your alerting system
  }

  async handleDatabaseError(error: any, context: ErrorContext = {}): Promise<void> {
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

  async handleValidationError(error: any, context: ErrorContext = {}): Promise<void> {
    await this.handleError(new Error(`Validation Error: ${error.message}`), {
      ...context,
      action: 'VALIDATION',
      resource: 'INPUT_VALIDATION',
    }, 'low');
  }

  async handleAuthenticationError(error: any, context: ErrorContext = {}): Promise<void> {
    await this.handleError(new Error(`Authentication Error: ${error.message}`), {
      ...context,
      action: 'AUTHENTICATION',
      resource: 'AUTH',
    }, 'medium');
  }

  async handleAuthorizationError(error: any, context: ErrorContext = {}): Promise<void> {
    await this.handleError(new Error(`Authorization Error: ${error.message}`), {
      ...context,
      action: 'AUTHORIZATION',
      resource: 'AUTH',
    }, 'medium');
  }

  async handleExternalServiceError(service: string, error: any, context: ErrorContext = {}): Promise<void> {
    await this.handleError(new Error(`External Service Error (${service}): ${error.message}`), {
      ...context,
      action: 'EXTERNAL_SERVICE_CALL',
      resource: service.toUpperCase(),
    }, 'high');
  }
}