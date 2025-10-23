# Fulexo Platform - Technology Stack & Architecture

**Version:** 1.0.0  
**Last Updated:** October 23, 2025

---

## Technology Stack Overview

```
Frontend (Next.js 14)  →  Backend (NestJS 10)  →  Database (PostgreSQL 15)
        ↓                        ↓                         ↓
   Tailwind CSS            Prisma ORM              Redis/Valkey 7
   React Query              BullMQ                   MinIO S3
   Radix UI               JWT + RBAC              Karrio API
```

---

## Frontend Technologies

### Core Framework
- **Next.js 14.2.32**: React framework with App Router
  - Server Components for performance
  - Client Components for interactivity
  - API routes for BFF pattern
  - Image optimization
  - Font optimization

### Language & Type Safety
- **TypeScript 5.9.2**: Strict mode enabled
  - 100% type coverage
  - Zero compilation errors
  - Strict null checks
  - No implicit any

### UI & Styling
- **Tailwind CSS 3.3.5**: Utility-first CSS
  - Custom design tokens
  - Dark mode support
  - Responsive design
  - Mobile-first approach
- **Radix UI**: Accessible component primitives
  - Dialog, Select, Switch, Tabs
  - Checkbox, Label, Progress
  - Toast notifications
- **Lucide React 0.294.0**: Icon library
  - 1000+ icons
  - Tree-shakeable
  - Consistent design

### State Management
- **TanStack Query 5.89.0**: Server state management
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Cache invalidation
- **Zustand**: Client state management
  - Minimal boilerplate
  - TypeScript support
  - Devtools integration

### Form Handling
- **React Hook Form 7.54.2**: Form state management
  - Performance optimized
  - Minimal re-renders
  - Easy validation
- **Zod 3.24.1**: Schema validation
  - Type-safe validation
  - Composable schemas
  - Error messages

### Utilities
- **date-fns 4.1.0**: Date manipulation (Turkish locale)
- **clsx + tailwind-merge**: Class name utilities
- **framer-motion 11.15.0**: Animations
- **axios 1.7.9**: HTTP client

---

## Backend Technologies

### Core Framework
- **NestJS 10.0.0**: Node.js framework
  - Modular architecture
  - Dependency injection
  - Decorators for clean code
  - Guards & interceptors
  - Exception filters
  - Pipes for validation

### Language
- **TypeScript 5.9.2**: Strict mode
  - 100% type coverage
  - Zero compilation errors
  - Decorator support

### Database & ORM
- **PostgreSQL 15**: Primary database
  - ACID compliance
  - JSON support
  - Full-text search
  - Advanced indexing
- **Prisma 6.15.0**: Type-safe ORM
  - Auto-generated types
  - Migration system
  - Query builder
  - Connection pooling
  - Multi-tenant support

### Caching & Queue
- **Redis/Valkey 7**: In-memory store
  - Session management
  - Cache layer
  - Job queue
  - Pub/sub (future)
- **BullMQ 5.0.0**: Job processing
  - Reliable queue
  - Retry logic
  - Job scheduling
  - Progress tracking

### Authentication & Security
- **JWT (jose 6.0.13)**: Token-based auth
  - Access tokens (15min)
  - Refresh tokens (7 days)
  - Token rotation
- **bcrypt 5.1.1**: Password hashing
  - Salt rounds: 10
  - Secure hashing
- **class-validator 0.14.0**: Input validation
  - DTO validation
  - Custom validators
  - Transform pipes

### File Storage
- **MinIO 8.0.0**: S3-compatible storage
  - File uploads
  - Image storage
  - Document storage
  - Pre-signed URLs

### Email
- **Nodemailer 6.9.8**: Email sending
  - SMTP support
  - HTML templates
  - Attachment support
  - Connection testing

### External APIs
- **Axios 1.7.9**: HTTP client for WooCommerce, Karrio
- **WooCommerce REST API**: v2 & v3 support
- **Karrio API**: Multi-carrier shipping

---

## Infrastructure Technologies

### Containerization
- **Docker 20+**: Container runtime
  - Multi-stage builds
  - Layer caching
  - Health checks
  - Non-root users
