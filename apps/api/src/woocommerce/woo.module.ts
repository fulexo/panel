import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WooCommerceService } from './woo.service';
import { WooController } from './woo.controller';

@Module({
  providers: [PrismaService, WooCommerceService],
  controllers: [WooController],
  exports: [WooCommerceService],
})
export class WooCommerceModule {}