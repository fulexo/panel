# Development Guide

**Last Updated:** October 13, 2025  
**Status:** ✅ All Development Tools Configured and Tested

This guide provides comprehensive information for developers working on the Fulexo platform.

## 📋 Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Quality Standards](#code-quality-standards)
- [Testing Strategy](#testing-strategy)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Database Management](#database-management)
- [Common Tasks](#common-tasks)

---

## Development Environment Setup

### Prerequisites

Ensure you have the following installed:

```bash
# Check versions
node --version  # Should be 20.x or higher
npm --version   # Should be 10.x or higher
docker --version # Should be 24.x or higher
git --version   # Any recent version
```

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/fulexo/panel.git
cd panel

# 2. Install dependencies
npm install
npm run install:all

# 3. Setup environment variables
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env

# 4. Generate Prisma client
cd apps/api
npm run prisma:generate
cd ../..

# 5. Start Docker services
docker compose -f compose/docker-compose.yml up -d

# 6. Run database migrations
cd apps/api
npm run prisma:migrate:dev
npm run prisma:seed  # Optional: seed with demo data
cd ../..

# 7. Start development servers
npm run dev:all
```

---

## Project Structure

```
fulexo-panel/
├── apps/
│   ├── api/          # NestJS Backend API
│   │   ├── src/
│   │   │   ├── auth/          # Authentication & authorization
│   │   │   ├── orders/        # Order management
│   │   │   ├── products/      # Product management
│   │   │   ├── shipments/     # Shipping integration
│   │   │   ├── woocommerce/   # WooCommerce sync
│   │   │   └── ...
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # Database schema
│   │   │   └── migrations/    # Database migrations
│   │   └── package.json
│   │
│   ├── web/          # Next.js Frontend
│   │   ├── app/              # App router pages
│   │   ├── components/       # Reusable components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions
│   │   ├── types/           # TypeScript types
│   │   └── package.json
│   │
│   └── worker/       # BullMQ Background Worker
│       ├── index.ts         # Worker entry point
│       └── package.json
│
├── compose/          # Docker Compose configurations
├── scripts/          # Operational scripts
├── docs/            # Additional documentation
└── package.json     # Root workspace config
```

---

## Development Workflow

### Starting Development

```bash
# Terminal 1: Start Docker services (databases, monitoring)
docker compose -f compose/docker-compose.yml up

# Terminal 2: Start all apps
npm run dev:all

# OR start individually:
cd apps/api && npm run dev      # API on port 3000
cd apps/web && npm run dev      # Web on port 3001
cd apps/worker && npm run dev   # Worker on port 3002
```

### Code Quality Checks (Run Before Committing)

```bash
# 1. Lint check
npm run lint

# 2. Fix auto-fixable issues
npm run lint:fix

# 3. TypeScript check
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
cd apps/worker && npx tsc --noEmit

# 4. Run tests
npm run test

# 5. Format code (if using Prettier separately)
npm run format  # If configured
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes and commit
git add .
git commit -m "feat: your feature description"

# 3. Run all checks
npm run lint && npm run test

# 4. Push and create PR
git push origin feature/your-feature-name
```

---

## Code Quality Standards

### TypeScript Rules

All code must pass TypeScript strict mode:

- ✅ No implicit `any` types
- ✅ Strict null checks
- ✅ No unused variables or imports
- ✅ Explicit return types on public functions
- ✅ Proper error handling with typed exceptions

### ESLint Configuration

Current ESLint status: **0 errors, 0 warnings**

Rules enforced:
- No unused variables (prefix with `_` if intentionally unused)
- No unused imports
- Consistent naming conventions
- Proper React hooks usage
- No console.logs in production code (use logger)

### Code Style

```typescript
// ✅ Good: Proper typing and error handling
async function getUser(id: string): Promise<User> {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  } catch (error) {
    logger.error('Error fetching user', { error, userId: id });
    throw error;
  }
}

// ❌ Bad: Missing types, poor error handling
async function getUser(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  return user;
}
```

---

## Testing Strategy

### Unit Tests (Jest)

```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- products.service.spec.ts

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Run in UI mode for debugging
npm run test:e2e:ui

# Run specific test
npm run test:e2e -- tests/e2e/auth.spec.ts
```

### Component Tests (Cypress)

```bash
# Run Cypress tests
npm run test:cypress

# Open Cypress UI
npm run test:cypress:open
```

### Writing Tests

```typescript
// Unit test example
describe('ProductsService', () => {
  it('should create a product', async () => {
    const dto = { name: 'Test Product', sku: 'TEST-001', price: 99.99 };
    const result = await service.create('tenant-id', dto);
    expect(result.name).toBe('Test Product');
  });
});

// E2E test example
test('user can login', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/.*dashboard/);
});
```

---

## API Development

### Creating a New Module

```bash
# 1. Create module structure
mkdir -p apps/api/src/your-module
cd apps/api/src/your-module

