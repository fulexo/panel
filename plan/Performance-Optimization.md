# Fulexo Platform Performance Optimization Guide

## 1. Database Performance Optimization

### Connection Pooling Configuration
```yaml
prisma:
  datasource:
    connection_limit: 25
    pool_timeout: 10
    
pgbouncer:
  pool_mode: transaction
  max_client_conn: 1000
  default_pool_size: 25
  min_pool_size: 10
  reserve_pool_size: 5
  reserve_pool_timeout: 3
  max_db_connections: 100
  max_user_connections: 100
```

### Advanced Indexing Strategy
```sql
-- BRIN indexes for time-series data
CREATE INDEX idx_orders_confirmed_brin ON orders USING brin(confirmed_at) WITH (pages_per_range = 128);
CREATE INDEX idx_shipments_shipped_brin ON shipments USING brin(shipped_at) WITH (pages_per_range = 128);

-- GIN indexes for JSONB and text search
CREATE INDEX idx_ownership_rules_conditions_gin ON ownership_rules USING gin(conditions_json);
CREATE INDEX idx_audit_logs_changes_gin ON audit_logs USING gin(changes);
CREATE INDEX idx_orders_email_trgm ON orders USING gin(customer_email gin_trgm_ops);

-- Partial indexes for common queries
CREATE INDEX idx_orders_pending ON orders(tenant_id, created_at DESC) 
  WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX idx_shipments_undelivered ON shipments(carrier, tracking_no) 
  WHERE status != 'DELIVERED';

-- Covering indexes to avoid table lookups
CREATE INDEX idx_orders_list_covering ON orders(tenant_id, status, confirmed_at DESC) 
  INCLUDE (bl_order_id, external_order_no, total, currency, customer_email);

-- Hash indexes for exact matches
CREATE INDEX idx_users_email_hash ON users USING hash(email);
```

### Query Optimization Patterns
```typescript
// N+1 Query Prevention with Prisma
const ordersWithRelations = await prisma.order.findMany({
  where: { tenantId },
  include: {
    items: true,
    shipments: {
      select: {
        id: true,
        trackingNo: true,
        status: true
      }
    },
    invoices: {
      select: {
        id: true,
        number: true,
        total: true
      }
    }
  },
  take: 100
});

// Cursor-based pagination for large datasets
async function getPaginatedOrders(cursor?: string, pageSize = 50) {
  return await prisma.order.findMany({
    take: pageSize + 1,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { confirmedAt: 'desc' }
  });
}

// Aggregate queries with window functions
const orderStats = await prisma.$queryRaw`
  WITH order_stats AS (
    SELECT 
      DATE_TRUNC('day', confirmed_at) as day,
      COUNT(*) as order_count,
      SUM(total) as revenue,
      AVG(total) as avg_order_value,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total) as median_value
    FROM orders
    WHERE tenant_id = ${tenantId}::uuid
      AND confirmed_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', confirmed_at)
  )
  SELECT 
    *,
    SUM(order_count) OVER (ORDER BY day) as cumulative_orders,
    AVG(order_count) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as moving_avg_7d
  FROM order_stats
  ORDER BY day DESC
`;
```

### Database Partitioning
```sql
-- Partition orders table by month
CREATE TABLE orders_partitioned (
  LIKE orders INCLUDING ALL
) PARTITION BY RANGE (confirmed_at);

-- Create partitions for each month
CREATE TABLE orders_2025_01 PARTITION OF orders_partitioned
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE orders_2025_02 PARTITION OF orders_partitioned
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Auto-partition creation function
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
BEGIN
  start_date := DATE_TRUNC('month', CURRENT_DATE);
  FOR i IN 0..11 LOOP
    end_date := start_date + INTERVAL '1 month';
    partition_name := 'orders_' || TO_CHAR(start_date, 'YYYY_MM');
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE relname = partition_name
    ) THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF orders_partitioned FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
      );
    END IF;
    
    start_date := end_date;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly execution
SELECT cron.schedule('create-partitions', '0 0 1 * *', 'SELECT create_monthly_partitions()');
```

## 2. Caching Strategy

