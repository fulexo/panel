# Technical Context

## Technology Stack

### Frontend Technologies
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **TanStack Query**: Server state management
- **Zustand**: Client state management

### Backend Technologies
- **NestJS 10**: Node.js framework with TypeScript
- **Prisma**: Type-safe database ORM
- **PostgreSQL 15**: Primary database
- **Redis/Valkey 7**: Caching and job queue
- **BullMQ**: Background job processing
- **JWT**: Authentication tokens
- **bcrypt**: Password hashing
- **class-validator**: Input validation

### Infrastructure Technologies
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Reverse proxy and load balancer
- **MinIO**: S3-compatible object storage
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **Loki**: Log aggregation
- **Jaeger**: Distributed tracing

### External Integrations
- **WooCommerce**: E-commerce platform integration
- **Karrio**: Multi-carrier shipping API
- **Let's Encrypt**: SSL certificate management
- **GitHub Actions**: CI/CD pipeline

## Development Setup

### Prerequisites
- **Node.js**: Version 18+ (LTS recommended)
- **Docker**: Version 20+ with Docker Compose
- **Git**: Version control
- **VS Code**: Recommended IDE with extensions

### Local Development Environment

#### 1. Repository Setup
```bash
git clone <repository-url>
cd panel
npm install
```

#### 2. Environment Configuration
```bash
cp compose/env-template .env
# Edit .env with your configuration
cp .env compose/.env
```

#### 3. Infrastructure Services
```bash
cd compose
docker-compose up -d postgres valkey minio
```

#### 4. Application Services
```bash
# Terminal 1: API
cd apps/api
npm install
npm run start:dev

# Terminal 2: Web
cd apps/web
npm install
npm run dev

# Terminal 3: Worker
cd apps/worker
npm install
npm run start:dev
```

#### 5. Database Setup
```bash
cd apps/api
npm run prisma:migrate:deploy
npm run prisma:generate
```

### Development Tools

#### Code Quality Tools
- **ESLint**: Code linting with custom rules
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks
- **lint-staged**: Pre-commit linting
- **TypeScript**: Compile-time type checking

#### Testing Tools
- **Jest**: Unit testing framework
- **Playwright**: End-to-end testing
- **React Testing Library**: Component testing
- **MSW**: API mocking for tests

#### Development Utilities
- **Prisma Studio**: Database GUI
- **Redis Commander**: Redis management
- **MinIO Console**: Object storage management
- **Grafana**: Metrics dashboard

## Technical Constraints

### Performance Constraints
- **API Response Time**: < 200ms average
- **Page Load Time**: < 2s initial load
- **Database Queries**: < 100ms for simple queries
- **Memory Usage**: < 512MB per service
- **CPU Usage**: < 50% under normal load

### Scalability Constraints
- **Concurrent Users**: Support 1000+ concurrent users
- **Data Volume**: Handle 1M+ records per tenant
- **File Storage**: Support 100GB+ per tenant
- **API Rate Limits**: 1000 requests per minute per user

### Security Constraints
- **Data Encryption**: All sensitive data encrypted at rest
- **Transport Security**: HTTPS/TLS for all communications
- **Authentication**: JWT with refresh token rotation
- **Authorization**: RBAC with tenant isolation
- **Audit Logging**: Complete audit trail for all operations

### Browser Support
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Accessibility**: WCAG AA compliance
- **Responsive Design**: Mobile-first approach

## Dependencies

### Production Dependencies

#### Frontend (apps/web)
```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.0.0",
  "@radix-ui/react-*": "^1.0.0",
  "react-hook-form": "^7.0.0",
  "zod": "^3.0.0",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^4.0.0"
}
```

#### Backend (apps/api)
```json
{
  "@nestjs/core": "^10.0.0",
  "@nestjs/common": "^10.0.0",
  "@nestjs/platform-express": "^10.0.0",
  "@prisma/client": "^5.0.0",
  "prisma": "^5.0.0",
  "bullmq": "^4.0.0",
  "jsonwebtoken": "^9.0.0",
  "bcrypt": "^5.0.0",
  "class-validator": "^0.14.0"
}
```