# 2. Create files
touch your-module.module.ts
touch your-module.controller.ts
touch your-module.service.ts
touch dto/create-your-entity.dto.ts
touch dto/update-your-entity.dto.ts
```

### Module Template

```typescript
// your-module.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class YourModuleService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.yourEntity.findMany({
      where: { tenantId }
    });
  }
}

// your-module.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { YourModuleService } from './your-module.service';

@Controller('your-module')
@UseGuards(AuthGuard)
export class YourModuleController {
  constructor(private service: YourModuleService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.tenantId);
  }
}
```

### Adding Database Models

```bash
# 1. Edit Prisma schema
vim apps/api/prisma/schema.prisma

# 2. Create migration
cd apps/api
npm run prisma:migrate:dev --name add_your_table

# 3. Generate Prisma client
npm run prisma:generate
```

---

## Frontend Development

### Creating a New Page

```bash
# Create page directory
mkdir -p apps/web/app/your-page

# Create page file
cat > apps/web/app/your-page/page.tsx << 'EOF'
'use client';

import { PageHeader } from '@/components/PageHeader';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function YourPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <main className="mobile-container py-6">
          <PageHeader
            title="Your Page"
            description="Page description"
          />
          {/* Your content */}
        </main>
      </div>
    </ProtectedRoute>
  );
}
EOF
```

### Creating Reusable Components

```typescript
// components/YourComponent.tsx
import { cn } from '@/lib/utils';

interface YourComponentProps {
  className?: string;
  title: string;
}

export function YourComponent({ className, title }: YourComponentProps) {
  return (
    <div className={cn('base-classes', className)}>
      <h2>{title}</h2>
    </div>
  );
}
```

### Using API Hooks

```typescript
'use client';

import { useProducts } from '@/hooks/useApi';