### Multi-Layer Cache Architecture
```typescript
interface CacheConfig {
  layers: {
    l1_memory: {
      type: 'node-cache';
      ttl: 60; // seconds
      maxSize: '100MB';
    };
    l2_redis: {
      type: 'redis';
      ttl: 300; // seconds
      maxMemory: '2GB';
      evictionPolicy: 'allkeys-lru';
    };
    l3_edge_cache: {
      type: 'nginx-cache'; // self-hosted edge cache (optionally Varnish)
      ttl: 3600; // seconds
      purgeStrategy: 'tag-based';
    };
  };
}

class CacheService {
  private l1Cache = new NodeCache({ stdTTL: 60 });
  private l2Cache: Redis;
  
  async get<T>(key: string): Promise<T | null> {
    // Check L1 (memory)
    const l1Result = this.l1Cache.get<T>(key);
    if (l1Result) return l1Result;
    
    // Check L2 (Redis)
    const l2Result = await this.l2Cache.get(key);
    if (l2Result) {
      // Promote to L1
      this.l1Cache.set(key, l2Result);
      return JSON.parse(l2Result);
    }
    
    return null;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Add jitter to prevent cache stampede
    const jitteredTTL = ttl ? ttl + Math.random() * ttl * 0.1 : undefined;
    
    // Set in both layers
    this.l1Cache.set(key, value, jitteredTTL);
    await this.l2Cache.setex(key, jitteredTTL || 300, JSON.stringify(value));
  }
  
  // Cache stampede protection with probabilistic early expiration
  async getWithStampedProtection<T>(
    key: string, 
    fetcher: () => Promise<T>,
    ttl: number,
    beta = 1.0
  ): Promise<T> {
    const cached = await this.get<{ data: T; expiry: number; delta: number }>(key);
    
    if (cached) {
      const now = Date.now();
      const xfetch = cached.delta * beta * Math.log(Math.random());
      
      if (now - xfetch < cached.expiry) {
        return cached.data;
      }
    }
    
    // Acquire lock to prevent multiple fetches
    const lockKey = `lock:${key}`;
    const locked = await this.l2Cache.set(lockKey, '1', 'NX', 'EX', 30);
    
    if (!locked) {
      // Wait and retry
      await new Promise(r => setTimeout(r, 100));
      return this.getWithStampedProtection(key, fetcher, ttl, beta);
    }
    
    try {
      const start = Date.now();
      const data = await fetcher();
      const delta = Date.now() - start;
      
      await this.set(key, {
        data,
        expiry: Date.now() + ttl * 1000,
        delta
      }, ttl);
      
      return data;
    } finally {
      await this.l2Cache.del(lockKey);
    }
  }
}
```

### Cache Warming Strategy
```typescript
class CacheWarmer {
  async warmCache(): Promise<void> {
    const tasks = [
      this.warmOrderStatuses(),
      this.warmPopularProducts(),
      this.warmDashboardMetrics(),
      this.warmFrequentSearches()
    ];
    
    await Promise.all(tasks);
  }
  
  private async warmOrderStatuses(): Promise<void> {
    const statuses = await prisma.order.groupBy({
      by: ['status'],
      _count: true
    });
    
    for (const status of statuses) {
      const key = `status:${status.status}`;
      await cache.set(key, status, 3600);
    }
  }
  
  private async warmPopularProducts(): Promise<void> {
    const products = await prisma.$queryRaw`
      SELECT p.*, COUNT(oi.id) as order_count
      FROM products p
      JOIN order_items oi ON oi.sku = p.sku
      WHERE oi.created_at > NOW() - INTERVAL '7 days'
      GROUP BY p.id
      ORDER BY order_count DESC
      LIMIT 100
    `;
    
    for (const product of products) {
      const key = `product:${product.sku}`;
      await cache.set(key, product, 1800);
    }
  }
}

// Schedule cache warming
cron.schedule('*/15 * * * *', () => {
  cacheWarmer.warmCache().catch(console.error);
});
```

## 3. API Performance Optimization

### Response Compression
```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between CPU and compression ratio
  threshold: 1024, // Don't compress small responses
  memLevel: 8
}));
```

