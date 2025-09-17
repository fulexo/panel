# Fulexo Platform - Architecture Documentation

## 🏗️ System Overview

Fulexo is a multi-tenant e-commerce management platform designed to handle multiple WooCommerce stores with advanced security, monitoring, and synchronization capabilities.

## 🎯 Core Principles

- **Multi-tenancy**: Complete data isolation between tenants
- **Security First**: End-to-end encryption and comprehensive security measures
- **Scalability**: Horizontal scaling with microservices architecture
- **Observability**: Full monitoring, logging, and tracing capabilities
- **Self-hosted**: Complete control over infrastructure and data

## 🏛️ High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        API_CLIENT[API Clients]
    end

    subgraph "Load Balancer & Reverse Proxy"
        NGINX[Nginx]
    end

    subgraph "Application Layer"
        API[NestJS API]
        WORKER[Background Worker]
        WEB_APP[Next.js Web App]
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL)]
        REDIS[(Redis/Valkey)]
        MINIO[(MinIO S3)]
    end

    subgraph "Monitoring & Observability"
        PROMETHEUS[Prometheus]
        GRAFANA[Grafana]
        LOKI[Loki]
        JAEGER[Jaeger]
    end

    subgraph "External Services"
        WOO[WooCommerce Stores]
        EMAIL[Email Service]
        SMS[SMS Service]
    end

    WEB --> NGINX
    MOBILE --> NGINX
    API_CLIENT --> NGINX

    NGINX --> API
    NGINX --> WEB_APP

    API --> POSTGRES
    API --> REDIS
    API --> MINIO

    WORKER --> POSTGRES
    WORKER --> REDIS
    WORKER --> MINIO

    API --> WOO
    WORKER --> WOO

    API --> EMAIL
    API --> SMS

    API --> PROMETHEUS
    WORKER --> PROMETHEUS
    PROMETHEUS --> GRAFANA

    API --> LOKI
    WORKER --> LOKI
    LOKI --> GRAFANA

    API --> JAEGER
    WORKER --> JAEGER
```

## 🏢 Multi-Tenant Architecture

### Tenant Isolation Strategy

Fulexo uses **Row Level Security (RLS)** for complete tenant data isolation:

```sql
-- Example: Orders table with RLS
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    external_order_no VARCHAR(255),
    status VARCHAR(50),
    total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation ON orders
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### Tenant Context Management

```typescript
// Tenant context is set per request
@Injectable()
export class TenantContextService {
  setTenantId(tenantId: string) {
    // Set tenant ID in database session
    this.prisma.$executeRaw`SET app.current_tenant_id = ${tenantId}`;
  }
}
```

## 🔐 Security Architecture

### Authentication & Authorization

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant D as Database
    participant R as Redis

    C->>A: Login Request
    A->>D: Validate Credentials
    D-->>A: User Data
    A->>A: Generate JWT Token
    A->>R: Store Session
    A-->>C: JWT Token + Session Cookie

    C->>A: API Request + JWT
    A->>A: Validate JWT
    A->>A: Check Permissions
    A->>D: Query with Tenant Context
    D-->>A: Tenant-Specific Data
    A-->>C: Response
```

### Encryption Strategy

1. **Data at Rest**: AES-256-GCM encryption for sensitive fields
2. **Data in Transit**: TLS 1.3 for all communications
3. **JWT Tokens**: RS256 in production, HS256 in development
4. **Passwords**: bcrypt with cost factor 10
5. **Sessions**: SHA256 hashed tokens

### Security Headers

```typescript
// Security headers applied globally
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

## 📊 Data Architecture

