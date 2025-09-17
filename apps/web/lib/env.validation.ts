import { SharedEnvironmentVariables, validateSharedEnvironment } from '../shared-env.validation';

// Use shared environment validation for consistency
export const EnvironmentVariables = SharedEnvironmentVariables;

export function validateEnvironment(config: Record<string, unknown>) {
  return validateSharedEnvironment(config);
}

export function validateEnvOnStartup() {
  try {
    const config = validateEnvironment(process.env);
    // Web environment variables validated successfully
    return config;
  } catch (error) {
    // Web environment validation failed
    console.error('Web environment validation failed:', error.message);
    
    // Only exit in production, allow development to continue with warnings
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}