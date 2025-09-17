import { plainToClass } from 'class-transformer';
import { IsString, IsEnum, IsOptional, validateSync, MinLength, IsPort, IsUrl } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class SharedEnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsPort()
  @IsOptional()
  PORT?: string = '3000';

  // Database
  @IsString()
  DATABASE_URL!: string;

  // Redis
  @IsString()
  REDIS_URL!: string;

  // Security
  @IsString()
  @MinLength(64)
  JWT_SECRET!: string;

  @IsString()
  @MinLength(32)
  ENCRYPTION_KEY!: string;

  // Domains
  @IsString()
  @IsUrl()
  DOMAIN_API!: string;

  @IsString()
  @IsUrl()
  DOMAIN_APP!: string;

  // Frontend URLs
  @IsString()
  @IsUrl()
  NEXT_PUBLIC_API_BASE!: string;

  @IsString()
  @IsUrl()
  NEXT_PUBLIC_APP_URL!: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  SHARE_BASE_URL?: string;

  // S3/MinIO
  @IsString()
  @IsUrl()
  S3_ENDPOINT!: string;

  @IsString()
  S3_ACCESS_KEY!: string;

  @IsString()
  S3_SECRET_KEY!: string;

  @IsString()
  S3_BUCKET!: string;

  // Optional
  @IsString()
  @IsOptional()
  SHARE_TOKEN_SECRET?: string;

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string = 'info';

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsPort()
  @IsOptional()
  SMTP_PORT?: string;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string;

  // Additional security
  @IsString()
  @IsOptional()
  MASTER_KEY_HEX?: string;

  // Worker specific
  @IsPort()
  @IsOptional()
  WORKER_PORT?: string = '3002';
}

export function validateSharedEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(SharedEnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(error => {
      const constraints = error.constraints ? Object.values(error.constraints).join(', ') : '';
      return `${error.property}: ${constraints}`;
    }).join('\n');
    
    throw new Error(`Environment validation failed:\n${errorMessages}`);
  }

  return validatedConfig;
}

export function validateSharedEnvOnStartup() {
  try {
    const config = validateSharedEnvironment(process.env);
    
    // Additional security checks
    if (config.NODE_ENV === Environment.Production) {
      // Check for weak secrets in production
      if (config.JWT_SECRET.length < 64) {
        throw new Error('JWT_SECRET must be at least 64 characters in production');
      }
      
      if (config.ENCRYPTION_KEY.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be exactly 32 characters');
      }
      
      // Check for secure URLs in production
      if (!config.DATABASE_URL.startsWith('postgresql://')) {
        throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
      }
      
      if (!config.REDIS_URL.startsWith('redis://') && !config.REDIS_URL.startsWith('rediss://')) {
        throw new Error('REDIS_URL must be a valid Redis connection string');
      }
      
      // Check for default values
      if (config.DATABASE_URL.includes('localhost') || config.DATABASE_URL.includes('127.0.0.1')) {
        throw new Error('DATABASE_URL must not use localhost in production');
      }
      
      if (config.REDIS_URL.includes('localhost') || config.REDIS_URL.includes('127.0.0.1')) {
        throw new Error('REDIS_URL must not use localhost in production');
      }
    } else {
      // Development environment - warn about weak secrets but don't fail
      if (config.JWT_SECRET && config.JWT_SECRET.length < 64) {
        console.warn('WARNING: JWT_SECRET is shorter than 64 characters. This is not recommended for production.');
      }
      
      if (config.ENCRYPTION_KEY && config.ENCRYPTION_KEY.length !== 32) {
        console.warn('WARNING: ENCRYPTION_KEY should be exactly 32 characters for production.');
      }
    }
    
    return config;
  } catch (error) {
    // Environment validation failed
    console.error('Environment validation failed:', error instanceof Error ? error.message : String(error));
    
    // Only exit in production, allow development to continue with warnings
    if (process.env['NODE_ENV'] === 'production') {
      process.exit(1);
    }
    
    return undefined;
  }
}

export const sharedEnvValidationSchema = {
  validate: (config: Record<string, unknown>) => {
    return validateSharedEnvironment(config);
  },
  type: 'object',
  required: [
    'DATABASE_URL', 
    'REDIS_URL', 
    'JWT_SECRET', 
    'ENCRYPTION_KEY', 
    'DOMAIN_API', 
    'DOMAIN_APP', 
    'NEXT_PUBLIC_API_BASE',
    'NEXT_PUBLIC_APP_URL',
    'S3_ENDPOINT', 
    'S3_ACCESS_KEY', 
    'S3_SECRET_KEY', 
    'S3_BUCKET'
  ],
  properties: {
    NODE_ENV: { type: 'string', enum: ['development', 'production', 'test'], default: 'development' },
    PORT: { type: 'string', default: '3000' },
    DATABASE_URL: { type: 'string' },
    REDIS_URL: { type: 'string' },
    JWT_SECRET: { type: 'string', minLength: 64 },
    ENCRYPTION_KEY: { type: 'string', minLength: 32 },
    DOMAIN_API: { type: 'string' },
    DOMAIN_APP: { type: 'string' },
    NEXT_PUBLIC_API_BASE: { type: 'string' },
    NEXT_PUBLIC_APP_URL: { type: 'string' },
    S3_ENDPOINT: { type: 'string' },
    S3_ACCESS_KEY: { type: 'string' },
    S3_SECRET_KEY: { type: 'string' },
    S3_BUCKET: { type: 'string' },
    SHARE_TOKEN_SECRET: { type: 'string' },
    LOG_LEVEL: { type: 'string', default: 'info' },
    SMTP_HOST: { type: 'string' },
    SMTP_PORT: { type: 'string' },
    SMTP_USER: { type: 'string' },
    SMTP_PASS: { type: 'string' },
    SMTP_FROM: { type: 'string' },
  },
  additionalProperties: false,
};