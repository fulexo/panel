import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../cache/cache.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, AuditService, CacheService],
  exports: [OrdersService],
})
export class OrdersModule {}