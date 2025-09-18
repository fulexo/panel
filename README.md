# 🚀 Fulexo Platform - WooCommerce Multi-Tenant Fulfillment Management

## 📋 Overview

Fulexo is a comprehensive self-hosted platform for managing multiple WooCommerce stores with multi-tenant support, designed specifically for fulfillment companies. It provides centralized management of all customer stores from a single panel with real-time WooCommerce synchronization.

### 🎯 Key Features

- 🏪 **Multi-Store Management** - Manage all customer WooCommerce stores from one panel
- 🔐 **Role-Based Access Control** - Admin vs Customer permissions with approval system
- 🔄 **Real-time WooCommerce Sync** - Bidirectional synchronization of orders, products, customers, and inventory
- 📊 **Centralized Dashboard** - Overview of all stores and operations
- 📦 **Inventory Management** - Stock management with customer approval workflow
- ↩️ **Returns Management** - Handle product returns and customer notifications
- 🆘 **Support System** - Customer communication and ticket management
- 🛡️ **Security First** - JWT authentication, 2FA support, encrypted data storage
- 📈 **Monitoring** - Prometheus, Grafana, Loki integration
- 🎯 **Self-hosted** - Complete control over your infrastructure

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (Reverse Proxy)                │
│                    SSL/TLS, Rate Limiting, WAF               │
└─────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐       ┌────────▼────────┐      ┌────────▼────────┐
│   Next.js Web  │       │   NestJS API    │      │   BullMQ Worker │
│   (Frontend)   │       │    (Backend)    │      │     (Jobs)      │
└────────────────┘       └─────────────────┘      └─────────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
    ┌──────────────┬──────────────┼──────────────┬──────────────┐
    │              │              │              │              │
┌───▼────┐   ┌────▼────┐   ┌─────▼────┐   ┌────▼────┐   ┌─────▼────┐
│Postgres│   │ Valkey  │   │  MinIO   │   │Prometheus│   │  Loki    │
│  (DB)  │   │ (Cache) │   │(Storage) │   │(Metrics) │   │  (Logs)  │
└────────┘   └─────────┘   └──────────┘   └──────────┘   └──────────┘
```

## 🔐 User Roles & Permissions

### ADMIN (Fulexo Manager) - Full Access
- **Dashboard**: Overview of all stores and operations
- **Stores**: Manage all customer stores and WooCommerce connections
- **Orders**: Full order management across all stores
- **Products**: Full product management across all stores
- **Customers**: Full customer management across all stores
- **Inventory**: Full inventory management + approval system
- **Returns**: Full returns management across all stores
- **Support**: Full support ticket management

### CUSTOMER (Store Owner) - Limited Access
- **Dashboard**: Only their store overview
- **Stores**: No access
- **Orders**: View-only (their store only)
- **Products**: View-only (their store only)
- **Customers**: View-only (their store only)
- **Inventory**: Limited management with approval workflow
- **Returns**: View-only (their store only)
- **Support**: Manage only their own support tickets

## 📊 Panel Pages

### 1. 📊 Dashboard
- **Admin**: All stores overview, statistics, recent orders, low stock alerts
- **Customer**: Their store overview, statistics, recent orders, low stock alerts

### 2. 🏪 Stores (Admin Only)
- Store list and management
- WooCommerce connection management
- Customer-store mapping
- API key management
- Sync status monitoring

### 3. 📦 Orders
- **Admin**: Full order management across all stores
- **Customer**: View-only access to their store orders
- Integrated shipping management
- Order status updates
- Tracking number management

### 4. 📱 Products
- **Admin**: Full product management across all stores
- **Customer**: View-only access to their store products
- Stock management
- Price management
- Category management

### 5. 👥 Customers
- **Admin**: Full customer management across all stores
- **Customer**: View-only access to their store customers
- Customer details and history
- Order tracking

### 6. 📦 Inventory
- **Admin**: Full inventory management + approval system
- **Customer**: Limited inventory management with approval workflow
- Stock level monitoring
- Low stock alerts
- Approval system for customer changes

### 7. ↩️ Returns
- **Admin**: Full returns management across all stores
- **Customer**: View-only access to their store returns
- Return processing
- Customer notifications

### 8. 🆘 Support
- **Admin**: Full support ticket management
- **Customer**: Manage only their own support tickets
- Ticket system
- File sharing
- Communication history

## 🔄 WooCommerce Integration

### Supported Entities
- ✅ Orders, Products, Customers, Inventory
- ✅ Real-time synchronization via webhooks
- ✅ Bidirectional data sync
- ✅ Stock level updates
- ✅ Order status updates

### Sync Strategy
- Incremental synchronization (pull) + Webhook ingestion (push)
- Rate limit/backoff handling
- Checkpoint-based recovery & idempotent processing
- Real-time updates for critical operations

## 🚀 Quick Installation

### Prerequisites
- Docker Engine 24+ and Docker Compose v2
- Node.js 20+ (for development)
- PostgreSQL 16+ (via Docker)
- 4GB RAM minimum, 8GB recommended
- Ubuntu 22.04+ or similar Linux distribution

### 1. Clone Repository
```bash
git clone https://github.com/fulexo/panel.git
cd panel
```

### 2. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Update with your configuration
nano .env
```

