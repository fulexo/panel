/**
 * @fileoverview Main application bootstrap file for Fulexo API
 * @description This file initializes the NestJS application with all necessary middleware,
 * security configurations, CORS settings, and Swagger documentation.
 * @author Fulexo Team
 * @version 1.0.0
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { register } from 'prom-client';
import cookieParser from 'cookie-parser';
import { PrismaService } from './prisma.service';
import { validateEnvOnStartup } from './config/env.validation';
import { EnvService } from './config/env.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppModule } from './app.module';
import { Request, Response, NextFunction } from 'express';

/**
 * Bootstrap function to initialize and configure the NestJS application
 * 
 * This function:
 * 1. Validates environment variables
 * 2. Creates the NestJS application instance
 * 3. Configures global middleware (validation, CORS, security headers)
 * 4. Sets up Swagger documentation
 * 5. Configures health check and metrics endpoints
 * 6. Starts the application server
 * 
 * @async
 * @function bootstrap
 * @returns {Promise<void>} Promise that resolves when the application is ready
 * 
 * @example
 * ```typescript
 * // The application will be available at:
 * // - API: http://localhost:3000/api
 * // - Docs: http://localhost:3000/api/docs
 * // - Health: http://localhost:3000/health
 * // - Metrics: http://localhost:3000/metrics
 * ```
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Validate environment variables
  validateEnvOnStartup();
  
  // Initialize environment service
  const envService = new EnvService();

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: false,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Cookie parser
  app.use(cookieParser());

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // CORS configuration
  app.enableCors({
    origin: (origin, callback) => {
      const isDevelopment = envService.isDevelopment;
      
      // Get allowed origins from environment variables
      const allowedOrigins = isDevelopment ? [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3002',
      ] : [
        envService.domainApp,
        envService.nextPublicAppUrl,
        envService.shareBaseUrl,
        envService.nextPublicAppUrl, // FRONTEND_URL
        envService.nextPublicAppUrl, // WEB_URL
      ].filter(Boolean); // Remove undefined values

      // Validate that we have at least one allowed origin in production
      if (!isDevelopment && allowedOrigins.length === 0) {
        logger.error('No allowed origins configured for production');
        return callback(new Error('CORS configuration error'), false);
      }

      if (!origin) {
        // Only allow requests with no origin in development
        if (isDevelopment) {
          return callback(null, true);
        }
        return callback(new Error('Origin required in production'), false);
      }

      // Validate origin format
      try {
        const url = new URL(origin);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return callback(new Error('Invalid protocol'), false);
        }
      } catch {
        return callback(new Error('Invalid origin format'), false);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Log rejected origin for debugging
      logger.warn(`CORS: Origin rejected: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-Tenant-ID',
      'X-WC-Webhook-Topic',
      'X-WC-Webhook-Signature',
      'Cookie',
      'Set-Cookie',
    ],
    exposedHeaders: [
      'Set-Cookie',
      'X-Total-Count',
      'X-Page-Count',
    ],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  });

  // Enhanced security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    next();
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Fulexo API')
    .setDescription('Fulexo E-commerce Management Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('tenants', 'Tenant management')
    .addTag('orders', 'Order management')
    .addTag('products', 'Product management')
    .addTag('shipments', 'Shipment management')
    .addTag('returns', 'Return management')
    .addTag('invoices', 'Invoice management')
    .addTag('billing', 'Billing management')
    .addTag('customers', 'Customer management')
    .addTag('search', 'Search functionality')
    .addTag('requests', 'Request management')
    .addTag('calendar', 'Calendar management')
    .addTag('inbound', 'Inbound management')
    .addTag('jobs', 'Background jobs')
    .addTag('sync', 'Data synchronization')
    .addTag('woo', 'WooCommerce integration')
    .addTag('settings', 'Settings management')
    .addTag('policy', 'Policy management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Health check endpoint
  app.getHttpAdapter().get('/health', async (_req, res) => {
    try {
      // Check database connection
      let dbHealthy = false;
      try {
        await (app.get(PrismaService) as any).$queryRaw`SELECT 1`;
        dbHealthy = true;
      } catch (error) {
        // Log database health check failure
        if (process.env['NODE_ENV'] === 'development') {
          logger.error('Database health check failed:', error);
        }
      }
      
      // Check Redis connection
      let redisHealthy = false;
      try {
        const Redis = require('ioredis');
        const redis = new Redis(envService.redisUrl);
        await redis.ping();
        redisHealthy = true;
        await redis.quit();
      } catch (error) {
        // Log Redis health check failure
        if (process.env['NODE_ENV'] === 'development') {
          logger.error('Redis health check failed:', error);
        }
      }
      
      const overallHealthy = dbHealthy && redisHealthy;
      
      if (overallHealthy) {
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          service: 'api',
          version: process.env['npm_package_version'] || '1.0.0',
          checks: {
            database: dbHealthy,
            redis: redisHealthy,
          }
        });
      } else {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          checks: {
            database: dbHealthy,
            redis: redisHealthy,
          }
        });
      }
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Metrics endpoint
  app.getHttpAdapter().get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  });

  // JWKS endpoint
  app.getHttpAdapter().get('/auth/.well-known/jwks.json', async (_req, res) => {
    try {
      const jwtService = app.get('JwtService');
      const jwks = await jwtService.getJwks();
      res.json(jwks);
    } catch {
      res.json({ keys: [] });
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    // SIGTERM received, shutting down gracefully
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    // SIGINT received, shutting down gracefully
    await app.close();
    process.exit(0);
  });

  const port = parseInt(envService.port, 10);
  await app.listen(port);
  // Application started successfully
  // API Documentation: http://localhost:${port}/api/docs
  // Health Check: http://localhost:${port}/health
  // Metrics: http://localhost:${port}/metrics
}

bootstrap().catch((_error) => {
  // Failed to start application
  process.exit(1);
});