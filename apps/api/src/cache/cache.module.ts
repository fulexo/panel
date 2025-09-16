import { Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}