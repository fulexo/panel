# Docker Setup Guide for Fulexo Platform

## 🚀 Quick Start (Development)

### Prerequisites
- Docker and Docker Compose installed
- Git
- At least 8GB RAM available for Docker

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd panel
```

### Step 2: Set Up Environment
```bash
# Copy the environment template
cp compose/env-template .env

# Edit .env to customize (optional for development)
# The template already includes development-friendly defaults
```

### Step 3: Start Development Stack
```bash
cd compose
docker-compose -f docker-compose.dev.yml up -d
```

This starts all services with HTTP only (no SSL certificates required).

### Step 4: Initialize Database
```bash
# Wait for services to start (about 30 seconds)
sleep 30

# Run database migrations
docker exec fulexo-api npx prisma migrate deploy
```

### Step 5: Access the Application
- **Web Panel**: http://localhost:3001
- **API**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Karrio Dashboard**: http://localhost:5001

## 🔧 Environment Configuration

### Key Variables Explained

| Variable | Development Default | Production Example | Description |
|----------|-------------------|-------------------|-------------|
| `NODE_ENV` | `development` | `production` | Environment mode |
| `DOMAIN_API` | `http://localhost:3000` | `https://api.fulexo.com` | API domain with protocol |
| `DOMAIN_APP` | `http://localhost:3001` | `https://panel.fulexo.com` | Web app domain with protocol |
| `JWT_SECRET` | 64-char random string | Strong unique secret | JWT signing key (min 64 chars) |
| `ENCRYPTION_KEY` | 32-char string | Strong 32-char key | Data encryption key (exactly 32 chars) |
| `KARRIO_SECRET_KEY` | `change-me...` | Strong unique secret | Karrio Django secret |

### Database Configuration
```bash
POSTGRES_DB=fulexo
POSTGRES_USER=fulexo_user
POSTGRES_PASSWORD=fulexo_secure_password_123
```

### S3/MinIO Configuration
```bash
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin  # Change in production
S3_SECRET_KEY=minioadmin  # Change in production
S3_BUCKET=fulexo-cache
```

## 🐳 Docker Compose Files

### Development Stack (`docker-compose.dev.yml`)
- HTTP only (no SSL required)
- Local-friendly configuration
- All services exposed on localhost
- Note: Hot reloading is disabled inside Docker; run outside Docker for HMR

### Production Stack (`docker-compose.yml`)
- HTTPS with Let's Encrypt
- Production optimizations
- Requires valid SSL certificates
- Full monitoring stack
 - Uses env_file from `compose/.env` (copy your root `.env` here)

### Test Stack (`docker-compose.test.yml`)
- For running tests
- Isolated test database
- No external dependencies

## 📦 Services Overview

| Service | Port | Description |
|---------|------|-------------|
| **nginx** | 80/443 | Reverse proxy |
| **postgres** | 5433 | Main database |
| **valkey** | 6380 | Redis-compatible cache |
| **minio** | 9000/9001 | S3-compatible storage |
| **api** | 3000 | NestJS backend API |
| **web** | 3001 | Next.js frontend |
| **worker** | 3002 | Background job processor |
| **karrio-server** | 5002 | Shipping API |
| **karrio-dashboard** | 5001 | Karrio admin panel |

## 🛠 Common Commands

### Start Services
```bash
# Development
cd compose && docker-compose -f docker-compose.dev.yml up -d

# Production (requires SSL certs)
cd compose && docker-compose up -d
```

### Stop Services
```bash
docker-compose down

# Remove volumes too (WARNING: deletes data)
docker-compose down -v
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
```

### Database Operations
```bash
# Run migrations
docker exec fulexo-api npx prisma migrate deploy

# Create new migration
docker exec fulexo-api npx prisma migrate dev --name your-migration-name

# Open Prisma Studio
docker exec fulexo-api npx prisma studio
```

### Rebuild Services
```bash
# Rebuild specific service
docker-compose build api
docker-compose up -d api

# Rebuild all
docker-compose build
docker-compose up -d
```

## ⚠️ Troubleshooting

### Issue: Environment validation failed
**Solution**: Ensure all required environment variables are set in `.env`. Check the validation requirements in `apps/api/src/config/shared-env.validation.ts`.

### Issue: Cannot connect to database
**Solution**: 
1. Ensure PostgreSQL container is running: `docker ps | grep postgres`
2. Check connection string in `.env`
3. Wait for database to be ready before running migrations

### Issue: CORS errors
**Solution**: Make sure `DOMAIN_API` and `DOMAIN_APP` include the full protocol (http:// or https://)

### Issue: Port already in use
**Solution**: Change the port mapping in docker-compose file or stop the conflicting service

### Issue: Nginx SSL certificate errors (production)
**Solution**: Ensure certs exist under `/etc/letsencrypt/live/<host>/...`. Nginx derives `API_HOST`/`APP_HOST` from full `DOMAIN_*` URLs, so set `DOMAIN_API`/`DOMAIN_APP` as full URLs. For local dev, use `docker-compose.dev.yml` (HTTP only).

### Issue: MinIO not accessible
**Solution**: Check if MinIO is running and ports 9000/9001 are not blocked

## 🚢 Production Deployment

### Prerequisites
1. Valid domain names pointing to your server
2. SSL certificates (or use Let's Encrypt)
3. Production environment variables configured

### Deployment Steps
1. Set up production `.env` file with real values at repo root
2. Copy env into compose directory:
   ```bash
   cd compose
   cp ../.env .env
   ```
3. Obtain SSL certificates (match your domains):
   ```bash
   # Required
   certbot certonly --standalone -d api.fulexo.com -d panel.fulexo.com

   # Optional (Karrio public endpoints)
   certbot certonly --standalone -d karrio.fulexo.com -d dashboard.karrio.fulexo.com

   # Optional (if exposing worker externally)
   # server_name is worker.<API_HOST> per template
   certbot certonly --standalone -d worker.api.fulexo.com
   ```
4. Start production stack:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```
5. Run migrations:
   ```bash
   ./scripts/migrate-prod.sh
   ```

### Swarm (Optional)
See `compose/README-stack.md` for Swarm deployment using `compose/docker-stack.yml`.

## 📊 Monitoring

### Available Endpoints (Development)
- Prometheus: http://localhost:9090 (if enabled)
- Grafana: http://localhost:3003 (if enabled)
- Jaeger: http://localhost:16686 (if enabled)

### Health Checks
- API Health: http://localhost:3000/health
- Web Health: http://localhost:3001/api/health
- Worker Health: http://localhost:3002/health

## 🔐 Security Notes

### Development vs Production
- Development uses default passwords - **NEVER use these in production**
- Production requires:
  - Strong unique JWT_SECRET (min 64 chars)
  - Exactly 32-char ENCRYPTION_KEY
  - Secure database passwords
  - Proper CORS configuration
  - SSL/TLS certificates

### Required Production Changes
1. Change all default passwords
2. Generate new secret keys
3. Use environment-specific `.env` files
4. Enable firewall rules
5. Set up backup procedures

## 📚 Additional Resources
- [Prisma Documentation](https://www.prisma.io/docs)
- [Docker Compose Documentation](https://docs.docker.com/compose)
- [NestJS Documentation](https://docs.nestjs.com)
- [Next.js Documentation](https://nextjs.org/docs)