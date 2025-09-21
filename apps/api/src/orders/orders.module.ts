import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CartService } from './cart.service';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { InventoryRequestService } from './inventory-request.service';
import { InventoryRequestController } from './inventory-request.controller';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [OrdersController, ShippingController, InventoryRequestController],
  providers: [OrdersService, CartService, ShippingService, InventoryRequestService, PrismaService, AuditService],
  exports: [OrdersService, CartService, ShippingService, InventoryRequestService],
})
export class OrdersModule {}