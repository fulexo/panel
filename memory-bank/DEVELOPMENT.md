# Fulexo Platform - Development Guide

**Version:** 1.0.0  
**Last Updated:** October 23, 2025

---

## Quick Start (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/your-org/fulexo-panel.git
cd fulexo-panel

# 2. Start development stack
cd compose
docker-compose -f docker-compose.dev.yml up -d

# 3. Run migrations
docker-compose exec api npx prisma migrate deploy

# 4. Access
# Web: http://localhost:3001
# API: http://localhost:3000
# Docs: http://localhost:3000/docs

# 5. Login
# Email: admin@fulexo.com
# Password: demo123
```

**Est. Time:** 5 minutes

---

## Development Environment

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **Docker Desktop** with Docker Compose
- **Git**
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript + JavaScript
  - Tailwind CSS IntelliSense
  - Prisma

### Local Setup

**Option 1: Docker (Recommended)**
```bash
cd compose
docker-compose -f docker-compose.dev.yml up -d
```

**Option 2: Local Node**
```bash
# Install dependencies
npm install

# Start database & Redis (Docker)
cd compose
docker-compose -f docker-compose.dev.yml up -d postgres valkey minio

# Start API (local)
cd ../apps/api
npm run dev  # Port 3000

# Start Web (local)
cd ../apps/web
npm run dev  # Port 3001

# Start Worker (local)
cd ../apps/worker
npm run dev  # Port 3002
```

---

## Project Structure

```
/workspace
├── apps/
│   ├── api/              ← NestJS Backend (30 controllers)
│   │   ├── src/
│   │   │   ├── auth/         ← Authentication
│   │   │   ├── users/        ← User management
│   │   │   ├── tenants/      ← Multi-tenancy
│   │   │   ├── stores/       ← Store management
│   │   │   ├── products/     ← Products
│   │   │   ├── orders/       ← Orders
│   │   │   ├── customers/    ← Customers
│   │   │   ├── notifications/ ← Notifications (NEW!)
│   │   │   ├── modules/
│   │   │   │   ├── email/    ← Email service
│   │   │   │   ├── settings/ ← Settings service
│   │   │   │   └── ...
│   │   │   ├── woocommerce/  ← WooCommerce integration
│   │   │   ├── karrio/       ← Karrio shipping
│   │   │   └── ...
│   │   └── prisma/
│   │       ├── schema.prisma ← Database schema (25+ models)
│   │       └── migrations/   ← Database migrations
│   │
│   ├── web/              ← Next.js Frontend (29 pages)
│   │   ├── app/              ← Pages (App Router)
│   │   │   ├── dashboard/    ← Dashboard
│   │   │   ├── orders/       ← Order management
│   │   │   ├── products/     ← Product management
│   │   │   ├── stores/       ← Store management
│   │   │   ├── customers/    ← Customer management
│   │   │   ├── notifications/ ← Notifications (NEW!)
│   │   │   ├── settings/     ← Settings (NEW!)
│   │   │   └── ...
│   │   ├── components/       ← React components
│   │   │   ├── patterns/     ← Pattern components (11)
│   │   │   └── ui/           ← Base UI components
│   │   ├── hooks/            ← Custom React hooks
│   │   │   ├── useApi.ts     ← API hooks
│   │   │   ├── useNotifications.ts (NEW!)
│   │   │   ├── useSettings.ts (NEW!)
│   │   │   └── ...
│   │   └── lib/              ← Utilities
│   │
│   └── worker/           ← BullMQ Worker
│       └── src/
│           ├── jobs/         ← Job processors
│           └── queues/       ← Queue definitions
│
├── compose/              ← Docker configuration
│   ├── docker-compose.dev.yml   ← Development
│   ├── docker-compose.yml       ← Production
│   ├── docker-stack.yml         ← Docker Swarm
│   └── nginx/                   ← Nginx configs
│
└── memory-bank/          ← Documentation (5 files)
    ├── PROJECT.md            ← This project overview
    ├── TECH_STACK.md         ← Technologies
    ├── DEPLOYMENT.md         ← Deployment guide
    ├── DEVELOPMENT.md        ← Development guide (this file)
    └── STATUS.md             ← Current status
```

---

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/my-feature
```

### 2. Make Changes

**Backend (API):**
```bash
cd apps/api

# Create module
nest g module my-feature
nest g service my-feature
nest g controller my-feature

# Update Prisma schema
nano prisma/schema.prisma
npx prisma migrate dev --name add-my-feature

# Implement service/controller
# Write tests
npm run test
```