### API Response Caching
```typescript
class ResponseCache {
  // ETags for conditional requests
  generateETag(data: any): string {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
  }
  
  // Middleware for caching GET requests
  middleware(ttl: number = 60) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET') return next();
      
      const key = `response:${req.originalUrl}`;
      const cached = await cache.get(key);
      
      if (cached) {
        const etag = this.generateETag(cached);
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', `private, max-age=${ttl}`);
        
        if (req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }
        
        return res.json(cached);
      }
      
      // Store original send
      const originalSend = res.json.bind(res);
      
      res.json = (data: any) => {
        cache.set(key, data, ttl);
        const etag = this.generateETag(data);
        res.setHeader('ETag', etag);
        res.setHeader('Cache-Control', `private, max-age=${ttl}`);
        return originalSend(data);
      };
      
      next();
    };
  }
}
```

### GraphQL DataLoader Pattern
```typescript
import DataLoader from 'dataloader';

class OrderLoader {
  private loader = new DataLoader(async (ids: string[]) => {
    const orders = await prisma.order.findMany({
      where: { id: { in: ids } }
    });
    
    const orderMap = new Map(orders.map(o => [o.id, o]));
    return ids.map(id => orderMap.get(id) || null);
  });
  
  async load(id: string) {
    return this.loader.load(id);
  }
  
  async loadMany(ids: string[]) {
    return this.loader.loadMany(ids);
  }
}

// Usage in resolvers
const resolvers = {
  OrderItem: {
    order: (parent, args, context) => {
      return context.loaders.order.load(parent.orderId);
    }
  }
};
```

## 4. Frontend Performance Optimization

### Bundle Optimization
```javascript
// next.config.js
module.exports = {
  webpack: (config, { dev, isServer }) => {
    // Code splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          }
        }
      }
    };
    
    // Tree shaking
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    return config;
  },
  
  // Image optimization
  images: {
    domains: ['cdn.example.com'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
    formats: ['image/webp', 'image/avif']
  },
  
  // Enable SWC minification
  swcMinify: true,
  
  // Compression
  compress: true,
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  reactStrictMode: true
};
```

### React Performance Patterns
```tsx
import { memo, useMemo, useCallback, lazy, Suspense } from 'react';
import { FixedSizeList as List } from 'react-window';

// Lazy loading components
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Memoized component
const OrderRow = memo(({ order, onSelect }) => {
  return (
    <tr onClick={() => onSelect(order.id)}>
      <td>{order.id}</td>
      <td>{order.status}</td>
      <td>{order.total}</td>
    </tr>
  );
}, (prevProps, nextProps) => {
  return prevProps.order.id === nextProps.order.id &&
         prevProps.order.status === nextProps.order.status;
});

// Virtual scrolling for large lists
function VirtualOrderList({ orders }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <OrderRow order={orders[index]} />
    </div>
  );
  
  return (
    <List
      height={600}
      itemCount={orders.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  );
}

// Optimized state updates
function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({});
  
  // Memoize expensive computations
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (filters.status && order.status !== filters.status) return false;
      if (filters.dateFrom && order.date < filters.dateFrom) return false;
      return true;
    });
  }, [orders, filters]);
  
  // Memoize callbacks
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Debounce search input
  const debouncedSearch = useMemo(
    () => debounce((term) => {
      searchOrders(term);
    }, 300),
    []
  );
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <VirtualOrderList orders={filteredOrders} />
    </Suspense>
  );
}
```

### Service Worker Caching
```javascript
// service-worker.js
const CACHE_NAME = 'fulexo-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/bundle.js'
];

// Install and cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Network-first strategy for API calls
self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
```

## 5. Job Queue Optimization

