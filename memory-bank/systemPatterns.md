# System Patterns

## Architecture Overview

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Worker        │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (BullMQ)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   PostgreSQL    │    │   Redis/Valkey  │
│   (Reverse      │    │   (Database)    │    │   (Cache/Queue) │
│    Proxy)       │    └─────────────────┘    └─────────────────┘
└─────────────────┘              │
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   MinIO         │    │   Karrio        │
│   (File Storage)│    │   (Shipping)    │
└─────────────────┘    └─────────────────┘
```

### Multi-Tenant Architecture

#### Tenant Isolation Strategy
- **Database Level**: Tenant ID in all tables, row-level security
- **Application Level**: Tenant context in all operations
- **API Level**: Tenant validation on all endpoints
- **Frontend Level**: Tenant-aware routing and data fetching

#### Tenant Context Flow
```
Request → JWT Token → Tenant ID → Database Query → Tenant-Scoped Results
```

## Key Technical Decisions

### Backend Architecture

#### NestJS Framework Choice
- **Modular Structure**: Clear separation of concerns
- **Dependency Injection**: Testable and maintainable code
- **Decorators**: Clean API definitions
- **Guards & Interceptors**: Security and cross-cutting concerns

#### Database Design
- **PostgreSQL**: ACID compliance, JSON support, full-text search
- **Prisma ORM**: Type-safe database access, migrations
- **Multi-tenant Schema**: Tenant ID in all tables
- **Indexing Strategy**: Optimized for tenant-scoped queries

#### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **Refresh Tokens**: Secure token rotation
- **RBAC**: Role-based access control
- **Tenant Validation**: All operations scoped to tenant

### Frontend Architecture

#### Next.js 14 App Router
- **Server Components**: Better performance and SEO
- **Client Components**: Interactive features
- **Route Groups**: Organized file structure
- **Middleware**: Authentication and tenant routing

#### State Management
- **React Query**: Server state management
- **Zustand**: Client state management
- **Form State**: React Hook Form + Zod validation
- **Theme State**: Context-based theme management

#### Component Architecture
- **Design System**: Consistent UI components
- **Pattern Components**: Reusable layout patterns
- **Form Components**: Standardized form elements
- **Modal Components**: Consistent modal patterns

### Worker Architecture

#### BullMQ Job Processing
- **Queue-based**: Reliable job processing
- **Retry Logic**: Automatic retry on failure
- **Job Priorities**: Critical jobs processed first
- **Monitoring**: Job status and performance tracking

#### Background Jobs
- **WooCommerce Sync**: Product and order synchronization
- **Inventory Updates**: Real-time stock level updates
- **Shipping Tracking**: Automatic tracking updates
- **Email Notifications**: Automated email sending

## Design Patterns in Use

### Backend Patterns

#### Repository Pattern
```typescript
@Injectable()
export class OrderRepository {
  async findByTenant(tenantId: string, filters: OrderFilters) {
    return this.prisma.order.findMany({
      where: { tenantId, ...filters }
    });
  }
}
```

#### Service Layer Pattern
```typescript
@Injectable()
export class OrderService {
  constructor(private orderRepo: OrderRepository) {}
  
  async processOrder(tenantId: string, orderData: CreateOrderDto) {
    // Business logic here
    return this.orderRepo.create(tenantId, orderData);
  }
}
```

#### Guard Pattern
```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return this.validateTenant(request.user.tenantId);
  }
}
```

### Frontend Patterns

#### Custom Hook Pattern
```typescript
export function useOrders(tenantId: string, filters: OrderFilters) {
  return useQuery({
    queryKey: ['orders', tenantId, filters],
    queryFn: () => apiClient.orders.list(tenantId, filters)
  });
}
```

#### Compound Component Pattern
```typescript
export const FormLayout = {
  Root: FormLayoutRoot,
  Section: FormLayoutSection,
  Field: FormLayoutField,
  Actions: FormLayoutActions
};
```

#### Provider Pattern
```typescript
export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClient>
      <AuthProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AuthProvider>
    </QueryClient>
  );
}
```

## Component Relationships

### Frontend Component Hierarchy
```
App
├── Layout
│   ├── Header
│   ├── Sidebar
│   └── Main
├── Pages
│   ├── Dashboard
│   ├── Orders
│   ├── Products
│   └── Settings
└── Components
    ├── Patterns (SectionShell, MetricCard, StatusPill)
    ├── Forms (FormLayout, FormField, FormSelect)
    ├── UI (Button, Card, Dialog, Input)
    └── Modals (CreateOrderModal, ProductModal)
