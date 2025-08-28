# Fulexo Platform Rate Limiting & Multi-Tenant Token Management Strategy

## 1. BaseLinker API Rate Limit Management

### Current Limitations
- **BaseLinker API Limit**: 100 requests per minute per token
- **Challenge**: Multiple tenants sharing same BL account/token
- **Risk**: One tenant consuming entire rate limit

### Solution: Fair-Share Token Pool Management

```typescript
interface TokenPoolConfig {
  tokens: {
    id: string;
    token: string; // encrypted
    tenants: string[]; // assigned tenants
    weight: number; // priority weight
  }[];
  
  allocation: {
    strategy: 'fair-share' | 'priority' | 'round-robin';
    reservedQuota: Map<string, number>; // tenant -> guaranteed requests/min
    sharedPool: number; // remaining capacity for dynamic allocation
  };
}

class MultiTenantRateLimiter {
  private tokenBuckets: Map<string, TokenBucket> = new Map();
  private tenantQuotas: Map<string, number> = new Map();
  private fairShareWindow = 60000; // 1 minute
  
  constructor(private config: TokenPoolConfig) {
    this.initializeQuotas();
  }
  
  private initializeQuotas() {
    const totalCapacity = this.config.tokens.length * 100; // 100 req/min per token
    const reservedTotal = Array.from(this.config.allocation.reservedQuota.values())
      .reduce((sum, quota) => sum + quota, 0);
    
    // Ensure reserved quotas don't exceed capacity
    if (reservedTotal > totalCapacity * 0.8) {
      throw new Error('Reserved quotas exceed 80% of total capacity');
    }
    
    // Calculate fair share for non-reserved capacity
    const sharedCapacity = totalCapacity - reservedTotal;
    const activeTenants = this.getActiveTenants();
    const fairSharePerTenant = Math.floor(sharedCapacity / activeTenants.length);
    
    // Set tenant quotas
    for (const tenant of activeTenants) {
      const reserved = this.config.allocation.reservedQuota.get(tenant) || 0;
      const fairShare = fairSharePerTenant;
      this.tenantQuotas.set(tenant, reserved + fairShare);
    }
  }
  
  async acquireToken(tenantId: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<string | null> {
    const quota = this.tenantQuotas.get(tenantId) || 0;
    const usage = await this.getTenantUsage(tenantId);
    
    // Check tenant quota
    if (usage >= quota) {
      // Try borrowing from shared pool
      if (!await this.borrowFromSharedPool(tenantId, priority)) {
        return null; // Rate limited
      }
    }
    
    // Find available token
    const token = await this.selectOptimalToken(tenantId);
    if (!token) return null;
    
    // Record usage
    await this.recordUsage(tenantId, token);
    
    return token;
  }
  
  private async borrowFromSharedPool(tenantId: string, priority: string): Promise<boolean> {
    const priorityWeights = { high: 3, normal: 2, low: 1 };
    const weight = priorityWeights[priority];
    
    // Weighted random selection for shared pool access
    const random = Math.random() * 6; // sum of all weights
    return random < weight;
  }
  
  private async selectOptimalToken(tenantId: string): Promise<string | null> {
    // Sort tokens by current usage (least used first)
    const tokenUsage = await this.getTokenUsageStats();
    const sortedTokens = Array.from(tokenUsage.entries())
      .sort((a, b) => a[1] - b[1]);
    
    for (const [tokenId, usage] of sortedTokens) {
      if (usage < 95) { // Leave 5% buffer
        const bucket = this.tokenBuckets.get(tokenId);
        if (bucket && bucket.take(1)) {
          return tokenId;
        }
      }
    }
    
    return null;
  }
  
  // Adaptive quota adjustment based on usage patterns
  async adjustQuotas() {
    const usageStats = await this.getUsageStatistics();
    
    for (const [tenantId, stats] of usageStats) {
      const currentQuota = this.tenantQuotas.get(tenantId) || 0;
      
      // Increase quota for consistently high usage
      if (stats.avgUsage > currentQuota * 0.9 && stats.peakUsage === currentQuota) {
        const increase = Math.min(10, currentQuota * 0.2);
        this.tenantQuotas.set(tenantId, currentQuota + increase);
      }
      
      // Decrease quota for consistently low usage
      if (stats.avgUsage < currentQuota * 0.3) {
        const decrease = Math.min(5, currentQuota * 0.1);
        this.tenantQuotas.set(tenantId, Math.max(10, currentQuota - decrease));
      }
    }
  }
}
```

## 2. Per-Tenant Token Allocation Strategies

### Strategy 1: Dedicated Tokens (Recommended for Large Tenants)
```yaml
allocation:
  tenant_a:
    tokens: [token_1, token_2] # 200 req/min capacity
    reserved: 180 # guaranteed
    burst: 20 # additional burst capacity
    
  tenant_b:
    tokens: [token_3] # 100 req/min capacity
    reserved: 90
    burst: 10
```

