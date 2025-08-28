import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma.service';
import { JwtService } from '../jwt';
import { SessionService } from '../auth/session.service';
import { AuditService } from '../audit/audit.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, PrismaService, JwtService, SessionService, AuditService],
  exports: [TenantsService],
})
export class TenantsModule {}