### Queue Configuration
```typescript
interface QueueConfig {
  concurrency: {
    'sync:orders': 5,
    'sync:shipments': 3,
    'export:csv': 2,
    'email:send': 10
  };
  rateLimiting: {
    'baselinker': {
      max: 90,
      duration: 60000 // 90 requests per minute
    }
  };
  priorities: {
    'critical': 1,
    'high': 2,
    'normal': 3,
    'low': 4
  };
}

class OptimizedQueue {
  constructor(private config: QueueConfig) {
    this.setupQueues();
  }
  
  private setupQueues() {
    // Separate queues for different priorities
    this.criticalQueue = new Queue('critical', {
      connection: this.redis,
      defaultJobOptions: {
        priority: 1,
        removeOnComplete: 100,
        removeOnFail: 1000
      }
    });
    
    // Worker with concurrency control
    new Worker('critical', this.processJob, {
      connection: this.redis,
      concurrency: this.config.concurrency['sync:orders'],
      limiter: {
        max: this.config.rateLimiting.baselinker.max,
        duration: this.config.rateLimiting.baselinker.duration
      }
    });
  }
  
  // Batch processing for efficiency
  async addBatch(jobs: Job[]): Promise<void> {
    const batches = chunk(jobs, 100);
    
    for (const batch of batches) {
      await this.queue.addBulk(
        batch.map(job => ({
          name: job.name,
          data: job.data,
          opts: {
            priority: this.config.priorities[job.priority],
            delay: job.delay,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000
            }
          }
        }))
      );
    }
  }
}
```

### Dead Letter Queue
```typescript
class DeadLetterQueue {
  private dlq = new Queue('dead-letter');
  
  async handleFailedJob(job: Job, error: Error): Promise<void> {
    // Move to DLQ after max attempts
    if (job.attemptsMade >= job.opts.attempts) {
      await this.dlq.add('failed-job', {
        originalQueue: job.queueName,
        jobName: job.name,
        data: job.data,
        error: error.message,
        stack: error.stack,
        failedAt: new Date()
      });
      
      // Alert for critical jobs
      if (job.data.critical) {
        await this.alertService.send({
          type: 'job-failed',
          job: job.id,
          error: error.message
        });
      }
    }
  }
  
  // Retry jobs from DLQ
  async retryDeadLetterJobs(filter?: (job: Job) => boolean): Promise<void> {
    const jobs = await this.dlq.getJobs(['failed']);
    
    for (const job of jobs) {
      if (!filter || filter(job)) {
        const originalQueue = new Queue(job.data.originalQueue);
        await originalQueue.add(job.data.jobName, job.data.data);
        await job.remove();
      }
    }
  }
}
```

## 6. Monitoring & Performance Metrics

### Custom Performance Metrics
```typescript
import { register, Histogram, Counter, Gauge } from 'prom-client';

class PerformanceMetrics {
  // Response time histogram
  private httpDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status'],
    buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000]
  });
  
  // Database query metrics
  private dbQueryDuration = new Histogram({
    name: 'db_query_duration_ms',
    help: 'Duration of database queries in ms',
    labelNames: ['operation', 'table'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000]
  });
  
  // Cache hit rate
  private cacheHits = new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type']
  });
  
  private cacheMisses = new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type']
  });
  
  // Active connections
  private activeConnections = new Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
    labelNames: ['type']
  });
  
  // Business metrics
  private ordersProcessed = new Counter({
    name: 'orders_processed_total',
    help: 'Total number of orders processed',
    labelNames: ['status', 'source']
  });
  
  private syncLag = new Gauge({
    name: 'sync_lag_seconds',
    help: 'Sync lag in seconds',
    labelNames: ['entity_type']
  });
  
  // Middleware to track HTTP metrics
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.httpDuration
          .labels(req.method, req.route?.path || 'unknown', res.statusCode.toString())
          .observe(duration);
      });
      
      next();
    };
  }
  
  // Track database query performance
  async trackQuery<T>(
    operation: string,
    table: string,
    query: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      return await query();
    } finally {
      const duration = Date.now() - start;
      this.dbQueryDuration.labels(operation, table).observe(duration);
    }
  }
}
```

### Performance Budget
```yaml
performance_budget:
  metrics:
    - name: First Contentful Paint
      budget: 1200ms
      alert: 1500ms
      
    - name: Largest Contentful Paint
      budget: 2500ms
      alert: 3000ms
      
    - name: Time to Interactive
      budget: 3500ms
      alert: 4000ms
      
    - name: Total Blocking Time
      budget: 300ms
      alert: 500ms
      
    - name: Cumulative Layout Shift
      budget: 0.1
      alert: 0.25
      
  api_endpoints:
    - path: /api/orders
      p50: 100ms
      p95: 500ms
      p99: 1000ms
      
    - path: /api/orders/:id
      p50: 50ms
      p95: 200ms
      p99: 500ms
      
  database_queries:
    - query: orders_list
      p50: 10ms
      p95: 50ms
      p99: 100ms
      
  bundle_sizes:
    - name: main.js
      budget: 200KB
      alert: 250KB
      
    - name: vendor.js
      budget: 500KB
      alert: 600KB
```

