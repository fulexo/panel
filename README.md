# Fulexo Platform - WooCommerce Multi-Tenant Commerce Platform

## 🚀 Overview

Fulexo is a comprehensive self-hosted platform for managing multiple WooCommerce stores with multi-tenant support, advanced security features, and synchronization capabilities.

### Key Features
- 🔐 **Multi-tenant Architecture** - Isolated data per tenant with Row Level Security
- 🔑 **Advanced Authentication** - JWT tokens, 2FA support, session management
- 📊 **Sync** - Automated WooCommerce data synchronization (jobs + webhooks)
- 🛡️ **Security First** - AES-256-GCM encryption, rate limiting, audit logging
- 📈 **Monitoring** - Prometheus, Grafana, Loki, Jaeger integration
- 🎯 **RBAC** - Role-based access control with 4 permission levels
- 📦 **Self-hosted** - Complete control over your infrastructure

## 📋 Prerequisites

- Docker Engine 26+ and Docker Compose v2
- Node.js 20+ (for development)
- PostgreSQL 16+ (via Docker)
- 4GB RAM minimum, 8GB recommended
- Ubuntu 22.04+ or similar Linux distribution

## 🛠️ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/fulexo.git
cd fulexo
```

### 2. Environment Setup
```bash
# Copy the environment template file
cp compose/env-template compose/.env

# Edit the .env file with your settings
nano compose/.env

# Update the following required values:
# - DOMAIN_API and DOMAIN_APP with your actual domains
# - All password fields with secure passwords
# - JWT_SECRET with a 64+ character random string
# - ENCRYPTION_KEY with a 32 character random string
```

### 3. Database Setup
```bash
# Navigate to API directory
cd apps/api

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with initial data
npm run prisma:seed
```

### 4. Start Services
```bash
# Navigate to compose directory
cd ../../compose

# Start all services
docker compose up -d

# Check service status
docker compose ps
```

### 5. Access the Platform

- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs
- **Web UI**: http://localhost:3001
- **Grafana**: http://localhost:3002 (admin/GrafanaAdmin2025!)
- **MinIO Console**: http://localhost:9001
- **Uptime Kuma**: http://localhost:3003

## 🔑 Default Credentials

After running the seed script, you can login with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | Admin123! |
| Staff | staff@example.com | Staff123! |
| Customer Admin | customer.admin@example.com | Customer123! |
| Customer | customer@example.com | Customer123! |

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

## 🔒 Security Features

### Encryption
- **Secrets**: AES-256-GCM envelope encryption
- **JWT**: RS256 in production, HS256 in development
- **Passwords**: bcrypt with cost factor 10
- **Sessions**: SHA256 hashed tokens

### Authentication & Authorization
- Multi-factor authentication (TOTP)
- Session management with fingerprinting
- Account lockout after failed attempts
- Role-based access control (RBAC)

### Network Security
- Rate limiting at multiple layers
- Security headers (HSTS, CSP, X-Frame-Options)
- SQL injection prevention via Prisma
- XSS protection

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

### Uptime Monitoring (Uptime Kuma)
- Service health checks
- SSL certificate monitoring
- Notification alerts

## 🔄 WooCommerce Integration

### Supported Entities
- ✅ Orders, Shipments, Returns, Invoices, Products, Customers

### Sync Strategy
- Incremental synchronization (pull) + Webhook ingestion (push)
- Rate limit/backoff handling
- Checkpoint-based recovery & idempotent processing

## 🎨 User Interface Features

### Admin Dashboard
- Real-time metrics
- System health monitoring
- User management
- Tenant configuration
- Audit log viewer

### Customer Portal
- Order tracking
- Shipment status
- Invoice downloads
- Product catalog
- Request submissions

## 🛠️ Development

### Project Structure
```
/workspace
├── apps/
│   ├── api/          # NestJS backend
│   ├── web/          # Next.js frontend
│   └── worker/       # Background job processor
├── compose/          # Docker Compose configuration
│   ├── nginx/        # Reverse proxy config
│   ├── prometheus/   # Metrics configuration
│   └── ...
├── docs/             # Documentation
└── plan/             # Architecture plans
```

### API Development
```bash
cd apps/api
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run prisma:studio # Open Prisma Studio
```

### Frontend Development
```bash
cd apps/web
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
```

## 📝 API Documentation

The API documentation is automatically generated using Swagger/OpenAPI and is available at:
- Development: http://localhost:3000/docs
- Production: https://api.example.com/docs

### Main Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh token
- `POST /auth/2fa/enable` - Enable 2FA
- `GET /auth/me` - Current user info

#### Orders
- `GET /orders` - List orders
- `GET /orders/:id` - Get order details
 
- `GET /orders/stats/summary` - Order statistics

#### Shipments
- `GET /shipments` - List shipments
- `GET /shipments/:id` - Get shipment details
- `GET /shipments/:id/label` - Download label
- `GET /shipments/:id/tracking` - Track shipment

## 🚢 Production Deployment

### SSL/TLS Setup
```bash
# Install Certbot
sudo snap install --classic certbot

# Generate certificates
sudo certbot --nginx -d api.example.com -d app.example.com
```

### Environment Variables
Ensure all production environment variables are set:
- Strong passwords for database and services
- Proper JWT secrets (256-bit minimum)
- Correct domain names
- Production NODE_ENV

### Backup Strategy
```bash
# Database backup
docker compose exec postgres pg_dump -U fulexo fulexo > backup_$(date +%F).sql

# MinIO backup
docker compose exec minio mc mirror /data /backup/minio
```

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

## 📚 Additional Resources

- [Architecture Documentation](docs/architecture.md)
- [Security Guidelines](plan/Security-Guidelines.md)
- [Performance Optimization](plan/Performance-Optimization.md)
- [Disaster Recovery Plan](plan/Disaster-Recovery-Plan.md)
- [API Blueprint](plan/Fulexo-Platform-Blueprint.md)

## 🤝 Contributing

Please read our contributing guidelines before submitting pull requests.

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Status**: Development Phase