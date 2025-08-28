import { Module } from '@nestjs/common';
import { InboundController } from './inbound.controller';
import { InboundService } from './inbound.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [InboundController],
  providers: [InboundService, PrismaService],
  exports: [InboundService],
})
export class InboundModule {}

