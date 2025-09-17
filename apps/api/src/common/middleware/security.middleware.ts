import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
// import * as helmet from 'helmet';
// import * as rateLimit from 'express-rate-limit';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction) {
    // Security headers disabled for now
    next();
  }
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction) {
    // Rate limiting disabled for now
    next();
  }
}

@Injectable()
export class StrictRateLimitMiddleware implements NestMiddleware {
  use(_req: Request, _res: Response, next: NextFunction) {
    // Strict rate limiting disabled for now
    next();
  }
}