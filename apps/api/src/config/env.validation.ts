import { SharedEnvironmentVariables, validateSharedEnvironment, validateSharedEnvOnStartup, sharedEnvValidationSchema } from './shared-env.validation';

// Re-export shared environment validation
export { SharedEnvironmentVariables, validateSharedEnvironment, validateSharedEnvOnStartup, sharedEnvValidationSchema };

// For backward compatibility
export const EnvironmentVariables = SharedEnvironmentVariables;
export const validateEnvironment = validateSharedEnvironment;
export const envValidationSchema = sharedEnvValidationSchema;

// Legacy function for backward compatibility
export function validateEnvOnStartup() {
  return validateSharedEnvOnStartup();
}