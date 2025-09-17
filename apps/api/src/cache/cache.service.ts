import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes

  constructor(private logger: LoggerService) {
    this.redis = new Redis(process.env['REDIS_URL'] || 'redis://valkey:6379/0', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    this.logger.log('Cache service initialized', 'CacheService');
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed', 'CacheService');
    } catch (error) {
      this.logger.error(`Error closing Redis connection: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined, 'CacheService');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined, 'CacheService');
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.setex(key, this.defaultTTL, serialized);
      }
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined, 'CacheService');
    }
  }

  async del(key: string | string[]): Promise<void> {
    try {
      if (Array.isArray(key)) {
        if (key.length > 0) {
          await this.redis.del(...key);
        }
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      this.logger.error(`Cache delete error: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined, 'CacheService');
    }
  }

  async flush(pattern: string): Promise<void> {
    try {
      // Use SCAN to avoid blocking Redis with KEYS on large datasets
      let cursor = '0';
      const toDelete: string[] = [];
      do {
        const res: [string, string[]] = await (this.redis as unknown as { scan: (cursor: string, ...args: string[]) => Promise<[string, string[]]> }).scan(cursor, 'MATCH', pattern, 'COUNT', '1000');
        cursor = res[0];
        const batch: string[] = res[1] || [];
        if (batch.length) toDelete.push(...batch);
      } while (cursor !== '0');
      if (toDelete.length > 0) {
        await this.redis.del(...toDelete);
      }
    } catch (error) {
      this.logger.error(`Cache flush error for pattern ${pattern}: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined, 'CacheService');
    }
  }

  async remember<T>(key: string, ttl: number, callback: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await callback();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  generateKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }

  // Cache key helpers
  orderListKey(tenantId: string, page: number, filters: Record<string, unknown>): string {
    const filterHash = this.hashObject(filters);
    return this.generateKey('orders', 'list', tenantId, page, filterHash);
  }

  orderDetailKey(orderId: string, role?: string): string {
    const roleSuffix = role ? `:${role}` : '';
    return this.generateKey('orders', 'detail', orderId + roleSuffix);
  }

  productListKey(tenantId: string, page: number, filters: Record<string, unknown>): string {
    const filterHash = this.hashObject(filters);
    return this.generateKey('products', 'list', tenantId, page, filterHash);
  }

  productDetailKey(productId: string): string {
    return this.generateKey('products', 'detail', productId);
  }

  userSessionKey(userId: string): string {
    return this.generateKey('sessions', userId);
  }

  rateLimitKey(identifier: string): string {
    return this.generateKey('ratelimit', identifier);
  }

  private hashObject(obj: Record<string, unknown>): string {
    const crypto = require('crypto');
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    // Use SHA256 instead of MD5 for better security and collision resistance
    return crypto.createHash('sha256').update(str).digest('hex').substring(0, 16);
  }

  // Cache invalidation helpers
  async invalidateOrderCache(tenantId: string, orderId?: string): Promise<void> {
    if (orderId) {
      // Invalidate all role-based order detail caches
      await this.del(this.orderDetailKey(orderId)); // Base key
      await this.del(this.orderDetailKey(orderId, 'ADMIN')); // Admin view
      await this.del(this.orderDetailKey(orderId, 'CUSTOMER')); // Customer view
    }
    // Invalidate all list caches for this tenant
    await this.flush(`orders:list:${tenantId}:*`);
  }

  async invalidateProductCache(tenantId: string, productId?: string): Promise<void> {
    if (productId) {
      await this.del(this.productDetailKey(productId));
    }
    await this.flush(`products:list:${tenantId}:*`);
  }

  // Stats and monitoring
  async getStats(): Promise<{ dbSize: number; info: string }> {
    const info = await this.redis.info('stats');
    const dbSize = await this.redis.dbsize();
    return {
      dbSize,
      info,
    };
  }
}