### Strategy 2: Shared Token Pool (Recommended for Small Tenants)
```yaml
shared_pool:
  tokens: [token_4, token_5, token_6] # 300 req/min total
  tenants: [tenant_c, tenant_d, tenant_e, tenant_f]
  allocation:
    base_quota: 30 # each tenant gets 30 req/min guaranteed
    burst_pool: 180 # shared burst capacity
    priority_weights:
      tenant_c: 2.0 # higher priority
      tenant_d: 1.0
      tenant_e: 1.0
      tenant_f: 0.5 # lower priority
```

### Strategy 3: Hybrid Approach (Recommended)
```typescript
class HybridTokenAllocator {
  private dedicatedTokens: Map<string, string[]> = new Map();
  private sharedPool: string[] = [];
  private tenantTiers: Map<string, 'premium' | 'standard' | 'basic'> = new Map();
  
  allocateTokens(tenant: string): TokenAllocation {
    const tier = this.tenantTiers.get(tenant) || 'basic';
    
    switch (tier) {
      case 'premium':
        // Dedicated tokens + priority access to shared pool
        return {
          dedicated: this.dedicatedTokens.get(tenant) || [],
          sharedAccess: 'priority',
          guaranteedCapacity: 150,
          burstCapacity: 50
        };
        
      case 'standard':
        // Partial dedicated + normal shared pool access
        return {
          dedicated: this.dedicatedTokens.get(tenant)?.slice(0, 1) || [],
          sharedAccess: 'normal',
          guaranteedCapacity: 50,
          burstCapacity: 30
        };
        
      case 'basic':
        // Shared pool only
        return {
          dedicated: [],
          sharedAccess: 'limited',
          guaranteedCapacity: 20,
          burstCapacity: 10
        };
    }
  }
}
```

## 3. Implementation Details

### Redis-Based Distributed Rate Limiting
```typescript
class RedisRateLimiter {
  private redis: Redis;
  private script: string;
  
  constructor() {
    // Lua script for atomic rate limit check and increment
    this.script = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local current_time = tonumber(ARGV[3])
      
      -- Clean old entries
      redis.call('ZREMRANGEBYSCORE', key, 0, current_time - window)
      
      -- Count current requests
      local current = redis.call('ZCARD', key)
      
      if current < limit then
        -- Add new request
        redis.call('ZADD', key, current_time, current_time)
        redis.call('EXPIRE', key, window)
        return {1, limit - current - 1} -- success, remaining
      else
        -- Get oldest entry to calculate retry after
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        if oldest[2] then
          return {0, 0, oldest[2] + window - current_time} -- failed, remaining, retry_after
        else
          return {0, 0, window} -- failed, remaining, retry_after
        end
      end
    `;
  }
  
  async checkLimit(tenantId: string, tokenId: string): Promise<RateLimitResult> {
    const key = `rate_limit:${tenantId}:${tokenId}`;
    const limit = await this.getTenantLimit(tenantId);
    const window = 60000; // 1 minute
    const now = Date.now();
    
    const result = await this.redis.eval(
      this.script,
      1,
      key,
      limit,
      window,
      now
    );
    
    return {
      allowed: result[0] === 1,
      remaining: result[1],
      retryAfter: result[2] || null
    };
  }
}
```

### Circuit Breaker for BaseLinker API
```typescript
class BaseLinkerCircuitBreaker {
  private states: Map<string, CircuitState> = new Map();
  private readonly threshold = 5; // failures to open circuit
  private readonly timeout = 30000; // 30 seconds
  private readonly successThreshold = 2; // successes to close circuit
  
  async execute<T>(
    tokenId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(tokenId);
    
    if (state.status === 'open') {
      if (Date.now() - state.openedAt > this.timeout) {
        // Try half-open
        state.status = 'half-open';
        state.successCount = 0;
      } else {
        throw new Error(`Circuit breaker open for token ${tokenId}`);
      }
    }
    
    try {
      const result = await operation();
      
      if (state.status === 'half-open') {
        state.successCount++;
        if (state.successCount >= this.successThreshold) {
          state.status = 'closed';
          state.failureCount = 0;
        }
      }
      
      return result;
    } catch (error) {
      state.failureCount++;
      
      if (state.failureCount >= this.threshold) {
        state.status = 'open';
        state.openedAt = Date.now();
      }
      
      throw error;
    }
  }
  
  private getState(tokenId: string): CircuitState {
    if (!this.states.has(tokenId)) {
      this.states.set(tokenId, {
        status: 'closed',
        failureCount: 0,
        successCount: 0,
        openedAt: 0
      });
    }
    return this.states.get(tokenId)!;
  }
}
```

## 4. Monitoring and Alerting

### Metrics to Track
```yaml
metrics:
  rate_limit_usage:
    - tenant_requests_per_minute
    - token_utilization_percentage
    - rate_limit_violations
    - borrowed_capacity_usage
    
  performance:
    - api_call_latency_p50
    - api_call_latency_p95
    - api_call_latency_p99
    - queue_depth_by_tenant
    
  errors:
    - rate_limit_errors_by_tenant
    - circuit_breaker_opens
    - token_exhaustion_events
    
  business:
    - sync_lag_by_tenant
    - data_freshness_by_entity
