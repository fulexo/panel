export function validateEnvOnStartup() {
  // Basic environment validation for frontend
  const requiredEnvVars = [
    'NEXT_PUBLIC_API_BASE',
    'NEXT_PUBLIC_APP_URL',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}