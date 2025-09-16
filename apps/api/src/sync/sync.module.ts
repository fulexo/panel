import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncImplementationService } from './sync-implementation.service';
import { PrismaService } from '../prisma.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [SyncService, SyncImplementationService, PrismaService],
  exports: [SyncService],
})
export class SyncModule {}