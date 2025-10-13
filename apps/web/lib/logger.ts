interface LogLevel {
  ERROR: 0;
  WARN: 1;
  INFO: 2;
  DEBUG: 3;
}

const LOG_LEVELS: LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

class Logger {
  private level: number;
  private service: string;

  constructor(service: string = 'web') {
    this.service = service;
    const rawLevel = (process.env['LOG_LEVEL'] || '').toString().toUpperCase();
    this.level = LOG_LEVELS[(rawLevel as keyof LogLevel)] ?? LOG_LEVELS.INFO;
  }

  private shouldLog(level: number): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, meta?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      service: this.service,
      message,
      ...(meta && { meta }),
    };
    return JSON.stringify(logEntry);
  }

  error(message: string, meta?: Record<string, unknown> | Error | unknown, additional?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      let logData: Record<string, unknown> = {};
      
      if (meta instanceof Error) {
        logData = { error: meta.message, stack: meta.stack };
      } else if (typeof meta === 'object' && meta !== null) {
        logData = meta as Record<string, unknown>;
      } else if (meta !== undefined) {
        logData = { value: meta };
      }
      
      if (additional) {
        logData = { ...logData, ...additional };
      }
      
      console.error(this.formatMessage('ERROR', message, logData));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown> | unknown, additional?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      let logData: Record<string, unknown> = {};
      
      if (typeof meta === 'object' && meta !== null) {
        logData = meta as Record<string, unknown>;
      } else if (meta !== undefined) {
        logData = { value: meta };
      }
      
      if (additional) {
        logData = { ...logData, ...additional };
      }
      
      console.log(this.formatMessage('INFO', message, logData));
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      // Use console.debug directly with proper formatting
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }
}

export const logger = new Logger('web');
export default Logger;