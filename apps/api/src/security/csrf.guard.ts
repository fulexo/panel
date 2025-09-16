import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Skip CSRF for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    // Skip CSRF for webhook endpoints
    if (request.path.startsWith('/woo/webhooks/')) {
      return true;
    }

    // Check for CSRF token
    const csrfToken = request.headers['x-csrf-token'] as string;
    const sessionToken = (request as any).session?.csrfToken;

    if (!csrfToken || !sessionToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    // Verify CSRF token
    if (!crypto.timingSafeEqual(
      Buffer.from(csrfToken, 'hex'),
      Buffer.from(sessionToken, 'hex')
    )) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}