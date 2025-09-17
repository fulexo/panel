import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CookieAuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Extract token from httpOnly cookie and add to Authorization header
    const accessToken = req.cookies?.['access_token'];
    
    if (accessToken && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${accessToken}`;
    }
    
    next();
  }
}