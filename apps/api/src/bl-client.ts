import fetch from 'node-fetch';
import Redis from 'ioredis';
import { RedisRateLimiter } from './ratelimit';

class CircuitState { status: 'closed'|'open'|'half'; failures=0; openedAt=0; successes=0; }

export class BaseLinkerClient {
	private limiter: RedisRateLimiter;
	private states = new Map<string, CircuitState>();
	constructor(private redis: Redis){ this.limiter = new RedisRateLimiter(redis); }

	private state(tokenId: string){ if(!this.states.has(tokenId)) this.states.set(tokenId, new CircuitState()); return this.states.get(tokenId)!; }

	async request(method: string, parameters: any, blToken: string, tokenId: string){
		const key = `bl:ratelimit:${tokenId}`;
		const limit = 100; const windowMs = 60000;
		const rl = await this.limiter.check(key, limit, windowMs);
		if(!rl.allowed) throw new Error(`BL rate limited. Retry after ${rl.retryAfterMs}ms`);
		return await this.withCircuit(tokenId, async () => {
			const body = new URLSearchParams({ method, parameters: JSON.stringify(parameters) });
			const res = await fetch('https://api.baselinker.com/connector.php', { method: 'POST', headers: { 'X-BLToken': blToken }, body } as any);
			if(!res.ok) throw new Error(`BL HTTP ${res.status}`);
			const json: any = await res.json();
			if(json.status !== 'SUCCESS') throw new Error(json.error_message || 'BL error');
			return json;
		});
	}

	private async withCircuit<T>(tokenId: string, op: () => Promise<T>): Promise<T>{
		const s = this.state(tokenId);
		if(s.status === 'open' && Date.now() - s.openedAt < 30000){ throw new Error('Circuit open'); }
		if(s.status === 'open' && Date.now() - s.openedAt >= 30000){ s.status='half'; s.successes=0; }
		try{
			const out = await op();
			s.failures = 0;
			if(s.status==='half'){ s.successes++; if(s.successes>=2){ s.status='closed'; } }
			return out;
		}catch(e){
			s.failures++;
			if(s.failures>=5){ s.status='open'; s.openedAt=Date.now(); }
			throw e;
		}
	}
}