import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, TooManyRequestsException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { RedisRateLimiter } from './ratelimit';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private limiter: RedisRateLimiter;
  private redis: Redis;

  constructor(private reflector: Reflector) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://valkey:6379/0');
    this.limiter = new RedisRateLimiter(this.redis);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!opts) return true;

    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();
    const user = req.user;
    const id = opts.scope === 'user' && user?.sub ? user.sub : req.ip;
    const key = `rl:${opts.name}:${id}`;

    const res = await this.limiter.check(key, opts.limit, opts.windowMs);
    if (!res.allowed) {
      if (res.retryAfterMs) {
        try { res.setHeader('Retry-After', Math.ceil(Number(res.retryAfterMs) / 1000)); } catch {}
      }
      throw new TooManyRequestsException('Rate limit exceeded');
    }
    return true;
  }
}