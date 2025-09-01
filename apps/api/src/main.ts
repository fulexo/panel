import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Get, Controller, Res, ValidationPipe } from '@nestjs/common';
import { register } from 'prom-client';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { JwtService } from './jwt';
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
import { WooModule } from './woocommerce/woo.module';

import { Public } from './auth/decorators/public.decorator';
@Controller('health')
class HealthController { 
  @Public()
  @Get() 
  health(){ 
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
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
  ],
  controllers: [HealthController, MetricsController, JwksController], 
  providers: [JwtService],
  exports: [JwtService]
})
class AppModule {}

async function bootstrap(){
  const app = await NestFactory.create(AppModule);
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // CORS configuration
  app.enableCors({
    origin: (origin, cb) => {
      return cb(null, true);
      const allowed = new Set([
        `https://${process.env.DOMAIN_APP}`,
        `https://${process.env.DOMAIN_API}`,
      ]);
      if (!origin || allowed.has(origin)) return cb(null, true);
      cb(new Error('CORS not allowed'));
    },
    credentials: true,
  });

  // Initialize JWT service
  const jwt = app.get(JwtService); 
  await jwt.init();
  
  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Fulexo API')
      .setDescription('BaseLinker Integration Platform API')
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