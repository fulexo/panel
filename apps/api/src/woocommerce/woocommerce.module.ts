import { Module } from '@nestjs/common';
import { WooCommerceService } from './woo.service';
import { PrismaModule } from '../modules/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WooCommerceService],
  exports: [WooCommerceService],
})
export class WooCommerceModule {}