export default function ProductsPage() {
  const { data, isLoading, error } = useProducts();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      {data?.products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

---

## Database Management

### Prisma Workflow

```bash
# Create a new migration
cd apps/api
npm run prisma:migrate:dev --name your_migration_name

# Apply migrations to production
npm run prisma:migrate:deploy

# Generate Prisma client (after schema changes)
npm run prisma:generate

# Open Prisma Studio (GUI for database)
npm run prisma:studio

# Reset database (development only - DESTRUCTIVE)
npm run prisma:migrate:reset

# Push schema without migration (development only)
npm run prisma:db:push
```

### Database Seeding

```bash
# Run seed script
cd apps/api
npm run prisma:seed

# Edit seed data
vim prisma/seed.ts
```

---

## Common Tasks

### Adding a New Dependency

```bash
# Root workspace
npm install package-name --save-dev

# Specific app
cd apps/api
npm install package-name

# After adding dependencies, verify
npm run lint
npm run build:all
```

### Debugging

#### API Debugging

```typescript
// Use NestJS logger
import { Logger } from '@nestjs/common';

export class YourService {
  private readonly logger = new Logger(YourService.name);

  async yourMethod() {
    this.logger.debug('Debug message');
    this.logger.log('Info message');
    this.logger.warn('Warning message');
    this.logger.error('Error message');
  }
}
```

#### Frontend Debugging

```typescript
// Use console in development only
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data);
}

// Use proper logger
import { logger } from '@/lib/logger';
logger.debug('Debug message', { context: data });
```

### Environment Variables

#### Adding New Environment Variables

1. Add to `.env.example`:
```bash
# New Feature
NEW_FEATURE_API_KEY=your_api_key_here
```

2. Add TypeScript typing (if in API):
```typescript
// apps/api/src/config/env.validation.ts
export const envValidationSchema = Joi.object({
  // ... existing
  NEW_FEATURE_API_KEY: Joi.string().required(),
});
```

3. Access in code:
```typescript
// API
const apiKey = this.configService.get<string>('NEW_FEATURE_API_KEY');

// Web (must be prefixed with NEXT_PUBLIC_)
const apiKey = process.env.NEXT_PUBLIC_NEW_FEATURE_API_KEY;
```

---

## Performance Optimization

### API Performance

```typescript
// Use database indexing
// Add to Prisma schema:
@@index([fieldName])
@@index([field1, field2])

// Use select to limit fields
const users = await prisma.user.findMany({
  select: { id: true, email: true }
});

// Use pagination
const products = await prisma.product.findMany({
  take: limit,
  skip: (page - 1) * limit
});
```

### Frontend Performance

```typescript
// Use React.memo for expensive components
export const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Use useMemo for expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.name.localeCompare(b.name));
}, [data]);

// Use useCallback for stable function references
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

---

## Monitoring and Observability

### Accessing Monitoring Tools

- **Grafana**: http://localhost:3001/grafana
  - Username: admin
  - Password: Check `.env` file

- **Prometheus**: http://localhost:9090
  - Direct access to metrics

- **Jaeger**: http://localhost:16686
  - Distributed tracing

### Adding Custom Metrics

```typescript
// API (Prometheus)
import { Counter } from 'prom-client';

const myCounter = new Counter({
  name: 'my_custom_metric_total',
  help: 'Description of metric',
  labelNames: ['label1', 'label2'],
});

myCounter.inc({ label1: 'value1', label2: 'value2' });
```

---

## Troubleshooting Development Issues

### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf apps/*/tsconfig.tsbuildinfo

# Regenerate Prisma types
cd apps/api && npm run prisma:generate

# Check for errors
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
cd apps/worker && npx tsc --noEmit
```

### Build Failures

```bash
# Clean all build artifacts
rm -rf apps/*/dist apps/*/.next apps/*/node_modules

# Reinstall dependencies
npm install
npm run install:all

# Rebuild
npm run build:all
```

### Hot Reload Not Working

```bash
# Next.js: Clear .next cache
rm -rf apps/web/.next

# NestJS: Restart dev server
# Ctrl+C and npm run dev

# Check for file watchers limit (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

## Contributing Guidelines

### Code Review Checklist

Before submitting a PR:

- [ ] All TypeScript errors resolved
- [ ] ESLint passes with no warnings
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] No console.logs or debug code
- [ ] Environment variables documented
- [ ] Migration scripts tested (if DB changes)

### Commit Message Format

Follow conventional commits:

```
feat: add new shipment tracking feature
fix: resolve cart calculation bug
docs: update API documentation
chore: update dependencies
test: add unit tests for auth service
refactor: improve order service performance
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

---

## Useful Commands

### Docker

```bash
# View all containers
docker compose ps

# View logs
docker compose logs -f api
docker compose logs -f web
docker compose logs -f worker

# Restart specific service
docker compose restart api

# Rebuild and restart
docker compose up -d --build api

# Clean everything (DESTRUCTIVE)
docker compose down -v
```

### Database

```bash
# Open Prisma Studio
cd apps/api && npm run prisma:studio

# Connect to PostgreSQL directly
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB

# Backup database
docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Restore database
docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB < backup.sql
```

### Redis/Valkey

```bash
# Connect to Redis CLI
docker compose exec valkey redis-cli

# Monitor commands
docker compose exec valkey redis-cli MONITOR

# Check keys
docker compose exec valkey redis-cli KEYS '*'

# Flush all data (development only)
docker compose exec valkey redis-cli FLUSHALL
```

---

## Resources

### Internal Documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Problem solving
- [SECURITY.md](./SECURITY.md) - Security guidelines
- [COMPREHENSIVE_REVIEW_SUMMARY.md](./COMPREHENSIVE_REVIEW_SUMMARY.md) - Code quality report

### External Resources
- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Karrio Documentation](https://docs.karrio.io/)

---

## Getting Help

1. Check this development guide
2. Search [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Review [COMPREHENSIVE_REVIEW_SUMMARY.md](./COMPREHENSIVE_REVIEW_SUMMARY.md)
4. Ask in team chat
5. Create GitHub issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details
   - Relevant logs/screenshots

---

**Happy Coding! 🚀**
