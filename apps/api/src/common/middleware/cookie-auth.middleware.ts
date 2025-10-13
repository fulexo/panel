import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CookieAuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Extract token from httpOnly cookie and add to Authorization header
    const accessToken = req.cookies?.['access_token'];
    // Avoid logging sensitive data; only minimal debug in development
    if (process.env['NODE_ENV'] === 'development') {
       
      console.log('CookieAuthMiddleware', {
        url: req.url,
        method: req.method,
        hasAccessToken: Boolean(accessToken),
        hasAuthHeader: Boolean(req.headers.authorization),
      });
    }

    if (accessToken && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${accessToken}`;
    }
    
    next();
  }
}