```

### Alert Rules
```yaml
alerts:
  critical:
    - name: TokenExhaustion
      condition: token_utilization > 95%
      duration: 5m
      action: page_oncall
      
    - name: TenantRateLimited
      condition: rate_limit_violations > 10
      duration: 2m
      action: notify_customer_success
      
  warning:
    - name: HighTokenUsage
      condition: token_utilization > 80%
      duration: 10m
      action: email_ops
      
    - name: UnbalancedTokenUsage
      condition: token_usage_stddev > 30%
      duration: 15m
      action: rebalance_tokens
```

## 5. Graceful Degradation Strategies

### Priority-Based Request Queuing
```typescript
class PriorityRequestQueue {
  private queues = {
    critical: new Queue('critical'),
    high: new Queue('high'),
    normal: new Queue('normal'),
    low: new Queue('low')
  };
  
  async enqueue(request: Request): Promise<void> {
    const priority = this.calculatePriority(request);
    const queue = this.queues[priority];
    
    await queue.add(request, {
      delay: this.calculateDelay(priority),
      attempts: this.getRetryAttempts(priority),
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
  
  private calculatePriority(request: Request): Priority {
    // Critical: order status updates, payment confirmations
    if (request.type === 'order_status' || request.type === 'payment') {
      return 'critical';
    }
    
    // High: shipment tracking, customer-facing data
    if (request.type === 'shipment' || request.isCustomerFacing) {
      return 'high';
    }
    
    // Low: background sync, analytics
    if (request.type === 'analytics' || request.isBackground) {
      return 'low';
    }
    
    return 'normal';
  }
}
```

### Fallback Mechanisms
```typescript
class FallbackService {
  async getOrdersWithFallback(tenantId: string): Promise<Order[]> {
    try {
      // Try live API
      return await this.blClient.getOrders(tenantId);
    } catch (error) {
      if (this.isRateLimitError(error)) {
        // Fallback to cache
        const cached = await this.cache.getOrders(tenantId);
        if (cached && this.isFreshEnough(cached)) {
          return cached.data;
        }
        
        // Fallback to database mirror
        return await this.database.getOrders(tenantId);
      }
      throw error;
    }
  }
  
  private isFreshEnough(cached: CachedData): boolean {
    const maxAge = {
      critical: 5 * 60 * 1000,    // 5 minutes
      normal: 30 * 60 * 1000,     // 30 minutes
      background: 2 * 60 * 60 * 1000 // 2 hours
    };
    
    const age = Date.now() - cached.timestamp;
    return age < maxAge[cached.priority];
  }
}
```

## 6. Cost Optimization

### Token Rotation Strategy
```typescript
class TokenRotationManager {
  private tokenUsageHistory: Map<string, UsageHistory> = new Map();
  
  async rotateTokens(): Promise<void> {
    const underutilized = this.findUnderutilizedTokens();
    const overutilized = this.findOverutilizedTokens();
    
    // Redistribute tenants
    for (const token of underutilized) {
      const capacity = this.getAvailableCapacity(token);
      const tenants = this.findTenantsToMove(overutilized, capacity);
      
      for (const tenant of tenants) {
        await this.moveTenant(tenant, token);
      }
    }
  }
  
  private findUnderutilizedTokens(): string[] {
    return Array.from(this.tokenUsageHistory.entries())
      .filter(([_, history]) => history.avgUsage < 30)
      .map(([token, _]) => token);
  }
  
  private findOverutilizedTokens(): string[] {
    return Array.from(this.tokenUsageHistory.entries())
      .filter(([_, history]) => history.avgUsage > 85)
      .map(([token, _]) => token);
  }
}
```

## 7. Implementation Checklist

### Phase 1: Basic Rate Limiting
- [ ] Implement token bucket algorithm
- [ ] Add Redis-based distributed rate limiting
- [ ] Create basic monitoring dashboards
- [ ] Set up critical alerts

### Phase 2: Multi-Tenant Management
- [ ] Implement fair-share allocation
- [ ] Add tenant quota management
- [ ] Create priority queuing system
- [ ] Implement circuit breaker

### Phase 3: Advanced Features
- [ ] Add adaptive quota adjustment
- [ ] Implement token rotation
- [ ] Create fallback mechanisms
- [ ] Add predictive scaling

### Phase 4: Optimization
- [ ] Analyze usage patterns
- [ ] Optimize token allocation
- [ ] Implement cost tracking
- [ ] Add capacity planning tools