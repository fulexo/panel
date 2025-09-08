import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, IsEnum, IsOptional, validateSync, IsUrl, MinLength, IsPort } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsPort()
  @IsOptional()
  PORT?: string = '3000';

  // Database
  @IsString()
  DATABASE_URL: string;

  // Redis
  @IsString()
  REDIS_URL: string;

  // Security
  @IsString()
  @MinLength(64)
  JWT_SECRET: string;

  @IsString()
  @MinLength(32)
  ENCRYPTION_KEY: string;

  // Domains
  @IsString()
  DOMAIN_API: string;

  @IsString()
  DOMAIN_APP: string;

  // S3/MinIO
  @IsString()
  S3_ENDPOINT: string;

  @IsString()
  S3_ACCESS_KEY: string;

  @IsString()
  S3_SECRET_KEY: string;

  @IsString()
  S3_BUCKET: string;

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
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
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

export function validateEnvOnStartup() {
  try {
    const config = validateEnvironment(process.env);
    console.log('✅ Environment variables validated successfully');
    return config;
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error.message);
    
    // Only exit in production, allow development to continue with warnings
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}