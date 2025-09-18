import { Module } from '@nestjs/common';
import { WooCommerceService } from './woo.service';

@Module({
  providers: [WooCommerceService],
  exports: [WooCommerceService],
})
export class WooCommerceModule {}