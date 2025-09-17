import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { RedisRateLimiter } from './ratelimit';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private limiter: RedisRateLimiter;
  private redis: Redis;

  constructor(private reflector: Reflector) {
    this.redis = new Redis(process.env['REDIS_URL'] || 'redis://valkey:6379/0');
    this.limiter = new RedisRateLimiter(this.redis);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!opts) return true;

    const httpRef = context.switchToHttp();
    const req = httpRef.getRequest();
    const res = httpRef.getResponse();
    const user = req.user;
    const id = opts.scope === 'user' && user?.sub ? user.sub : req.ip;
    const key = `rl:${opts.scope || 'ip'}:${id}`;

    try {
      const rl = await this.limiter.check(key, opts.points, opts.duration);
      if (!rl.allowed) {
        if (rl.retryAfterMs) {
          try { res.setHeader('Retry-After', Math.ceil(Number(rl.retryAfterMs) / 1000)); } catch {}
        }
        throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
      return true;
    } catch (e) {
      // If Redis/ratelimiter is unavailable, fail-open to avoid blocking auth completely
      return true;
    }
  }
}