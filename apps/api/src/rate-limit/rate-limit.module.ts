import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../rate-limit.guard';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [RateLimitGuard],
  exports: [RateLimitGuard],
})
export class RateLimitModule {}