### 3. Start Development Environment
```bash
# Start all services
docker compose -f compose/docker-compose.yml up -d

# Run database migrations
cd apps/api && npm run prisma:migrate
```

### 4. Access the Platform
- **Panel**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/docs

## 🔧 Development

### Project Structure
```
apps/
├── api/          # NestJS backend API
├── web/          # Next.js frontend
└── worker/       # Background job processor

compose/          # Docker configurations
scripts/          # Management scripts
```

### Available Scripts
```bash
# Development
npm run dev              # Start all services
npm run dev:api          # Start API only
npm run dev:web          # Start web only
npm run dev:worker       # Start worker only

# Database
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed database
npm run prisma:studio    # Open Prisma Studio

# Testing
npm run test             # Run all tests
npm run test:api         # Run API tests
npm run test:web         # Run web tests
npm run test:e2e         # Run E2E tests

# Production
npm run build            # Build all apps
npm run start            # Start production
```

## 🔒 Security Features

### Authentication & Authorization
- JWT tokens with RS256 in production
- Multi-factor authentication (TOTP)
- Role-based access control (RBAC)
- Session management with fingerprinting
- Account lockout after failed attempts

### Data Protection
- AES-256-GCM encryption for sensitive data
- bcrypt password hashing (cost factor 10)
- SQL injection prevention via Prisma
- XSS protection
- CSRF protection

### Network Security
- Rate limiting at multiple layers
- Security headers (HSTS, CSP, X-Frame-Options)
- HTTPS enforcement
- Firewall configuration

## 📊 Monitoring & Observability

### Metrics (Prometheus)
- API request rates and latencies
- Database connection pool stats
- Cache hit rates
- Sync lag metrics
- Business KPIs

### Logging (Loki + Promtail)
- Centralized log aggregation
- Structured logging
- Log retention policies
- Search and filtering

### Tracing (Jaeger)
- Distributed tracing
- Performance bottleneck identification
- Request flow visualization

## 🚢 Production Deployment

### 1. Server Setup
```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 2. Domain Configuration
```bash
# Update environment variables
nano .env

# Set your domains
DOMAIN_API=api.yourdomain.com
DOMAIN_APP=panel.yourdomain.com
NEXT_PUBLIC_API_BASE=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://panel.yourdomain.com
```

### 3. SSL Setup
```bash
# Install Certbot
snap install --classic certbot

# Generate certificates
certbot --nginx -d api.yourdomain.com -d panel.yourdomain.com
```

### 4. Start Production
```bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
cd apps/api && npm run prisma:migrate:deploy
```

## 🛠️ Management Commands

### Service Management
```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# Restart services
docker-compose -f docker-compose.prod.yml restart

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Backup Management
```bash
# Full backup
./scripts/backup.sh --full

# Database backup
./scripts/backup.sh --database

# Storage backup
./scripts/backup.sh --storage
```

### Health Checks
```bash
# Health check
./scripts/health-check.sh

# System monitoring
./scripts/monitor.sh

# Cache clearing
./scripts/clear-cache.sh --all
```

## 📚 API Documentation

The API documentation is automatically generated using Swagger/OpenAPI:

- **Development**: http://localhost:3001/docs
- **Production**: https://api.yourdomain.com/docs

### Main Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh token
- `POST /auth/2fa/enable` - Enable 2FA
- `GET /auth/me` - Current user info

#### Stores
- `GET /stores` - List stores
- `POST /stores` - Create store
- `GET /stores/:id` - Get store details
- `PUT /stores/:id` - Update store
- `DELETE /stores/:id` - Delete store
- `POST /stores/:id/sync` - Sync store data

#### Orders
- `GET /orders` - List orders
- `GET /orders/:id` - Get order details
- `PUT /orders/:id` - Update order
- `GET /orders/stats` - Order statistics

#### Products
- `GET /products` - List products
- `GET /products/:id` - Get product details
- `PUT /products/:id` - Update product
- `GET /products/stats` - Product statistics

#### Inventory
- `GET /inventory` - List inventory
- `PUT /inventory/:id` - Update inventory
- `GET /inventory/approvals` - List pending approvals
- `POST /inventory/approvals` - Create approval request
- `PUT /inventory/approvals/:id` - Approve/reject request

#### Support
- `GET /support/tickets` - List support tickets
- `POST /support/tickets` - Create support ticket
- `GET /support/tickets/:id` - Get ticket details
- `PUT /support/tickets/:id` - Update ticket

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL status
docker compose logs postgres

# Verify connection string
echo $DATABASE_URL
```

#### Rate Limit Exceeded
```bash
# Check Redis for rate limit status
docker compose exec valkey redis-cli
> KEYS rl:*
```

#### Authentication Issues
```bash
# Check JWT configuration
docker compose exec api node -e "console.log(process.env.JWT_SECRET)"

# View auth logs
docker compose logs api | grep auth
```

#### WooCommerce Sync Issues
```bash
# Check sync logs
docker compose logs worker | grep sync

# Test WooCommerce connection
curl -X POST http://localhost:3001/stores/test-connection
```

## 📞 Support

- **GitHub Issues**: https://github.com/fulexo/panel/issues
- **Documentation**: README.md
- **Security**: SECURITY.md
- **Troubleshooting**: TROUBLESHOOTING.md

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Version**: 1.0.0 | **Status**: Production Ready | **Last Updated**: 2024