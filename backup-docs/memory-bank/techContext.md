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
```

#### 2. Environment Configuration
```bash
# Use the development-friendly example
cp .env.development.example .env

# Or use the template for customization
cp compose/env-template .env

# Copy to compose directory
cp .env compose/.env
```

#### 3. Start Development Stack (Recommended)
```bash
cd compose
docker-compose -f docker-compose.dev.yml up -d
```

This starts all services with HTTP only (no SSL certificates required).

#### 4. Initialize Database
```bash
# Wait for services to start
sleep 30

# Run database migrations
docker exec fulexo-api npx prisma migrate deploy
```

#### 5. Access Services
- **Web Panel**: http://localhost:3001
- **API**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Karrio Dashboard**: http://localhost:5001

#### Alternative: Manual Service Start
If you prefer running services outside Docker:
```bash
# Terminal 1: Infrastructure
cd compose
docker-compose -f docker-compose.dev.yml up -d postgres valkey minio karrio-db karrio-redis

# Terminal 2: API
cd apps/api
npm install
npm run start:dev

# Terminal 3: Web
cd apps/web
npm install
npm run dev

# Terminal 4: Worker
cd apps/worker
npm install
npm run start:dev
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
# Development (HTTP only, no SSL required)
cd compose
docker-compose -f docker-compose.dev.yml up -d

# Production (HTTPS with SSL certificates)
cd compose
docker-compose up -d

# Alternative production file
docker-compose -f ../docker-compose.prod.yml up -d

# Cleanup
docker-compose down
docker-compose down -v  # Also removes volumes (data loss!)
docker system prune -a  # Clean all unused images/containers
```

### Swarm Workflow
```bash
# Initialize Swarm (if not already)
docker swarm init

# Prepare env
cd compose
cp ../.env .env

# Build and push images externally (CI or manual), then deploy
docker stack deploy -c docker-stack.yml fulexo

# Inspect services
docker stack services fulexo
```

## Environment Configuration

### Development Environment (.env.development.example)
```bash
# Core Settings
NODE_ENV=development
DOMAIN_API=http://localhost:3000
DOMAIN_APP=http://localhost:3001

# Database
DATABASE_URL=postgresql://fulexo_user:localdev123@postgres:5432/fulexo

# Redis/Valkey
REDIS_URL=redis://valkey:6379/0

# Security (dev defaults - CHANGE IN PRODUCTION!)
JWT_SECRET=dev_jwt_secret_key_minimum_64_characters_for_local_development_only_change_this
ENCRYPTION_KEY=devkey1234567890123456789012dev!

# S3/MinIO
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=fulexo-cache

# Karrio Integration
KARRIO_API_URL=http://karrio-server:5002
KARRIO_SECRET_KEY=dev_karrio_secret_key_change_in_production_minimum_32_chars
```

### Production Environment
```bash
# Core Settings
NODE_ENV=production
DOMAIN_API=https://api.fulexo.com
DOMAIN_APP=https://panel.fulexo.com

# Database
DATABASE_URL=postgresql://user:strong_password@postgres:5432/fulexo_prod

# Redis
REDIS_URL=redis://valkey:6379/0

# Security (use strong, unique values)
JWT_SECRET=<generate with: openssl rand -hex 32>  # 64+ chars
ENCRYPTION_KEY=<generate with: openssl rand -hex 16>  # exactly 32 chars

# S3/MinIO or AWS S3
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=<your_aws_access_key>
S3_SECRET_KEY=<your_aws_secret_key>
S3_BUCKET=fulexo-production

# External Services
KARRIO_API_URL=https://karrio.fulexo.com
KARRIO_SECRET_KEY=<strong_unique_secret_minimum_32_chars>
```

## Nginx Host Derivation Pattern

- `DOMAIN_API` and `DOMAIN_APP` are full URLs for CORS correctness
- Nginx needs bare hostnames for `server_name` and certificate paths
- Compose entrypoint derives `API_HOST`/`APP_HOST` via `sed` and templates with `envsubst`

Example:
```bash
API_HOST=$(printf '%s' "$DOMAIN_API" | sed -E 's#^https?://##; s#/.*$##')
APP_HOST=$(printf '%s' "$DOMAIN_APP" | sed -E 's#^https?://##; s#/.*$##')
envsubst '$$API_HOST $$APP_HOST' < app.conf.template > app.conf
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

