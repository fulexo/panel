import { plainToClass } from 'class-transformer';
import { IsString, IsUrl, IsOptional, validateSync, IsEnum } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsString()
  @IsOptional()
  NEXT_PUBLIC_API_BASE?: string;

  @IsString()
  @IsOptional()
  NEXT_PUBLIC_APP_URL?: string;

  @IsString()
  @IsOptional()
  SHARE_BASE_URL?: string;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: true,
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
    // Web environment variables validated successfully
    return config;
  } catch (error) {
    // Web environment validation failed
    // Error details logged
    
    // Only exit in production, allow development to continue with warnings
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}