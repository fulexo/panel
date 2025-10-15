# Fulexo Platform

A comprehensive multi-tenant fulfillment platform that centralizes WooCommerce store management, warehouse operations, and parcel shipping through a unified control panel.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- 8GB+ RAM available

### 1. Clone & Setup
```bash
git clone <repository-url>
cd panel

# Use the developer-friendly configuration
cp .env.development.example .env
```

### 2. Start Development Environment
```bash
cd compose
docker-compose -f docker-compose.dev.yml up -d
```

### 3. Initialize Database
```bash
# Wait for services to start
sleep 30

# Run migrations
docker-compose exec api npx prisma migrate deploy
```

### 4. Access the Platform
- **Web Panel**: http://localhost:3001
- **API Documentation**: http://localhost:3000/api
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Karrio Dashboard**: http://localhost:5001

## 📚 Documentation

- **[Docker Setup Guide](DOCKER_SETUP.md)** - Comprehensive Docker configuration and troubleshooting
- **[Memory Bank](memory-bank/)** - Project documentation and context
- **[Scripts](scripts/README.md)** - Automation scripts for various tasks

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Worker        │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (BullMQ)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Redis/Valkey  │    │   MinIO (S3)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: NestJS 10, Prisma ORM, PostgreSQL 15
- **Cache/Queue**: Redis/Valkey, BullMQ
- **Storage**: MinIO (S3-compatible)
- **Shipping**: Karrio multi-carrier API
- **Deployment**: Docker, Docker Compose

## 🔧 Development

### Environment Files
- `.env.development.example` - Developer-friendly example with documentation
- `compose/env-template` - Complete template for all environments
- `.env` - Your local configuration (git ignored)

### Key Commands
```bash
# Start development stack
cd compose && docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f api
docker-compose logs -f web

# Run migrations
docker-compose exec api npx prisma migrate deploy

# Open Prisma Studio
docker-compose exec api npx prisma studio

# Stop services
docker-compose down
```

### Running Outside Docker
If you prefer running services locally:
```bash
# Start only infrastructure
cd compose
docker-compose -f docker-compose.dev.yml up -d postgres valkey minio karrio-db karrio-redis

# Terminal 1: API
cd apps/api
npm install
npm run start:dev

# Terminal 2: Frontend
cd apps/web
npm install
npm run dev

# Terminal 3: Worker
cd apps/worker
npm install
npm run start:dev
```

## 🚢 Production Deployment

### Prerequisites
1. Valid domain names with SSL certificates
2. Production environment variables configured
3. Secure passwords and secrets generated

### Deployment
```bash
# Use production compose file
cd compose
cp ../.env .env   # ensure compose/.env exists for production compose
docker-compose up -d

# Or use the alternative production file
docker-compose -f ../docker-compose.prod.yml up -d

# Run migrations
./scripts/migrate-prod.sh
```

### Environment Variables
Production requires proper values for:
- `NODE_ENV=production`
- `DOMAIN_API=https://api.yourdomain.com`
- `DOMAIN_APP=https://panel.yourdomain.com`
- Strong secrets for JWT_SECRET, ENCRYPTION_KEY, etc.

## 📊 Features

- **Multi-tenant Architecture**: Complete tenant isolation
- **WooCommerce Integration**: Real-time store synchronization
- **Inventory Management**: Stock tracking and alerts
- **Order Processing**: Complete lifecycle management
- **Shipping Integration**: Multi-carrier support via Karrio
- **Customer Portal**: Self-service capabilities
- **Reporting**: Comprehensive analytics dashboard

## 🔐 Security

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Field-level encryption for sensitive data
- Rate limiting and DDoS protection
- Comprehensive audit logging

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- Check [DOCKER_SETUP.md](DOCKER_SETUP.md) for troubleshooting
- Review [Memory Bank](memory-bank/) for project context
- Create an issue for bug reports or feature requests

---

**Current Status**: Production Ready ✅  
**Version**: 1.0.0  
**Last Updated**: December 2024