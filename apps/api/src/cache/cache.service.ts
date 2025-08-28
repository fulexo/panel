import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://valkey:6379/0');
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.setex(key, this.defaultTTL, serialized);
      }
    } catch (error) {
      console.error('Cache set error:', error);
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
      console.error('Cache delete error:', error);
    }
  }

  async flush(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache flush error:', error);
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
  orderListKey(tenantId: string, page: number, filters: any): string {
    const filterHash = this.hashObject(filters);
    return this.generateKey('orders', 'list', tenantId, page, filterHash);
  }

  orderDetailKey(orderId: string): string {
    return this.generateKey('orders', 'detail', orderId);
  }

  productListKey(tenantId: string, page: number, filters: any): string {
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

  private hashObject(obj: any): string {
    const crypto = require('crypto');
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('md5').update(str).digest('hex');
  }

  // Cache invalidation helpers
  async invalidateOrderCache(tenantId: string, orderId?: string): Promise<void> {
    if (orderId) {
      await this.del(this.orderDetailKey(orderId));
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
  async getStats(): Promise<any> {
    const info = await this.redis.info('stats');
    const dbSize = await this.redis.dbsize();
    return {
      dbSize,
      info,
    };
  }
}