const { plainToClass } = require('class-transformer');
const { IsString, IsOptional, validateSync, IsEnum, MinLength } = require('class-validator');

const Environment = {
  Development: 'development',
  Production: 'production',
  Test: 'test',
};

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV = Environment.Development;

  @IsString()
  DATABASE_URL;

  @IsString()
  REDIS_URL;

  @IsString()
  @IsOptional()
  WORKER_PORT = '3002';

  // Add encryption key validation for consistency
  @IsString()
  @IsOptional()
  @MinLength(32)
  ENCRYPTION_KEY;

  // Add JWT secret validation for consistency
  @IsString()
  @IsOptional()
  @MinLength(64)
  JWT_SECRET;
}

function validateEnvironment(config = process.env) {
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

module.exports = { validateEnvironment };