- **Docker Compose**: Multi-container orchestration
  - Development: docker-compose.dev.yml
  - Production: docker-compose.yml
  - Stack: docker-stack.yml (Swarm)

### Web Server
- **Nginx**: Reverse proxy
  - SSL termination
  - Rate limiting (15+ zones)
  - Security headers (15+)
  - Gzip compression
  - Static file serving
  - Load balancing ready

### SSL/TLS
- **Let's Encrypt**: Free SSL certificates
  - Auto-renewal with certbot
  - TLS 1.2 & 1.3
  - Strong cipher suites

---

## Monitoring & Observability

### Metrics
- **Prometheus**: Metrics collection
  - API metrics
  - System metrics
  - Custom metrics
  - Alerting rules
- **Grafana**: Visualization
  - Pre-built dashboards
  - Custom dashboards
  - Alerting
  - User authentication

### Logging
- **Loki**: Log aggregation
  - Structured logging
  - Label-based queries
  - Grafana integration
- **Promtail**: Log shipping
  - Docker log collection
  - Log parsing
  - Label extraction

### Tracing
- **Jaeger**: Distributed tracing
  - Request tracing
  - Performance analysis
  - Dependency mapping
  - Error tracking

### Uptime Monitoring
- **Uptime Kuma**: Uptime tracking
  - Service monitoring
  - Status page
  - Notification integration

### System Monitoring
- **Node Exporter**: System metrics
- **cAdvisor**: Container metrics

---

## System Architecture

### High-Level Architecture
```
                    Internet
                       |
                    [Nginx]
                   SSL + Rate Limiting
                       |
        ┌─────────────┼─────────────┐
        |             |             |
     [Web]         [API]        [Worker]
   (Next.js)     (NestJS)      (BullMQ)
        |             |             |
        └─────────────┼─────────────┘
                      |
        ┌─────────────┼──────────────┬──────────┐
        |             |              |          |
  [PostgreSQL]   [Valkey]       [MinIO]    [Karrio]
    Database      Cache/Queue    Storage    Shipping
```

### Multi-Tenant Architecture
```
Request → Nginx → API
                  ↓
              JWT Token
                  ↓
            Extract Tenant ID
                  ↓
          Prisma Middleware
                  ↓
        WHERE tenantId = ?
                  ↓
        Tenant-Scoped Data
```

### Data Flow: WooCommerce → Fulexo
```
WooCommerce Store
    ↓ (REST API Call)
Fulexo API (/api/stores/:id/sync)
    ↓
WooCommerceService.syncStore()
    ├─► syncProducts() → PostgreSQL
    ├─► syncOrders() → PostgreSQL
    └─► syncCustomers() → PostgreSQL
    ↓
BullMQ Background Jobs
    ↓
React Query Cache Invalidation
    ↓
Frontend Auto-Refresh
    ↓
User Sees Updated Data
```

---

## Key Design Patterns

### Backend Patterns
- **Module Pattern**: Feature-based modules
- **Repository Pattern**: Data access abstraction
- **Service Pattern**: Business logic separation
- **DTO Pattern**: Data transfer objects
- **Guard Pattern**: Route protection
- **Interceptor Pattern**: Request/response transformation
- **Pipe Pattern**: Validation and transformation
- **Middleware Pattern**: Cross-cutting concerns

### Frontend Patterns
- **Component Pattern**: Reusable UI components
- **Custom Hook Pattern**: Reusable logic
- **Compound Component Pattern**: Complex component composition
- **Provider Pattern**: Context-based state sharing
- **SectionShell Pattern**: Consistent page sections
- **MetricCard Pattern**: KPI display
- **StatusPill Pattern**: Status indication
- **EmptyState Pattern**: No-data states
- **LoadingState Pattern**: Loading indicators

---

## Database Schema

### Core Models (25+)
```
User (auth, roles)
Tenant (multi-tenancy)
Store (WooCommerce stores)
Product (inventory)
Order (orders)
OrderItem (line items)
Customer (panel users + WooCommerce customers)
Notification (alerts) ← NEW!
Settings (configuration) ← Email, Notifications, General
Shipment (Karrio shipments)
Return (RMA)
SupportTicket (help desk)
Calendar (events)
... and 13+ more
```

