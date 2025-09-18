import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WooService } from './woo.service';
import { WooController } from './woo.controller';

@Module({
  providers: [PrismaService, WooService],
  controllers: [WooController],
  exports: [WooService],
})
export class WooCommerceModule {}