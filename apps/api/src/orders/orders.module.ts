import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, AuditService],
  exports: [OrdersService],
})
export class OrdersModule {}