#### Worker (apps/worker)
```json
{
  "bullmq": "^4.0.0",
  "@prisma/client": "^5.0.0",
  "axios": "^1.0.0",
  "node-cron": "^3.0.0"
}
```

### Development Dependencies
```json
{
  "eslint": "^8.0.0",
  "prettier": "^3.0.0",
  "husky": "^8.0.0",
  "lint-staged": "^15.0.0",
  "jest": "^29.0.0",
  "playwright": "^1.40.0",
  "@testing-library/react": "^14.0.0"
}
```

## Tool Usage Patterns

### Git Workflow
```bash
# Feature development
git checkout -b feature/feature-name
git add .
git commit -m "feat: add feature description"
git push origin feature/feature-name

# Create pull request
# After review and approval
git checkout main
git pull origin main
git branch -d feature/feature-name
```

### Code Quality Workflow
```bash
# Pre-commit (automatic via Husky)
npm run lint
npm run type-check
npm run test

# Manual quality checks
npm run lint:fix
npm run format
npm run test:coverage
```

### Database Workflow
```bash
# Create migration
npm run prisma:migrate:dev --name migration-name

# Apply migrations
npm run prisma:migrate:deploy

# Generate Prisma client
npm run prisma:generate

# Reset database (development only)
npm run prisma:migrate:reset
```

### Docker Workflow
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d

# Cleanup
docker-compose down -v
docker system prune -a
```

## Environment Configuration

### Development Environment
```bash
NODE_ENV=development
PORT=3000
WORKER_PORT=3002

# Database
DATABASE_URL=postgresql://fulexo:password@localhost:5433/fulexo_dev

# Redis
REDIS_URL=redis://localhost:6380

# Security
JWT_SECRET=development-secret-key
ENCRYPTION_KEY=development-encryption-key

# External Services
WOOCOMMERCE_API_URL=https://your-store.com/wp-json/wc/v3
KARRIO_API_URL=http://localhost:5002
```

### Production Environment
```bash
NODE_ENV=production
PORT=3000
WORKER_PORT=3002

# Database
DATABASE_URL=postgresql://user:password@db:5432/fulexo_prod

# Redis
REDIS_URL=redis://redis:6379

# Security (use strong, unique values)
JWT_SECRET=production-jwt-secret-64-chars-minimum
ENCRYPTION_KEY=production-encryption-key-32-chars

# External Services
WOOCOMMERCE_API_URL=https://your-store.com/wp-json/wc/v3
KARRIO_API_URL=https://karrio.yourdomain.com
```

## Deployment Architecture

### Docker Compose Services
```yaml
services:
  nginx:          # Reverse proxy
  postgres:       # Primary database
  valkey:         # Cache and queue
  minio:          # Object storage
  api:            # Backend API
  web:            # Frontend application
  worker:         # Background jobs
  prometheus:     # Metrics collection
  grafana:        # Metrics visualization
  loki:           # Log aggregation
  jaeger:         # Distributed tracing
```

### Production Deployment
```bash
# 1. Server setup
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose-plugin -y

# 2. Clone repository
git clone <repository-url>
cd panel

# 3. Configure environment
cp compose/env-template .env
# Edit .env with production values

# 4. Start services
cd compose
docker-compose -f docker-compose.prod.yml up -d

# 5. Run migrations
cd ../apps/api
npm run prisma:migrate:deploy
```

## Monitoring and Observability

### Metrics Collection
- **Prometheus**: Collects metrics from all services
- **Custom Metrics**: Business metrics and KPIs
- **System Metrics**: CPU, memory, disk usage
- **Application Metrics**: Request rates, response times, error rates

### Logging
- **Structured Logging**: JSON format for all logs
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Loki**: Centralized log aggregation
- **Log Rotation**: Automatic log cleanup

### Tracing
- **Jaeger**: Distributed request tracing
- **Request Correlation**: Track requests across services
- **Performance Analysis**: Identify bottlenecks
- **Error Tracking**: Trace error propagation

### Alerting
- **Prometheus Alerts**: Threshold-based alerting
- **Alertmanager**: Alert routing and notification
- **Critical Alerts**: Service down, high error rates
- **Warning Alerts**: Performance degradation, resource usage

---

**Last Updated**: December 2024  
**Focus**: Technical implementation details  
**Next Review**: When technology stack changes

