import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [RequestsController],
  providers: [RequestsService, PrismaService, AuditService],
  exports: [RequestsService],
})
export class RequestsModule {}