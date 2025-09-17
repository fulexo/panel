import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { register } from 'prom-client';
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

  // CORS configuration
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.DOMAIN_APP || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      if (!origin) {
        // Allow requests with no origin (like mobile apps or curl requests)
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Log rejected origin for debugging
      // Origin rejected by CORS policy
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
    ],
  });

  // Enhanced security headers
  app.use((req, res, next) => {
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
  app.getHttpAdapter().get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Metrics endpoint
  app.getHttpAdapter().get('/metrics', (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
  });

  // JWKS endpoint
  app.getHttpAdapter().get('/auth/.well-known/jwks.json', (req, res) => {
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

  const port = process.env.PORT || 3000;
  await app.listen(port);
  // Application started successfully
  // API Documentation: http://localhost:${port}/api/docs
  // Health Check: http://localhost:${port}/health
  // Metrics: http://localhost:${port}/metrics
}

bootstrap().catch((error) => {
  // Failed to start application
  process.exit(1);
});