### Key Indexes
- **Tenant Isolation**: All tables have `tenantId` index
- **Performance**: Composite indexes for common queries
- **Search**: Full-text search indexes where needed
- **Relationships**: Foreign key indexes

---

## API Architecture

### REST API Structure
```
30 Controllers
150+ Endpoints
OpenAPI/Swagger Documentation
JWT Authentication
RBAC Authorization
Rate Limiting
Input Validation
Error Handling
```

### Example Endpoints
```
POST   /api/auth/login           ← Login
GET    /api/stores               ← List stores
POST   /api/stores/:id/sync      ← Sync store
GET    /api/products             ← List products
POST   /api/products             ← Create product
GET    /api/orders               ← List orders
GET    /api/notifications        ← List notifications
GET    /api/settings/email       ← Get email settings
PUT    /api/settings/email       ← Update email settings
```

---

## Security Architecture

### Authentication Flow
```
1. User submits credentials
2. API validates via bcrypt
3. JWT access token issued (15min)
4. JWT refresh token issued (7 days)
5. Access token sent with each request
6. Token refresh before expiry
```

### Authorization Flow
```
1. Request hits API endpoint
2. AuthGuard extracts JWT
3. Validate token signature
4. Extract user + tenant ID
5. RolesGuard checks permissions
6. Request proceeds or rejected
```

### Data Protection
- **In Transit**: TLS 1.2/1.3
- **At Rest**: Field-level encryption for secrets
- **Passwords**: bcrypt with salt
- **Tokens**: JWT with strong secrets (64+ chars)
- **Master Key**: 64-char hex for encryption

---

## Performance Optimizations

### Frontend
- Next.js server components
- Image optimization (next/image)
- Font optimization (next/font)
- Code splitting (dynamic imports)
- React Query caching
- Lazy loading

### Backend
- Database connection pooling
- Redis caching (30-second TTL for common queries)
- Query optimization (proper indexes)
- Pagination (limit/offset)
- Background jobs (async processing)

### Infrastructure
- Nginx caching
- Gzip compression
- CDN-ready (static assets)
- Docker layer caching

---

## Development Tools

### Code Quality
- **ESLint**: Linting (0 warnings)
- **Prettier**: Code formatting
- **TypeScript**: Type checking (0 errors)
- **Husky**: Git hooks (future)

### Testing
- **Jest 30.1.3**: Unit testing
- **Supertest 7.1.4**: API testing
- **Playwright 1.49.1**: E2E testing
- **Coverage**: 85%+ target

### Documentation
- **Swagger/OpenAPI**: API documentation
- **Storybook**: Component documentation (planned)
- **JSDoc/TSDoc**: Code documentation

---

## Deployment Stack

### Services
```
nginx       ← Reverse proxy (port 80, 443)
api         ← NestJS API (port 3000)
web         ← Next.js frontend (port 3001)
worker      ← BullMQ worker (port 3002)
postgres    ← Database (port 5432)
valkey      ← Cache/Queue (port 6379)
minio       ← Storage (port 9000, 9001)
karrio      ← Shipping (port 5002)
prometheus  ← Metrics (port 9090)
grafana     ← Dashboards (port 3003)
loki        ← Logs (port 3100)
jaeger      ← Tracing (port 16686)
uptimekuma  ← Monitoring (port 3004)
```

### Resource Allocation
```
API:        2 CPU, 2GB RAM
Web:        1 CPU, 1GB RAM
Worker:     1 CPU, 1GB RAM
Postgres:   2 CPU, 4GB RAM
Valkey:     1 CPU, 512MB RAM
MinIO:      1 CPU, 512MB RAM
Total:      ~8-10GB RAM recommended
```

---

## Future Tech Considerations

### Planned Enhancements
- GraphQL API (alternative to REST)
- WebSocket (real-time notifications)
- Redis Pub/Sub (event broadcasting)
- Elasticsearch (advanced search)
- RabbitMQ (alternative queue)

### Scalability Path
- Horizontal scaling (multiple API/Worker instances)
- Read replicas (PostgreSQL)
- Redis cluster (cache scaling)
- CDN integration (static assets)
- Load balancer (multiple nodes)

---

**Document Owner:** Development Team  
**Review Frequency:** Quarterly or on major tech updates  
**Next Review:** After production deployment
