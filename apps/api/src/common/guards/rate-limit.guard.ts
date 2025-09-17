import { Injectable, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class CustomRateLimitGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomRateLimitGuard.name);

  constructor() {
    super({} as ThrottlerModuleOptions, {} as ThrottlerStorage, {} as Reflector);
  }

  protected override async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.generateKey(context, '', '');
    
    // Get current request count
    const current = await this.storageService.increment(key, ttl);
    
    // Check if limit exceeded
    if (Number(current) > limit) {
      // Log rate limit exceeded
      this.logger.warn(`Rate limit exceeded for ${request.ip} on ${request.path}`, {
        ip: request.ip,
        path: request.path,
        method: request.method,
        userAgent: request.headers['user-agent'],
        current,
        limit,
        ttl,
      });
      
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(ttl / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    
    return true;
  }

  protected override generateKey(context: ExecutionContext, _suffix: string, _name: string): string {
    const request = context.switchToHttp().getRequest<Request>();
    const { ip, path, method } = request;
    const user = (request as { user?: { id?: string } }).user;
    
    // Include user ID in key if authenticated
    const userKey = user?.id ? `user:${user.id}` : `ip:${ip}`;
    
    return `${userKey}:${method}:${path}`;
  }
}