**Frontend (Web):**
```bash
cd apps/web

# Create page
mkdir -p app/my-feature
touch app/my-feature/page.tsx

# Create hook
touch hooks/useMyFeature.ts

# Create component
touch components/MyFeatureComponent.tsx

# Test locally
npm run dev
```

### 3. Test Changes

```bash
# Run linter
npm run lint

# Run type check
npx tsc --noEmit

# Run tests
npm run test

# E2E tests
npm run test:e2e
```

### 4. Commit & Push

```bash
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
```

---

## Common Development Tasks

### Add New API Endpoint

```typescript
// 1. Create DTO
// apps/api/src/my-module/dto/create-thing.dto.ts
export class CreateThingDto {
  @IsString()
  name: string;
}

// 2. Add Service Method
// apps/api/src/my-module/my-module.service.ts
async create(tenantId: string, dto: CreateThingDto) {
  return this.prisma.thing.create({
    data: { tenantId, ...dto }
  });
}

// 3. Add Controller Endpoint
// apps/api/src/my-module/my-module.controller.ts
@Post()
@Roles('ADMIN')
async create(@CurrentUser() user, @Body() dto: CreateThingDto) {
  return this.service.create(user.tenantId, dto);
}
```

### Add New Frontend Page

```typescript
// 1. Create Page
// apps/web/app/my-page/page.tsx
'use client';
import { useAuth } from '@/components/AuthProvider';
import { PageHeader } from '@/components/PageHeader';

export default function MyPage() {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      <main className="mobile-container py-6">
        <PageHeader title="My Page" icon={Icon} />
        {/* Content */}
      </main>
    </div>
  );
}

// 2. Create API Hook
// apps/web/hooks/useMyThing.ts
export function useMyThings() {
  return useQuery({
    queryKey: ['my-things'],
    queryFn: () => apiClient.get('/api/my-things')
  });
}

// 3. Add to Navigation
// apps/web/components/Navigation.tsx (if needed)
```

### Update Database Schema

```bash
# 1. Edit schema
nano apps/api/prisma/schema.prisma

# 2. Create migration
cd apps/api
npx prisma migrate dev --name my_change

# 3. Generate Prisma Client
npx prisma generate

# 4. Test migration
npm run dev

# 5. Commit migration files
git add prisma/migrations
git commit -m "db: add my_change migration"
```

---

## Debugging

### Backend Debugging

**VS Code Launch Configuration:**
```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to API",
  "port": 9229,
  "restart": true
}
```

**Start with debugger:**
```bash
cd apps/api
node --inspect=0.0.0.0:9229 -r ts-node/register src/main.ts
```

### Frontend Debugging

**Browser DevTools:**
- React DevTools extension
- TanStack Query DevTools (built-in)
- Network tab for API calls
- Console for errors

**Next.js Debugging:**
```bash
# Enable debug mode
DEBUG=* npm run dev

# Source maps enabled by default
# Set breakpoints in browser
```

### Database Debugging

```bash
# Prisma Studio (GUI)
cd apps/api
npx prisma studio
# Opens on http://localhost:5555

# SQL Logging
# Edit apps/api/src/prisma.service.ts
log: ['query', 'info', 'warn', 'error']

# Manual queries
docker-compose exec postgres psql -U fulexo_user -d fulexo
```

---

## Testing

### Unit Tests (Jest)

```bash
# Run all tests
npm run test

# Run specific file
npm run test users.service.spec.ts

# Watch mode
npm run test:watch

# Coverage
npm run test:cov
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
cd apps/web
npm run test:e2e

# Run specific test
npx playwright test tests/login.spec.ts

# UI mode
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

### API Testing

```bash
# Using curl
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fulexo.com","password":"demo123"}'

# Using Swagger UI
# http://localhost:3000/docs

# Using test scripts
node test-api-login.js
```

---

## Code Quality

### Linting

```bash
# Check all files
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Check specific file
npx eslint src/my-file.ts
```

### Type Checking

```bash
# Check all TypeScript
npx tsc --noEmit

# Check specific project
cd apps/api
npx tsc --noEmit

cd apps/web
npx tsc --noEmit
```

### Formatting

```bash
# Format all files
npx prettier --write .

# Check formatting
npx prettier --check .

# Format specific file
npx prettier --write src/my-file.ts
```

---

## Common Issues & Solutions

### Issue: "Module not found" Error

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Issue: TypeScript Errors

**Solution:**
```bash
# Regenerate Prisma Client
cd apps/api
npx prisma generate

# Clear TypeScript cache
rm -rf .next .turbo dist

# Restart TypeScript server (VS Code)
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Issue: Port Already in Use

**Solution:**
```bash
# Find process using port
sudo lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3005
```

### Issue: Database Connection Failed

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check DATABASE_URL
echo $DATABASE_URL

