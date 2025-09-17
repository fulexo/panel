import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { RedisRateLimiter } from './ratelimit';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
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
    
    // Enhanced IP detection for better security
    const ip = req.ip || 
               req.connection?.remoteAddress || 
               req.socket?.remoteAddress ||
               (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
               req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
               'unknown';
    
    const id = opts.scope === 'user' && user?.sub ? user.sub : ip;
    const key = `rl:${opts.scope || 'ip'}:${id}`;

    // Add additional security checks
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /bot|crawler|spider|scraper/i.test(userAgent);
    
    // Apply stricter limits for bots
    const effectivePoints = isBot ? Math.floor(opts.points * 0.5) : opts.points;

    try {
      const rl = await this.limiter.check(key, effectivePoints, opts.duration);
      if (!rl.allowed) {
        if (rl.retryAfterMs) {
          try { 
            res.setHeader('Retry-After', Math.ceil(Number(rl.retryAfterMs) / 1000)); 
            res.setHeader('X-RateLimit-Limit', effectivePoints.toString());
            res.setHeader('X-RateLimit-Remaining', '0');
            res.setHeader('X-RateLimit-Reset', new Date(Date.now() + Number(rl.retryAfterMs)).toISOString());
          } catch {
            // Ignore header setting errors
          }
        }
        
        // Log rate limit violations for security monitoring
        // Use logger instead of console
        // console.warn(`Rate limit exceeded for ${opts.scope || 'ip'}:${id} on ${req.path}`, {
        //   ip,
        //   userAgent,
        //   path: req.path,
        //   method: req.method,
        //   isBot,
        //   points: effectivePoints,
        //   duration: opts.duration
        // });
        
        throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
      }
      
      // Set rate limit headers for successful requests
      try {
        res.setHeader('X-RateLimit-Limit', effectivePoints.toString());
        res.setHeader('X-RateLimit-Remaining', rl.remaining?.toString() || '0');
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + opts.duration).toISOString());
      } catch {
        // Ignore header setting errors
      }
      
      return true;
    } catch {
      // If Redis/ratelimiter is unavailable, log error and fail closed for security
      this.logger.error('Rate limiting service unavailable');
      throw new HttpException('Service temporarily unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}