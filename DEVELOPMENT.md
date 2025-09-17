# Fulexo Platform - Development Guide

## 🚀 Getting Started

This guide will help you set up the Fulexo platform for local development.

### Prerequisites

- **Node.js**: Version 20+ (recommended: 20.11.0)
- **Docker**: Version 24+ with Docker Compose v2
- **PostgreSQL**: Version 16+ (via Docker)
- **Redis/Valkey**: Version 7+ (via Docker)
- **Git**: For version control

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space
- **OS**: Ubuntu 22.04+, macOS 12+, or Windows 10+

## 🏗️ Project Structure

```
/workspace
├── apps/
│   ├── api/                 # NestJS Backend API
│   │   ├── src/
│   │   │   ├── auth/        # Authentication & Authorization
│   │   │   ├── orders/      # Order Management
│   │   │   ├── products/    # Product Management
│   │   │   ├── shipments/   # Shipment Management
│   │   │   ├── tenants/     # Multi-tenant Management
│   │   │   ├── users/       # User Management
│   │   │   ├── woocommerce/ # WooCommerce Integration
│   │   │   └── ...
│   │   ├── prisma/          # Database Schema & Migrations
│   │   └── Dockerfile
│   ├── web/                 # Next.js Frontend
│   │   ├── app/             # App Router Pages
│   │   ├── components/      # React Components
│   │   ├── contexts/        # React Contexts
│   │   ├── hooks/           # Custom Hooks
│   │   ├── lib/             # Utility Libraries
│   │   └── Dockerfile
│   └── worker/              # Background Job Processor
│       ├── lib/             # Worker Utilities
│       └── Dockerfile
├── compose/                 # Docker Compose Configurations
│   ├── docker-compose.yml   # Development Environment
│   ├── nginx/               # Reverse Proxy Config
│   ├── prometheus/          # Metrics Configuration
│   └── ...
├── scripts/                 # Management Scripts
└── docs/                    # Documentation
```

## 🔧 Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/fulexo/panel.git
cd panel
```

### 2. Environment Configuration

Create environment files for each service:

```bash
# Copy environment templates
cp compose/env-template .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/worker/.env.example apps/worker/.env
```

### 3. Start Development Environment

```bash
# Start all services with Docker Compose
docker compose -f compose/docker-compose.yml up -d

# Or use the development script
./scripts/quick-start.sh
```

### 4. Database Setup

```bash
# Run database migrations
cd apps/api
npm run prisma:migrate

# Seed the database (optional)
npm run prisma:seed
```

### 5. Start Development Servers

```bash
# Terminal 1: API Server
cd apps/api
npm run dev

# Terminal 2: Web Application
cd apps/web
npm run dev

# Terminal 3: Worker Service
cd apps/worker
npm run dev
```

## 🛠️ Development Workflow

### API Development

The API is built with NestJS and follows these patterns:

#### Module Structure
```typescript
// Example: orders/orders.module.ts
@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService],
})
export class OrdersModule {}
```

#### Service Pattern
```typescript
// Example: orders/orders.service.ts
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll(filters: OrderFilters): Promise<Order[]> {
    // Implementation
  }
}
```

#### Controller Pattern
```typescript
// Example: orders/orders.controller.ts
@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
@ApiTags('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  async findAll(@Query() filters: OrderFilters): Promise<Order[]> {
    return this.ordersService.findAll(filters);
  }
}
```

### Frontend Development

The frontend is built with Next.js 14 using the App Router:

#### Page Structure
```typescript
// Example: app/orders/page.tsx
export default function OrdersPage() {
  return (
    <div>
      <h1>Orders</h1>
      {/* Page content */}
    </div>
  );
}
```

#### Component Pattern
```typescript
// Example: components/OrderCard.tsx
interface OrderCardProps {
  order: Order;
  onEdit?: (order: Order) => void;
}

export function OrderCard({ order, onEdit }: OrderCardProps) {
  return (
    <div className="order-card">
      {/* Component content */}
    </div>
  );
}
```

### Worker Development

The worker service processes background jobs:

#### Job Processor Pattern
```typescript
// Example: Job processor
const jobProcessors = {
  'sync-orders': async (job) => {
    const { accountId } = job.data;
    // Process order synchronization
    return { success: true, accountId };
  },
};
```

## 🧪 Testing

### Running Tests

```bash
# API Tests
cd apps/api
npm run test
npm run test:e2e

# Frontend Tests
cd apps/web
npm run test

# Worker Tests
cd apps/worker
npm run test
```

### Test Structure

```typescript
// Example: orders.service.spec.ts
describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [OrdersService, PrismaService],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should return orders', async () => {
    // Test implementation
  });
});
```

## 📊 Database Management

### Prisma Schema

The database schema is managed with Prisma:

```prisma
// Example: prisma/schema.prisma
model Order {
  id            String   @id @default(cuid())
  tenantId      String
  externalOrderNo String
  status        String
  total         Decimal?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("orders")
}
```

### Migrations

```bash
# Create a new migration
npm run prisma:migrate dev --name add_order_status

# Apply migrations
npm run prisma:migrate deploy

# Reset database
npm run prisma:migrate reset
```

### Database Seeding

```bash
# Seed the database
npm run prisma:seed

# View data in Prisma Studio
npm run prisma:studio
```

## 🔍 Debugging

### API Debugging

```bash
# Enable debug logging
DEBUG=* npm run dev

# View API logs
docker logs -f compose-api-1
```

### Frontend Debugging

```bash
# Enable Next.js debug mode
DEBUG=* npm run dev

# View browser console
# Open DevTools in your browser
```

### Worker Debugging

```bash
# Enable worker debug logging
LOG_LEVEL=debug npm run dev

# View worker logs
docker logs -f compose-worker-1
```

## 🚀 Deployment

### Development Deployment

```bash
# Build all services
docker compose -f compose/docker-compose.yml build

# Deploy to development
docker compose -f compose/docker-compose.yml up -d
```

### Production Deployment

```bash
# Use production compose file
docker compose -f docker-compose.prod.yml up -d

# Or use deployment script
./scripts/deploy.sh
```

## 📝 Code Style

### TypeScript Configuration

- Use strict TypeScript settings
- Enable all strict type checks
- Use ESLint and Prettier for formatting

### Naming Conventions

- **Files**: kebab-case (`order-service.ts`)
- **Classes**: PascalCase (`OrderService`)
- **Functions**: camelCase (`getOrderById`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)

### Import Organization

```typescript
// 1. Node modules
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// 2. Internal modules
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL status
docker compose logs postgres

# Verify connection string
echo $DATABASE_URL
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Docker Build Failed
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker compose build --no-cache
```

### Debug Commands

```bash
# Check service health
./scripts/health-check.sh

# View all logs
docker compose logs -f

# Access container shell
docker compose exec api sh
```

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Docker Documentation](https://docs.docker.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Pull Request Guidelines

- Include tests for new features
- Update documentation as needed
- Follow the existing code style
- Ensure all tests pass
- Add appropriate labels

## 📞 Support

For development support:

- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section
- Review the logs for error details

---

**Happy Coding! 🎉**