# Restart PostgreSQL
docker-compose restart postgres

# Wait a few seconds
sleep 5

# Test connection
docker-compose exec postgres pg_isready
```

### Issue: Redis Connection Failed

**Solution:**
```bash
# Check Valkey/Redis is running
docker-compose ps valkey

# Test connection
docker-compose exec valkey redis-cli ping
# Should return: PONG

# Restart Valkey
docker-compose restart valkey
```

---

## Environment Variables (Development)

**Minimal .env for local development:**
```bash
NODE_ENV=development
DOMAIN_API=http://localhost:3000
DOMAIN_APP=http://localhost:3001

# Database
POSTGRES_DB=fulexo
POSTGRES_USER=fulexo_user
POSTGRES_PASSWORD=localdev123
DATABASE_URL=postgresql://fulexo_user:localdev123@localhost:5432/fulexo

# Redis
REDIS_URL=redis://localhost:6379/0

# Security (dev-safe values)
JWT_SECRET=dev_jwt_secret_key_minimum_64_characters_for_local_development_only
ENCRYPTION_KEY=devkey1234567890123456789012dev!
MASTER_KEY_HEX=2c5e373def84c8229739b50511a6bba6e87db7755a2fb0b7bc8414880d55e65b

# Frontend
NEXT_PUBLIC_API_BASE=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Storage
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=fulexo-cache
```

See `compose/env-template` for complete list.

---

## Development Tools

### Prisma Studio

```bash
cd apps/api
npx prisma studio
# Opens on http://localhost:5555
# Visual database editor
```

### API Documentation

```bash
# Swagger UI (auto-generated)
http://localhost:3000/docs

# OpenAPI JSON
http://localhost:3000/docs-json
```

### Monitoring (Development)

```bash
# Prometheus
http://localhost:9090

# Grafana
http://localhost:3003
# admin / admin

# Jaeger
http://localhost:16686
```

---

## Database Management

### Create Migration

```bash
cd apps/api

# Create migration from schema changes
npx prisma migrate dev --name my_migration

# Apply migration
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate
```

### Seed Database

```bash
cd apps/api

# Run seed
npm run prisma:seed

# Or manually
node prisma/seed.js
```

**Seed creates:**
- 1 Admin user (admin@fulexo.com / demo123)
- 1 Tenant
- Sample settings
- Sample data (optional)

---

## WooCommerce Local Testing

### Setup Test WooCommerce Store

**Option 1: Use Existing Store**
- Use your own WooCommerce store
- Generate API keys (Settings → Advanced → REST API)

**Option 2: Local WooCommerce (Docker)**
```bash
# Run local WooCommerce
docker run -d \
  -p 8080:80 \
  -e WORDPRESS_DB_HOST=mysql \
  -e WORDPRESS_DB_NAME=wordpress \
  wordpress:latest

# Install WooCommerce plugin
# Generate API keys
# Use http://localhost:8080 as store URL
```

**Option 3: WooCommerce Demo Store**
```bash
Store URL: https://demo.woothemes.com
# Use demo credentials (check WooCommerce docs)
```

### Test Sync

```bash
# 1. Add store via UI
# 2. Click "Test Connection"
# 3. Click "Sync"
# 4. Check logs
docker-compose logs -f worker | grep woo

# 5. Check products
curl http://localhost:3000/api/products
```

---

## Common Development Commands

### Docker Commands

```bash
# Start dev stack
docker-compose -f docker-compose.dev.yml up -d

# Stop stack
docker-compose -f docker-compose.dev.yml down

# Rebuild service
docker-compose -f docker-compose.dev.yml build api

# View logs
docker-compose -f docker-compose.dev.yml logs -f api

# Execute command in container
docker-compose exec api npm run prisma:studio

# Clean rebuild (no cache)
docker-compose -f docker-compose.dev.yml build --no-cache
```

### NPM Commands

```bash
# Install dependencies
npm install

# Add package
npm install package-name

# Update dependencies
npm update

# Check outdated
npm outdated

# Audit security
npm audit
npm audit fix
```

### Prisma Commands

```bash
# Generate client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Prisma Studio
npx prisma studio

# Format schema
npx prisma format

# Validate schema
npx prisma validate
```

---

## Troubleshooting

### TypeScript Errors

**Problem:** Import errors, type errors  
**Solution:**
```bash
# Regenerate Prisma Client
cd apps/api
npx prisma generate

# Clear build cache
rm -rf .next dist .turbo

# Restart TS server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Docker Build Fails

**Problem:** Build errors, dependency issues  
**Solution:**
```bash
# Clear Docker cache
docker-compose down
docker system prune -af
docker volume prune -f

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d
```

### Database Migration Fails

