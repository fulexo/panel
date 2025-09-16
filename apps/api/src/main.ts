import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Get, Controller, Res, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { register } from 'prom-client';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { JwtService } from './jwt';
import { JwtModule } from './jwt.module';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { ProductsModule } from './products/products.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ReturnsModule } from './returns/returns.module';
import { TenantsModule } from './tenants/tenants.module';
import { SearchModule } from './search/search.module';
import { RequestsModule } from './requests/requests.module';
import { CalendarModule } from './calendar/calendar.module';
import { BillingModule } from './billing/billing.module';
import { InboundModule } from './inbound/inbound.module';
import { PolicyModule } from './policy/policy.module';
import { CustomersModule } from './customers/customers.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { JobsController } from './jobs/jobs.controller';
import { WooModule } from './woocommerce/woo.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LoggerModule } from './logger/logger.module';
import { LoggerService } from './logger/logger.service';
import { PrismaService } from './prisma.service';
import { CacheModule } from './cache/cache.module';
import { SecurityModule } from './security/security.module';
import { AuditModule } from './audit/audit.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { JobsModule } from './jobs/jobs.module';
import { SyncModule } from './sync/sync.module';
import { UsersModule } from './users/users.module';
import { validateEnvOnStartup } from './config/env.validation';

import { Public } from './auth/decorators/public.decorator';
import { RateLimitGuard } from './rate-limit.guard';
@Controller('health')
class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get()
  async health(){
    const checks = {
      database: 'unknown',
      redis: 'unknown',
      minio: 'unknown',
    };

    try {
      // Database check
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch (error) {
      checks.database = 'error';
    }

    try {
      // Redis check
      const Redis = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL || 'redis://valkey:6379/0');
      await redis.ping();
      await redis.quit();
      checks.redis = 'ok';
    } catch (error) {
      checks.redis = 'error';
    }

    try {
      // MinIO check
      const Minio = require('minio');
      const minioClient = new Minio.Client({
        endPoint: process.env.S3_ENDPOINT?.replace('http://', '').replace('https://', '') || 'minio',
        port: 9000,
        useSSL: false,
        accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
      });
      await minioClient.bucketExists(process.env.S3_BUCKET || 'fulexo-cache');
      checks.minio = 'ok';
    } catch (error) {
      checks.minio = 'error';
    }

    const allHealthy = Object.values(checks).every(status => status === 'ok');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }
}

@Controller()
class MetricsController {
  @Get('metrics')
  async metrics(@Res() res: any){
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
  }
}

@Controller('auth/.well-known')
class JwksController {
  constructor(private readonly jwt: JwtService){}
  @Get('jwks.json')
  jwks(){
    return this.jwt.getJwks();
  }
}

@Module({
  imports: [
    LoggerModule,
    JwtModule,
    CacheModule,
    SecurityModule,
    AuditModule,
    RateLimitModule,
    JobsModule,
    SyncModule,
    UsersModule,
    AuthModule,
    OrdersModule,
    ShipmentsModule,
    ProductsModule,
    InvoicesModule,
    ReturnsModule,
    TenantsModule,
    RequestsModule,
    SearchModule,
    CalendarModule,
    BillingModule,
    InboundModule,
    PolicyModule,
    CustomersModule,
    PrismaModule,
    WooModule,
    SettingsModule,
  ],
  controllers: [HealthController, MetricsController, JwksController],
})
class AppModule {}

async function bootstrap(){
  // Validate environment variables first
  validateEnvOnStartup();
  
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Global rate limiting
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new RateLimitGuard(reflector));

  // CORS configuration
  app.enableCors({
    origin: (origin, cb) => {
      // In development, allow localhost origins
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      const allowedOrigins = new Set([
        process.env.DOMAIN_APP ? `https://${process.env.DOMAIN_APP}` : null,
        process.env.DOMAIN_API ? `https://${process.env.DOMAIN_API}` : null,
      ].filter(Boolean));
      
      // Add localhost origins in development
      if (isDevelopment) {
        allowedOrigins.add('http://localhost:3000');
        allowedOrigins.add('http://localhost:3001');
        allowedOrigins.add('http://127.0.0.1:3000');
        allowedOrigins.add('http://127.0.0.1:3001');
      }
      
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) return cb(null, true);
      
      // Check if origin is allowed
      if (allowedOrigins.has(origin)) {
        return cb(null, true);
      }
      
      // Log rejected origin for debugging
      console.warn(`CORS rejected origin: ${origin}`);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-WC-Webhook-Topic', 'X-WC-Webhook-Signature'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  });

  // Initialize JWT service
  const jwt = app.get(JwtService);
  await jwt.init();

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Fulexo API')
      .setDescription('Commerce Integration Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addServer('http://localhost:3000')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap().catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
