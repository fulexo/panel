import { Module } from '@nestjs/common';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WooCommerceModule } from '../woocommerce/woocommerce.module';

@Module({
  imports: [PrismaModule, WooCommerceModule],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}