**Problem:** Migration errors, schema conflicts  
**Solution:**
```bash
# Check current migration status
npx prisma migrate status

# Resolve migration
npx prisma migrate resolve --applied migration_name

# Or reset (WARNING: deletes all data)
npx prisma migrate reset
```

### Port Conflicts

**Problem:** "Port already in use"  
**Solution:**
```bash
# Find process on port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in .env
PORT=3005
```

### WooCommerce Connection Fails

**Problem:** "Connection failed" when testing store  
**Solution:**
```bash
# Verify WooCommerce REST API enabled
# Check: WooCommerce → Settings → Advanced → REST API → "Enable REST API"

# Test API manually
curl https://your-store.com/wp-json/wc/v3/system_status \
  -u "ck_xxx:cs_xxx"

# Check SSL certificate valid
curl -I https://your-store.com

# Try different URL formats (auto-tried by system):
# - /wp-json/wc/v3/products
# - /index.php?rest_route=/wc/v3/products
# - /wp-json/wc/v2/products
# - /index.php?rest_route=/wc/v2/products
```

### Email Not Sending (Development)

**Problem:** SMTP errors  
**Solution:**
```bash
# Use MailHog for development (catches emails)
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Update .env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=test
SMTP_PASS=test

# View emails: http://localhost:8025
```

---

## Code Style Guide

### TypeScript

```typescript
// ✅ Good: Use interfaces for objects
interface User {
  id: string;
  email: string;
}

// ✅ Good: Use type for unions
type Role = 'ADMIN' | 'CUSTOMER';

// ✅ Good: Use async/await
async function fetchData() {
  const result = await api.get('/data');
  return result.data;
}

// ❌ Bad: Using any
function process(data: any) { }  // Don't do this!

// ✅ Good: Proper typing
function process(data: User) { }
```

### React Components

```typescript
// ✅ Good: Functional components with TypeScript
interface Props {
  title: string;
  onSave: () => void;
}

export function MyComponent({ title, onSave }: Props) {
  return <div>{title}</div>;
}

// ✅ Good: Use custom hooks
const { data, isLoading } = useMyData();

// ✅ Good: Use pattern components
<PageHeader title="My Page" icon={Icon} />
<MetricCard label="Total" value="100" />
```

### Naming Conventions

```typescript
// Files
my-component.tsx        ← Component files
useMyHook.ts           ← Custom hooks
my-service.service.ts  ← Services
my.controller.ts       ← Controllers

// Variables
const myVariable = '';      ← camelCase
const MY_CONSTANT = '';     ← UPPER_SNAKE_CASE
interface MyInterface {}    ← PascalCase
type MyType = {};          ← PascalCase
enum MyEnum {}             ← PascalCase

// Functions
function myFunction() {}    ← camelCase
const MyComponent = () => {} ← PascalCase (React components)
```

---

## Performance Tips

### Frontend Performance

```typescript
// ✅ Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  // Expensive render
});

// ✅ Use useMemo for expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.value - b.value);
}, [data]);

// ✅ Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);

// ✅ Lazy load components
const HeavyComponent = dynamic(() => import('./HeavyComponent'));
```

### Backend Performance

```typescript
// ✅ Use database indexes
@@index([tenantId, createdAt])

// ✅ Use select to limit fields
prisma.user.findMany({
  select: { id: true, email: true }  // Only get needed fields
});

// ✅ Use pagination
prisma.product.findMany({
  skip: (page - 1) * limit,
  take: limit,
});

// ✅ Use Redis caching
const cached = await redis.get(key);
if (cached) return JSON.parse(cached);
// ... fetch from DB
await redis.setex(key, 30, JSON.stringify(result));
```

---

## Git Workflow

### Branch Naming

```
feature/my-feature     ← New features
fix/bug-description    ← Bug fixes
refactor/component     ← Refactoring
docs/update-readme     ← Documentation
chore/update-deps      ← Maintenance
```

### Commit Messages

```
feat: add notifications system
fix: correct product sync issue
refactor: improve error handling
docs: update deployment guide
chore: update dependencies
perf: optimize database queries
test: add unit tests for auth
```

---

## Useful Resources

### Documentation
- Next.js: https://nextjs.org/docs
- NestJS: https://docs.nestjs.com
- Prisma: https://www.prisma.io/docs
- TanStack Query: https://tanstack.com/query
- Tailwind: https://tailwindcss.com/docs

### Tools
- Prisma Studio: `npx prisma studio`
- Swagger UI: http://localhost:3000/docs
- React Query DevTools: Built-in (development)

---

**Document Owner:** Development Team  
**Review Frequency:** Monthly or when new patterns emerge  
**Next Review:** After major feature additions
