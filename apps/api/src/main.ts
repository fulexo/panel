import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { register } from 'prom-client';
import * as cookieParser from 'cookie-parser';
import { PrismaService } from './prisma.service';
import { validateEnvOnStartup } from './config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  // Validate environment variables
  validateEnvOnStartup();

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
      const isDevelopment = process.env['NODE_ENV'] === 'development';
      
      const allowedOrigins = isDevelopment ? [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ] : [
        process.env['DOMAIN_APP'],
        process.env['NEXT_PUBLIC_APP_URL'],
      ].filter(Boolean); // Remove undefined values

      if (!origin) {
        // Only allow requests with no origin in development
        if (isDevelopment) {
          return callback(null, true);
        }
        return callback(new Error('Origin required in production'), false);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Log rejected origin for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`CORS: Origin rejected: ${origin}`);
      }
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
    ],
    maxAge: 86400, // 24 hours
  });

  // Enhanced security headers
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
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
  SwaggerModule.setup('api/docs', app, document, {
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
        await app.get(PrismaService).$queryRaw`SELECT 1`;
        dbHealthy = true;
      } catch (error) {
        // Log database health check failure
        if (process.env.NODE_ENV === 'development') {
          console.error('Database health check failed:', error);
        }
      }
      
      // Check Redis connection
      let redisHealthy = false;
      try {
        const redis = new (require('ioredis'))(process.env['REDIS_URL'] || 'redis://valkey:6379/0');
        await redis.ping();
        redisHealthy = true;
        await redis.quit();
      } catch (error) {
        // Log Redis health check failure
        if (process.env.NODE_ENV === 'development') {
          console.error('Redis health check failed:', error);
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
  app.getHttpAdapter().get('/metrics', (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
  });

  // JWKS endpoint
  app.getHttpAdapter().get('/auth/.well-known/jwks.json', (_req, res) => {
    res.json({ keys: [] });
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

  const port = process.env['PORT'] || 3000;
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