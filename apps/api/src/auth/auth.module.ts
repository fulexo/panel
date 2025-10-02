import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TwoFactorService } from './twofactor.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { RateLimitGuard } from '../rate-limit.guard';
import { JwtService } from '../jwt';
import { InternalAuthGuard } from './internal-auth.guard';

@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    TwoFactorService,
    JwtService,
    PrismaService,
    AuditService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    InternalAuthGuard,
  ],
  exports: [AuthService, SessionService, InternalAuthGuard],
})
export class AuthModule {}
