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

  constructor(service: string = 'worker') {
    this.service = service;
    this.level = LOG_LEVELS[process.env['LOG_LEVEL'] as keyof LogLevel] || LOG_LEVELS.INFO;
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

  error(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.ERROR)) {
      // eslint-disable-next-line no-console
      console.error(this.formatMessage('ERROR', message, meta));
    }
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      // eslint-disable-next-line no-console
      console.warn(this.formatMessage('WARN', message, meta));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('INFO', message, meta));
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      // eslint-disable-next-line no-console
      console.log(this.formatMessage('DEBUG', message, meta));
    }
  }
}

export const logger = new Logger('worker');
export default Logger;