const { validateSync } = require('class-validator');
const { plainToClass } = require('class-transformer');

class EnvironmentVariables {
  constructor() {
    this.NODE_ENV = process.env.NODE_ENV || 'development';
    this.DATABASE_URL = process.env.DATABASE_URL;
    this.REDIS_URL = process.env.REDIS_URL || 'redis://valkey:6379/0';
    this.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
  }

  validate() {
    const errors = [];
    
    if (!this.DATABASE_URL) {
      errors.push('DATABASE_URL is required');
    }
    
    if (!this.REDIS_URL) {
      errors.push('REDIS_URL is required');
    }
    
    if (this.NODE_ENV === 'production') {
      if (this.DATABASE_URL.includes('localhost') || this.DATABASE_URL.includes('127.0.0.1')) {
        errors.push('DATABASE_URL must not use localhost in production');
      }
      
      if (this.REDIS_URL.includes('localhost') || this.REDIS_URL.includes('127.0.0.1')) {
        errors.push('REDIS_URL must not use localhost in production');
      }
    }
    
    return errors;
  }
}

function validateEnvironment() {
  try {
    const config = new EnvironmentVariables();
    const errors = config.validate();
    
    if (errors.length > 0) {
      console.error('❌ Worker environment validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      } else {
        console.warn('⚠️  Continuing in development mode with warnings');
      }
    } else {
      console.log('✅ Worker environment variables validated successfully');
    }
    
    return config;
  } catch (error) {
    console.error('❌ Worker environment validation error:', error.message);
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

module.exports = { validateEnvironment };