```

### Backend Module Structure
```
AppModule
├── AuthModule
├── TenantModule
├── UserModule
├── StoreModule
├── ProductModule
├── OrderModule
├── InventoryModule
├── ShippingModule
├── CustomerModule
├── ReportModule
└── SupportModule
```

## Critical Implementation Paths

### Authentication Flow
1. **Login Request** → Validate credentials
2. **Generate JWT** → Include tenant ID and user info
3. **Set Cookies** → Secure HTTP-only cookies
4. **API Requests** → Include JWT in Authorization header
5. **Token Validation** → Verify JWT and extract tenant context

### Data Synchronization Flow
1. **WooCommerce Webhook** → Receive store update
2. **Queue Job** → Add sync job to queue
3. **Worker Processing** → Process sync job
4. **Database Update** → Update tenant-scoped data
5. **Frontend Update** → Real-time UI updates via React Query

### Order Processing Flow
1. **Order Creation** → Create order in system
2. **Inventory Check** → Verify stock availability
3. **Payment Processing** → Handle payment (if applicable)
4. **Fulfillment** → Generate shipping label
5. **Tracking** → Update tracking information
6. **Completion** → Mark order as completed

### Error Handling Patterns

#### Backend Error Handling
```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json({
        statusCode: exception.getStatus(),
        message: exception.message,
        error: exception.name
      });
    }
  }
}
```

#### Frontend Error Handling
```typescript
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryFallback onReset={reset}>
          {children}
        </ErrorBoundaryFallback>
      )}
    </QueryErrorResetBoundary>
  );
}
```

## Performance Patterns

### Database Optimization
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Proper indexing and query patterns
- **Caching**: Redis caching for frequently accessed data
- **Pagination**: Efficient large dataset handling

### Frontend Optimization
- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Next.js Image component
- **Bundle Optimization**: Tree shaking and minification
- **Caching**: React Query caching strategies

### API Optimization
- **Rate Limiting**: Prevent API abuse
- **Response Compression**: Gzip compression
- **Caching Headers**: Proper cache control
- **Pagination**: Efficient data pagination

## Security Patterns
## Deployment & Templating Patterns

### Nginx Host Derivation for TLS
- Problem: `DOMAIN_API`/`DOMAIN_APP` are full URLs (needed for CORS and app config), but Nginx requires hostnames for `server_name` and certificate paths.
- Solution: Derive `API_HOST`/`APP_HOST` in the container entry command and template using `envsubst`.
- Outcome: Single source of truth for domains; robust TLS configuration with full-URL envs.

### Swarm Stack Strategy
- Use an overlay network `fulexo-network` for inter-service discovery.
- Pre-build and push images (CI preferred); `docker-stack.yml` references immutable tags.
- Keep secrets/tokens in `.env` or Swarm secrets (future enhancement).


### Authentication Security
- **JWT Security**: Secure token generation and validation
- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure session handling
- **2FA Support**: Optional two-factor authentication

### Authorization Security
- **RBAC**: Role-based access control
- **Tenant Isolation**: Strict tenant data separation
- **API Security**: Input validation and sanitization
- **CORS Configuration**: Proper cross-origin policies

### Data Security
- **Encryption**: Field-level encryption for sensitive data
- **Audit Logging**: Complete audit trail
- **Data Backup**: Regular automated backups
- **Security Headers**: Security-focused HTTP headers

---

**Last Updated**: December 2024  
**Focus**: Technical architecture and patterns  
**Next Review**: When major architectural changes occur

