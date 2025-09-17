import Redis from 'ioredis';

export type RateLimitResult = { allowed: boolean; remaining: number | undefined; retryAfterMs: number | undefined };

export class RedisRateLimiter {
	private luaScript = `
	local key = KEYS[1]
	local limit = tonumber(ARGV[1])
	local window = tonumber(ARGV[2])
	local now = tonumber(ARGV[3])
	redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
	local current = redis.call('ZCARD', key)
	if current < limit then
	  redis.call('ZADD', key, now, now)
	  redis.call('EXPIRE', key, math.floor(window/1000))
	  return {1, limit - current - 1}
	else
	  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
	  if oldest[2] then
	    return {0, 0, oldest[2] + window - now}
	  else
	    return {0, 0, window}
	  end
	end`;

	constructor(private redis: Redis) {}

	async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
		const now = Date.now();
		const result = (await (this.redis as unknown as { eval: (script: string, ...args: (string | number)[]) => Promise<unknown[]> }).eval(this.luaScript, 1, key, limit, windowMs, now)) as unknown[];
		const allowed = Number(result?.[0]) === 1;
		const remaining = result?.[1] !== undefined ? Number(result[1]) : undefined;
		const retryAfterMs = result?.[2] !== undefined ? Number(result[2]) : undefined;
		return { allowed, remaining, retryAfterMs };
	}
}

export class TokenBucket {
	constructor(public capacity = 100, public refillMs = 60000) {
		this.tokens = capacity;
		this.ts = Date.now();
	}
	private tokens: number;
	private ts: number;
	take(n = 1) {
		const now = Date.now();
		const add = ((now - this.ts) / this.refillMs) * this.capacity;
		this.tokens = Math.min(this.capacity, this.tokens + add);
		this.ts = now;
		if (this.tokens >= n) {
			this.tokens -= n;
			return true;
		}
		return false;
	}
}