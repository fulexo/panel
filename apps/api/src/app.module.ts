import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { ReturnsModule } from './returns/returns.module';
import { InvoicesModule } from './invoices/invoices.module';
import { BillingModule } from './billing/billing.module';
import { CustomersModule } from './customers/customers.module';
import { SearchModule } from './search/search.module';
import { RequestsModule } from './requests/requests.module';
import { CalendarModule } from './calendar/calendar.module';
import { InboundModule } from './inbound/inbound.module';
import { JobsModule } from './jobs/jobs.module';
import { SyncModule } from './sync/sync.module';
import { WooModule } from './woocommerce/woo.module';
import { SecurityModule } from './security/security.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';
import { RateLimitGuard } from './rate-limit.guard';
import { CacheModule } from './cache/cache.module';
import { LoggerModule } from './logger/logger.module';
import { AuditModule } from './audit/audit.module';
import { JwtModule } from './jwt.module';
import { PrismaService } from './prisma.service';
import { envValidationSchema } from './config/env.validation';
import { CookieAuthMiddleware } from './common/middleware/cookie-auth.middleware';
import { MonitoringService } from './common/services/monitoring.service';
import { MonitoringModule } from './monitoring/monitoring.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    LoggerModule,
    JwtModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    OrdersModule,
    ProductsModule,
    ShipmentsModule,
    ReturnsModule,
    InvoicesModule,
    BillingModule,
    CustomersModule,
    SearchModule,
    RequestsModule,
    CalendarModule,
    InboundModule,
    JobsModule,
    SyncModule,
    WooModule,
    SecurityModule,
    RateLimitModule,
    CacheModule,
    AuditModule,
    MonitoringModule,
  ],
  providers: [
    PrismaService,
    MonitoringService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CookieAuthMiddleware)
      .forRoutes('*');
  }
}