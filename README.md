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

- Docker Engine 24+ and Docker Compose v2
- Node.js 20+ (for development)
- PostgreSQL 16+ (via Docker)
- 4GB RAM minimum, 8GB recommended
- Ubuntu 22.04+ or similar Linux distribution

## 🚀 Quick Installation (Production)

### 1. Sunucuya Bağlanın
```bash
ssh root@your-server-ip
```

### 2. Repository'yi Klonlayın
```bash
git clone https://github.com/fulexo/panel.git /opt/fulexo
cd /opt/fulexo
```

### 3. Hızlı Kurulum Script'ini Çalıştırın
```bash
chmod +x scripts/quick-install.sh
./scripts/quick-install.sh
```

Script otomatik olarak:
- Domain bilgilerini sorar
- SSL sertifikalarını kurar
- Veritabanını yapılandırır
- Admin kullanıcısını oluşturur

### 4. Kurulum Tamamlandı! 🎉
- **Panel**: `https://your-domain.com`
- **API**: `https://api.your-domain.com`
- **API Docs**: `https://api.your-domain.com/docs`

## 🔑 Default Credentials

After running the installation script, you can login with the credentials you provided during setup. The script will create an admin user with your specified email and password.

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
└── scripts/          # Installation and management scripts
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
- Production: https://your-api-domain.com/docs

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
sudo certbot --nginx -d your-api-domain.com -d your-panel-domain.com
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

- [Scripts Documentation](scripts/README.md)
- [Docker Compose Configuration](compose/docker-compose.yml)

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
**Status**: Production Ready