## 7. Load Testing & Performance Testing

### K6 Load Test Script
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.01'],
  },
};

export default function () {
  // Test order list endpoint
  const ordersRes = http.get('https://api.example.com/orders', {
    headers: { Authorization: 'Bearer ' + __ENV.TOKEN },
  });
  
  check(ordersRes, {
    'orders status is 200': (r) => r.status === 200,
    'orders response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(ordersRes.status !== 200);
  
  // Test order detail endpoint
  if (ordersRes.status === 200) {
    const orders = JSON.parse(ordersRes.body);
    if (orders.data && orders.data.length > 0) {
      const orderId = orders.data[0].id;
      const detailRes = http.get(`https://api.example.com/orders/${orderId}`, {
        headers: { Authorization: 'Bearer ' + __ENV.TOKEN },
      });
      
      check(detailRes, {
        'detail status is 200': (r) => r.status === 200,
        'detail response time < 200ms': (r) => r.timings.duration < 200,
      });
      
      errorRate.add(detailRes.status !== 200);
    }
  }
  
  sleep(1);
}
```

## 8. Performance Troubleshooting Guide

### Slow Query Diagnosis
```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;

-- Check missing indexes
SELECT
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;

-- Analyze table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS external_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Memory Leak Detection
```typescript
class MemoryMonitor {
  private baseline: NodeJS.MemoryUsage;
  private samples: NodeJS.MemoryUsage[] = [];
  
  start() {
    this.baseline = process.memoryUsage();
    
    setInterval(() => {
      const current = process.memoryUsage();
      this.samples.push(current);
      
      // Keep only last 100 samples
      if (this.samples.length > 100) {
        this.samples.shift();
      }
      
      // Check for potential leak
      if (this.detectLeak()) {
        console.warn('Potential memory leak detected');
        this.generateHeapSnapshot();
      }
    }, 60000); // Check every minute
  }
  
  private detectLeak(): boolean {
    if (this.samples.length < 10) return false;
    
    // Calculate trend
    const recentSamples = this.samples.slice(-10);
    const avgRecent = recentSamples.reduce((sum, s) => sum + s.heapUsed, 0) / 10;
    const avgBaseline = this.baseline.heapUsed;
    
    // Alert if memory increased by more than 50%
    return avgRecent > avgBaseline * 1.5;
  }
  
  private generateHeapSnapshot() {
    const v8 = require('v8');
    const fs = require('fs');
    const filename = `heap-${Date.now()}.heapsnapshot`;
    const stream = fs.createWriteStream(filename);
    v8.writeHeapSnapshot(stream);
  }
}
```

## 9. Performance Optimization Checklist

### Database
- [ ] Connection pooling configured
- [ ] Appropriate indexes created
- [ ] Query execution plans analyzed
- [ ] Partitioning implemented for large tables
- [ ] Vacuum and analyze scheduled
- [ ] Slow query log enabled
- [ ] Read replicas configured

### Caching
- [ ] Multi-layer cache implemented
- [ ] Cache TTL optimized
- [ ] Cache invalidation strategy defined
- [ ] Cache warming implemented
- [ ] Cache hit rate monitored
- [ ] CDN configured for static assets

### API
- [ ] Response compression enabled
- [ ] ETag/Last-Modified headers implemented
- [ ] Rate limiting configured
- [ ] Pagination implemented
- [ ] N+1 queries eliminated
- [ ] GraphQL DataLoader used

### Frontend
- [ ] Code splitting implemented
- [ ] Lazy loading configured
- [ ] Images optimized
- [ ] Bundle size monitored
- [ ] Service Worker caching
- [ ] Virtual scrolling for large lists

### Monitoring
- [ ] Performance metrics collected
- [ ] Alerts configured
- [ ] Load testing performed
- [ ] Performance budget defined
- [ ] Regular performance audits
- [ ] Real user monitoring (RUM) implemented