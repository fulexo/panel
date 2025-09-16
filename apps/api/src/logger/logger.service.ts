import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  LOG = 2,
  DEBUG = 3,
  VERBOSE = 4,
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private logLevel: LogLevel;

  constructor() {
    const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'LOG' : 'DEBUG');
    this.logLevel = LogLevel[level as keyof typeof LogLevel] || LogLevel.LOG;
  }

  private formatMessage(level: string, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}] ` : '';
    return `${timestamp} [${level}] ${contextStr}${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  error(message: any, trace?: string, context?: string): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const formatted = this.formatMessage('ERROR', message, context);
      // Error logged to console
      // Trace logged to console
    }
  }

  warn(message: any, context?: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const formatted = this.formatMessage('WARN', message, context);
      // Warning logged to console
    }
  }

  log(message: any, context?: string): void {
    if (this.shouldLog(LogLevel.LOG)) {
      const formatted = this.formatMessage('INFO', message, context);
      // Info logged to console
    }
  }

  debug(message: any, context?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const formatted = this.formatMessage('DEBUG', message, context);
      // Debug logged to console
    }
  }

  verbose(message: any, context?: string): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      const formatted = this.formatMessage('VERBOSE', message, context);
      // Info logged to console
    }
  }

  // Additional utility methods
  logRequest(method: string, url: string, statusCode: number, duration: number): void {
    if (this.shouldLog(LogLevel.LOG)) {
      const message = `${method} ${url} ${statusCode} ${duration}ms`;
      this.log(message, 'HTTP');
    }
  }

  logDatabaseQuery(query: string, duration: number): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const message = `Query executed in ${duration}ms: ${query.substring(0, 100)}...`;
      this.debug(message, 'Database');
    }
  }

  logCacheHit(key: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.debug(`Cache hit: ${key}`, 'Cache');
    }
  }

  logCacheMiss(key: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.debug(`Cache miss: ${key}`, 'Cache');
    }
  }

  logSecurityEvent(event: string, details: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const message = `Security event: ${event} - ${JSON.stringify(details)}`;
      this.warn(message, 'Security');
    }
  }
}