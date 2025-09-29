import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CookieAuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Extract token from httpOnly cookie and add to Authorization header
    const accessToken = req.cookies?.['access_token'];
    
    console.log('Cookie Middleware - Request:', {
      url: req.url,
      method: req.method,
      cookies: req.cookies,
      accessToken: accessToken ? 'present' : 'missing',
      hasAuth: !!req.headers.authorization,
      rawCookieHeader: req.headers.cookie
    });
    
    if (accessToken && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${accessToken}`;
      console.log('Cookie Middleware - Set Authorization header with token:', accessToken.substring(0, 20) + '...');
    }
    
    next();
  }
}