import { SetMetadata } from '@nestjs/common';

export type RateLimitOptions = {
  name: string;
  limit: number;
  windowMs: number;
  scope?: 'ip' | 'user';
};

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);