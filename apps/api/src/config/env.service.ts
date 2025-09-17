import { Injectable } from '@nestjs/common';
import { SharedEnvironmentVariables } from './shared-env.validation';

@Injectable()
export class EnvService {
  private readonly config: SharedEnvironmentVariables;

  constructor() {
    this.config = this.validateAndLoadConfig();
  }

  private validateAndLoadConfig(): SharedEnvironmentVariables {
    const config = {
      NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',
      PORT: process.env.PORT || '3000',
      DATABASE_URL: process.env.DATABASE_URL!,
      REDIS_URL: process.env.REDIS_URL!,
      JWT_SECRET: process.env.JWT_SECRET!,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
      DOMAIN_API: process.env.DOMAIN_API!,
      DOMAIN_APP: process.env.DOMAIN_APP!,
      NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE!,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL!,
      SHARE_BASE_URL: process.env.SHARE_BASE_URL,
      S3_ENDPOINT: process.env.S3_ENDPOINT!,
      S3_ACCESS_KEY: process.env.S3_ACCESS_KEY!,
      S3_SECRET_KEY: process.env.S3_SECRET_KEY!,
      S3_BUCKET: process.env.S3_BUCKET!,
      SHARE_TOKEN_SECRET: process.env.SHARE_TOKEN_SECRET,
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASS: process.env.SMTP_PASS,
      SMTP_FROM: process.env.SMTP_FROM,
      MASTER_KEY_HEX: process.env.MASTER_KEY_HEX,
      WORKER_PORT: process.env.WORKER_PORT || '3002',
    };

    // Validate required fields
    const requiredFields = [
      'DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'ENCRYPTION_KEY',
      'DOMAIN_API', 'DOMAIN_APP', 'NEXT_PUBLIC_API_BASE', 'NEXT_PUBLIC_APP_URL',
      'S3_ENDPOINT', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET'
    ];

    for (const field of requiredFields) {
      if (!config[field as keyof SharedEnvironmentVariables]) {
        throw new Error(`Required environment variable ${field} is not set`);
      }
    }

    return config as SharedEnvironmentVariables;
  }

  // Getters for type-safe access
  get nodeEnv(): 'development' | 'production' | 'test' {
    return this.config.NODE_ENV;
  }

  get port(): string {
    return this.config.PORT;
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get redisUrl(): string {
    return this.config.REDIS_URL;
  }

  get jwtSecret(): string {
    return this.config.JWT_SECRET;
  }

  get encryptionKey(): string {
    return this.config.ENCRYPTION_KEY;
  }

  get domainApi(): string {
    return this.config.DOMAIN_API;
  }

  get domainApp(): string {
    return this.config.DOMAIN_APP;
  }

  get nextPublicApiBase(): string {
    return this.config.NEXT_PUBLIC_API_BASE;
  }

  get nextPublicAppUrl(): string {
    return this.config.NEXT_PUBLIC_APP_URL;
  }

  get shareBaseUrl(): string | undefined {
    return this.config.SHARE_BASE_URL;
  }

  get s3Endpoint(): string {
    return this.config.S3_ENDPOINT;
  }

  get s3AccessKey(): string {
    return this.config.S3_ACCESS_KEY;
  }

  get s3SecretKey(): string {
    return this.config.S3_SECRET_KEY;
  }

  get s3Bucket(): string {
    return this.config.S3_BUCKET;
  }

  get shareTokenSecret(): string | undefined {
    return this.config.SHARE_TOKEN_SECRET;
  }

  get logLevel(): string {
    return this.config.LOG_LEVEL;
  }

  get smtpHost(): string | undefined {
    return this.config.SMTP_HOST;
  }

  get smtpPort(): string | undefined {
    return this.config.SMTP_PORT;
  }

  get smtpUser(): string | undefined {
    return this.config.SMTP_USER;
  }

  get smtpPass(): string | undefined {
    return this.config.SMTP_PASS;
  }

  get smtpFrom(): string | undefined {
    return this.config.SMTP_FROM;
  }

  get masterKeyHex(): string | undefined {
    return this.config.MASTER_KEY_HEX;
  }

  get workerPort(): string {
    return this.config.WORKER_PORT;
  }

  // Utility methods
  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  // Get all config (for debugging only)
  getAllConfig(): Readonly<SharedEnvironmentVariables> {
    return Object.freeze({ ...this.config });
  }
}