### Database Schema Design

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ ORDER : contains
    TENANT ||--o{ PRODUCT : contains
    TENANT ||--o{ WOO_STORE : connects
    
    USER ||--o{ SESSION : has
    USER ||--o{ AUDIT_LOG : creates
    
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER ||--o{ SHIPMENT : generates
    ORDER ||--o{ INVOICE : generates
    
    PRODUCT ||--o{ ORDER_ITEM : referenced_by
    PRODUCT ||--o{ STOCK_MOVEMENT : tracked_by
    
    WOO_STORE ||--o{ WEBHOOK_EVENT : receives
    WOO_STORE ||--o{ SYNC_LOG : creates
```

### Data Synchronization

```mermaid
sequenceDiagram
    participant W as WooCommerce
    participant A as API
    participant Q as Queue
    participant WK as Worker
    participant D as Database

    W->>A: Webhook Event
    A->>Q: Queue Event
    A-->>W: 200 OK

    WK->>Q: Process Event
    WK->>W: Fetch Full Data
    W-->>WK: Data Response
    WK->>D: Store/Update Data
    WK->>D: Log Sync Status
```

## 🔄 Background Job Processing

### Job Queue Architecture

```typescript
// Job types and their priorities
const JOB_TYPES = {
  // High Priority (Real-time)
  'process-webhook-events': { priority: 10, concurrency: 20 },
  'sync-orders': { priority: 8, concurrency: 10 },
  
  // Medium Priority (Scheduled)
  'sync-products': { priority: 5, concurrency: 5 },
  'generate-reports': { priority: 3, concurrency: 2 },
  
  // Low Priority (Maintenance)
  'cleanup-cache': { priority: 1, concurrency: 1 },
  'cleanup-sessions': { priority: 1, concurrency: 1 },
};
```

### Job Processing Flow

```mermaid
graph LR
    A[Job Created] --> B[Queue]
    B --> C{Worker Available?}
    C -->|Yes| D[Process Job]
    C -->|No| E[Wait in Queue]
    E --> C
    D --> F{Success?}
    F -->|Yes| G[Mark Complete]
    F -->|No| H{Retry?}
    H -->|Yes| I[Retry Job]
    H -->|No| J[Dead Letter Queue]
    I --> D
    G --> K[Cleanup]
    J --> L[Manual Review]
```

## 📈 Monitoring & Observability

### Metrics Collection

```typescript
// Prometheus metrics
const metrics = {
  // Business Metrics
  ordersTotal: new Counter({ name: 'orders_total', help: 'Total orders processed' }),
  syncLag: new Gauge({ name: 'sync_lag_seconds', help: 'Sync lag in seconds' }),
  
  // Technical Metrics
  httpRequests: new Counter({ name: 'http_requests_total', help: 'Total HTTP requests' }),
  jobDuration: new Histogram({ name: 'job_duration_seconds', help: 'Job processing time' }),
  dbConnections: new Gauge({ name: 'db_connections_active', help: 'Active DB connections' }),
};
```

### Logging Strategy

```typescript
// Structured logging with context
logger.info('Order processed', {
  orderId: order.id,
  tenantId: order.tenantId,
  status: order.status,
  processingTime: Date.now() - startTime,
  userId: user.id,
});
```

### Tracing

```typescript
// Distributed tracing with Jaeger
const span = tracer.startSpan('process-order');
span.setTag('order.id', order.id);
span.setTag('tenant.id', tenantId);

try {
  await processOrder(order);
  span.setTag('success', true);
} catch (error) {
  span.setTag('error', true);
  span.log({ event: 'error', message: error.message });
} finally {
  span.finish();
}
```

## 🌐 API Architecture

### RESTful API Design

```typescript
// API endpoint structure
/api/v1/
├── auth/           # Authentication
├── users/          # User management
├── tenants/        # Tenant management
├── orders/         # Order operations
├── products/       # Product management
├── shipments/      # Shipment tracking
├── returns/        # Return processing
├── invoices/       # Invoice management
├── billing/        # Billing operations
├── customers/      # Customer management
├── search/         # Search functionality
├── requests/       # Request management
├── calendar/       # Calendar integration
├── inbound/        # Inbound logistics
├── jobs/           # Job management
├── sync/           # Synchronization
└── woo/            # WooCommerce integration
```

### API Versioning Strategy

- **URL Versioning**: `/api/v1/orders`
- **Header Versioning**: `Accept: application/vnd.fulexo.v1+json`
- **Backward Compatibility**: Maintained for at least 2 major versions

### Rate Limiting

```typescript
// Rate limiting configuration
const rateLimits = {
  global: { windowMs: 60000, max: 100 },        // 100 req/min globally
  auth: { windowMs: 60000, max: 10 },           // 10 auth req/min
  api: { windowMs: 60000, max: 1000 },          // 1000 API req/min per user
  webhook: { windowMs: 60000, max: 100 },       // 100 webhook req/min
};
```

## 🎨 Frontend Architecture

### Next.js App Router Structure

```
app/
├── (auth)/          # Authentication pages
│   ├── login/
│   └── 2fa/
├── (dashboard)/     # Main application
│   ├── orders/
│   ├── products/
│   ├── shipments/
│   └── ...
├── api/             # API routes
├── globals.css      # Global styles
└── layout.tsx       # Root layout
```

### Component Architecture

```typescript
// Component hierarchy
App
├── ThemeProvider
├── QueryProvider
├── AppProvider
├── AuthProvider
└── ClientLayout
    ├── Sidebar
    ├── Header
    ├── MainContent
    └── NotificationContainer
```

### State Management

- **Server State**: React Query for API data
- **Client State**: React Context + useReducer
- **Form State**: React Hook Form with Zod validation
- **UI State**: Local component state

## 🐳 Container Architecture

### Docker Services

```yaml
# Core Services
services:
  api:          # NestJS API server
  web:          # Next.js web application
  worker:       # Background job processor
  postgres:     # Primary database
  valkey:       # Cache and job queue
  minio:        # Object storage

# Infrastructure Services
  nginx:        # Reverse proxy
  prometheus:   # Metrics collection
  grafana:      # Metrics visualization
  loki:         # Log aggregation
  jaeger:       # Distributed tracing
  alertmanager: # Alert management
```

### Container Networking

```yaml
networks:
  fulexo-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 🔧 Configuration Management

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@postgres:5432/fulexo
REDIS_URL=redis://valkey:6379/0

# Security Configuration
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-char-encryption-key
MASTER_KEY_HEX=your-master-key

# External Services
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Monitoring
PROMETHEUS_ENDPOINT=http://prometheus:9090
GRAFANA_ENDPOINT=http://grafana:3000
```

### Configuration Validation

```typescript
// Environment validation schema
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().length(32),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});
```

## 🚀 Deployment Architecture

### Production Deployment

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Load Balancer]
    end

    subgraph "Application Servers"
        API1[API Server 1]
        API2[API Server 2]
        WEB1[Web Server 1]
        WEB2[Web Server 2]
        WK1[Worker 1]
        WK2[Worker 2]
    end

    subgraph "Database Cluster"
        PG1[PostgreSQL Primary]
        PG2[PostgreSQL Replica]
        REDIS1[Redis Master]
        REDIS2[Redis Replica]
    end

    subgraph "Storage"
        MINIO1[MinIO Node 1]
        MINIO2[MinIO Node 2]
        MINIO3[MinIO Node 3]
    end

    LB --> API1
    LB --> API2
    LB --> WEB1
    LB --> WEB2

    API1 --> PG1
    API2 --> PG1
    API1 --> REDIS1
    API2 --> REDIS1

    WK1 --> PG1
    WK2 --> PG1
    WK1 --> REDIS1
    WK2 --> REDIS1

    PG1 --> PG2
    REDIS1 --> REDIS2

    API1 --> MINIO1
    API2 --> MINIO1
    WK1 --> MINIO1
    WK2 --> MINIO1
```

### Scaling Strategy

1. **Horizontal Scaling**: Add more API/Worker instances
2. **Database Scaling**: Read replicas for read-heavy operations
3. **Cache Scaling**: Redis cluster for high availability
4. **Storage Scaling**: MinIO cluster for object storage

## 🔍 Performance Considerations

### Caching Strategy

```typescript
// Multi-layer caching
const cacheStrategy = {
  L1: 'In-memory (Node.js)',     // Fastest, limited size
  L2: 'Redis',                   // Fast, shared across instances
  L3: 'Database',                // Slowest, persistent
};
```

### Database Optimization

- **Indexing**: Strategic indexes on frequently queried columns
- **Connection Pooling**: PgBouncer for connection management
- **Query Optimization**: Prisma query optimization
- **Partitioning**: Table partitioning for large datasets

### API Performance

- **Response Compression**: Gzip compression for API responses
- **Pagination**: Cursor-based pagination for large datasets
- **Rate Limiting**: Prevent API abuse
- **Caching**: Redis caching for expensive operations

## 🔒 Security Considerations

### Network Security

- **VPC**: Private network for internal services
- **Firewall**: Restrictive firewall rules
- **TLS**: End-to-end encryption
- **VPN**: Secure access to production environment

### Application Security

- **Input Validation**: Comprehensive input validation
- **SQL Injection**: Prisma ORM prevents SQL injection
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: CSRF tokens for state-changing operations

### Data Security

- **Encryption**: AES-256-GCM for sensitive data
- **Key Management**: Secure key storage and rotation
- **Backup Encryption**: Encrypted database backups
- **Audit Logging**: Comprehensive audit trail

## 📊 Monitoring & Alerting

### Health Checks

```typescript
// Health check endpoints
GET /health          # Overall system health
GET /health/db       # Database health
GET /health/redis    # Redis health
GET /health/storage  # MinIO health
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: fulexo.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
```

## 🎯 Future Enhancements

### Planned Features

1. **Microservices Migration**: Split monolith into microservices
2. **Event Sourcing**: Implement event sourcing for audit trails
3. **CQRS**: Command Query Responsibility Segregation
4. **GraphQL API**: Add GraphQL endpoint alongside REST
5. **Real-time Updates**: WebSocket support for real-time updates

### Scalability Improvements

1. **Kubernetes**: Container orchestration
2. **Service Mesh**: Istio for service communication
3. **Message Queues**: Apache Kafka for event streaming
4. **CDN**: Content delivery network for static assets

---

This architecture documentation provides a comprehensive overview of the Fulexo platform's design and implementation. For specific implementation details, refer to the individual service documentation and code comments.