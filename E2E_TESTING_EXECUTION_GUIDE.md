# E2E Testing Execution Guide

## Overview

This guide provides step-by-step instructions for executing comprehensive end-to-end testing of the Fulexo Panel platform.

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ installed
- ✅ npm installed
- ✅ Docker and Docker Compose installed
- ✅ Git installed
- ✅ At least 8GB RAM available
- ✅ At least 20GB disk space available

## Quick Start (Automated)

### Option 1: Using the Setup Script (Linux/Mac)

```bash
# Run the automated setup script
bash scripts/setup-e2e-testing.sh
```

This script will:
1. Check prerequisites
2. Generate secure environment variables
3. Create .env files
4. Install all dependencies
5. Generate Prisma client
6. Start Docker infrastructure
7. Run database migrations
8. Start all applications
9. Start monitoring stack
10. Perform health checks

### Option 2: Manual Setup (All Platforms)

Follow the steps below for manual setup and testing.

---

## Phase 1: Environment Setup

### Step 1.1: Create Environment File

Create a `.env` file in the project root:

```bash
# On Windows (PowerShell)
New-Item -Path .env -ItemType File

# On Linux/Mac
touch .env
```

Copy the content from `ENV_SETUP_GUIDE.md` into the `.env` file, or use this minimal configuration:

```env
NODE_ENV=development
PORT=3000
WORKER_PORT=3002

# Database
POSTGRES_DB=fulexo_dev
POSTGRES_USER=fulexo
POSTGRES_PASSWORD=fulexo_dev_password_2024
DATABASE_URL=postgresql://fulexo:fulexo_dev_password_2024@localhost:5433/fulexo_dev

# Redis
REDIS_URL=redis://localhost:6380

# Security (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=fulexo_jwt_secret_key_for_development_testing_2024_change_in_production_minimum_64_chars
ENCRYPTION_KEY=fulexo_encryption_key_32chars!
MASTER_KEY_HEX=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Domains
DOMAIN_API=localhost:3000
DOMAIN_APP=localhost:3001
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3001
WEB_URL=http://localhost:3001

# S3/MinIO
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=fulexo_minio_access_key
S3_SECRET_KEY=fulexo_minio_secret_key_2024
S3_BUCKET=fulexo-uploads

# Karrio
KARRIO_POSTGRES_DB=karrio
KARRIO_POSTGRES_USER=karrio
KARRIO_POSTGRES_PASSWORD=karrio_dev_password_2024
KARRIO_SECRET_KEY=karrio_secret_key_for_development_testing_2024
KARRIO_ALLOWED_HOSTS=localhost,127.0.0.1,karrio-server
KARRIO_CORS_ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5001
ADMIN_EMAIL=admin@fulexo.local
ADMIN_PASSWORD=FulexoAdmin2024!
FULEXO_TO_KARRIO_API_TOKEN=fulexo_to_karrio_token_2024
FULEXO_INTERNAL_API_TOKEN=fulexo_internal_token_2024

# Monitoring
GF_SECURITY_ADMIN_PASSWORD=fulexo_grafana_admin_2024
LOG_LEVEL=info

ENV_FILE=.env
COMPOSE_PROJECT_NAME=fulexo
```

### Step 1.2: Copy to Compose Directory

```bash
# Windows
copy .env compose\.env

# Linux/Mac
cp .env compose/.env
```

---

## Phase 2: Install Dependencies

### Step 2.1: Root Dependencies

```bash
npm install
```

### Step 2.2: API Dependencies

```bash
cd apps/api
npm install
cd ../..
```

### Step 2.3: Web Dependencies

```bash
cd apps/web
npm install
cd ../..
```

### Step 2.4: Worker Dependencies

```bash
cd apps/worker
npm install
cd ../..
```

---

## Phase 3: Database Setup

### Step 3.1: Generate Prisma Client

```bash
cd apps/api
npm run prisma:generate
cd ../..
```

### Step 3.2: Verify Prisma Schema

```bash
cd apps/api
npx prisma validate
cd ../..
```

---

## Phase 4: Start Docker Infrastructure

### Step 4.1: Start Core Services

```bash
cd compose
docker-compose up -d postgres valkey minio
```

Wait 30 seconds for services to initialize.

### Step 4.2: Verify Core Services

```bash
docker-compose ps
```

You should see:
- postgres (healthy)
- valkey (running)
- minio (running)

### Step 4.3: Start Karrio Services

```bash
docker-compose up -d karrio-db karrio-redis
```

Wait 20 seconds.

```bash
docker-compose up -d karrio-server karrio-dashboard
```

Wait 30 seconds for Karrio to initialize.

### Step 4.4: Verify Karrio

```bash
# Check if Karrio is responding
curl http://localhost:5002
```

---

## Phase 5: Database Migrations

### Step 5.1: Run Migrations

```bash
cd ../apps/api
npm run prisma:migrate:deploy
```

### Step 5.2: Seed Database (Optional)

```bash
npm run prisma:seed
```

If the seed script doesn't exist, that's okay - you can skip this step.

---

## Phase 6: Start Applications

### Step 6.1: Start Fulexo Services

```bash
cd ../../compose
docker-compose up -d api web worker
```

Wait 30 seconds for applications to start.

### Step 6.2: Check Application Logs

```bash
# Check API logs
docker-compose logs api

# Check Web logs
docker-compose logs web

# Check Worker logs
docker-compose logs worker
```

Look for any errors. The services should start successfully.

---

## Phase 7: Start Monitoring Stack

```bash
docker-compose up -d prometheus grafana loki promtail jaeger uptimekuma
```

---

## Phase 8: Health Checks

### Step 8.1: API Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### Step 8.2: Worker Health Check

```bash
curl http://localhost:3002/health
```

### Step 8.3: Web Application

Open in browser: http://localhost:3001

You should see the login page.

### Step 8.4: Karrio Dashboard

Open in browser: http://localhost:5001

### Step 8.5: MinIO Console

Open in browser: http://localhost:9001

Login with:
- Username: `fulexo_minio_access_key`
- Password: `fulexo_minio_secret_key_2024`

---

## Phase 9: Automated Testing

### Step 9.1: Run Health Check Tests

```bash
# On Linux/Mac
bash scripts/run-e2e-tests.sh

# On Windows (manually run curl commands)
curl http://localhost:3000/health
curl http://localhost:3002/health
curl http://localhost:3001
```

### Step 9.2: Run Unit Tests

```bash
# API tests
cd apps/api
npm test

# Web tests
cd ../web
npm test

# Worker tests
cd ../worker
npm test
```

### Step 9.3: Run E2E Tests

```bash
# From project root
npm run test:e2e
```

---

## Phase 10: Manual Testing

### Step 10.1: Test Authentication

1. Open http://localhost:3001/login
2. Try to login (should show validation)
3. Check API endpoint: `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test"}'`

### Step 10.2: Test API Endpoints

```bash
# Test protected endpoints (should return 401)
curl http://localhost:3000/api/tenants
curl http://localhost:3000/api/users
curl http://localhost:3000/api/orders
curl http://localhost:3000/api/products

# Test public endpoints
curl http://localhost:3000/api/docs
curl http://localhost:3000/.well-known/jwks.json
```

### Step 10.3: Test Frontend Pages

Visit each page and verify it loads:

- http://localhost:3001/ (Homepage)
- http://localhost:3001/login (Login)
- http://localhost:3001/dashboard (Should redirect to login)
- http://localhost:3001/orders (Should redirect to login)
- http://localhost:3001/products (Should redirect to login)
- http://localhost:3001/customers (Should redirect to login)
- http://localhost:3001/shipping (Should redirect to login)
- http://localhost:3001/inventory (Should redirect to login)
- http://localhost:3001/stores (Should redirect to login)
- http://localhost:3001/reports (Should redirect to login)
- http://localhost:3001/calendar (Should redirect to login)
- http://localhost:3001/settings (Should redirect to login)
- http://localhost:3001/support (Should redirect to login)

---

## Phase 11: Monitoring Verification

### Step 11.1: Grafana

1. Open http://localhost:3003
2. Login: admin / fulexo_grafana_admin_2024
3. Verify Prometheus data source
4. Check for metrics

### Step 11.2: Prometheus

1. Open http://localhost:9090
2. Query: `up`
3. Verify all services are up

### Step 11.3: Jaeger

1. Open http://localhost:16686
2. Check for traces (may be empty initially)

### Step 11.4: Uptime Kuma

1. Open http://localhost:3004
2. Set up monitors for services

---

## Phase 12: Log Analysis

### Step 12.1: Check for Errors

```bash
cd compose

# Check API logs for errors
docker-compose logs api | grep -i error

# Check Worker logs for errors
docker-compose logs worker | grep -i error

# Check Web logs for errors
docker-compose logs web | grep -i error

# Check Karrio logs for errors
docker-compose logs karrio-server | grep -i error
```

### Step 12.2: Monitor Real-time Logs

```bash
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f api
```

---

## Phase 13: Generate Test Report

### Step 13.1: Run Report Generator

```bash
# On Linux/Mac
bash scripts/generate-test-report.sh

# On Windows
# The report template is in the script, copy it manually
```

### Step 13.2: Review Report

The report will be saved as `E2E_TEST_REPORT_YYYYMMDD_HHMMSS.md`

---

## Troubleshooting

### Issue: Port Already in Use

```bash
# Find process using port
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Kill the process or change port in .env
```

### Issue: Docker Services Not Starting

```bash
# Check Docker is running
docker info

# Restart Docker Desktop (Windows/Mac)
# Or restart Docker service (Linux)
sudo systemctl restart docker

# Remove old containers and volumes
cd compose
docker-compose down -v
docker-compose up -d
```

### Issue: Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify DATABASE_URL in .env matches postgres service
```

### Issue: Prisma Migration Failed

```bash
# Reset database (WARNING: deletes all data)
cd apps/api
npx prisma migrate reset

# Or manually drop and recreate
npx prisma db push --force-reset
```

### Issue: API Returns 500 Errors

```bash
# Check API logs
cd compose
docker-compose logs api

# Verify environment variables
docker-compose exec api env | grep DATABASE_URL

# Restart API
docker-compose restart api
```

---

## Cleanup

### Stop All Services

```bash
cd compose
docker-compose down
```

### Stop and Remove Volumes

```bash
docker-compose down -v
```

### Remove All Docker Resources

```bash
docker-compose down -v --remove-orphans
docker system prune -a
```

---

## Next Steps

After successful setup and testing:

1. ✅ Review the generated test report
2. ✅ Fix any issues found
3. ✅ Configure WooCommerce test store
4. ✅ Add carrier credentials for shipping tests
5. ✅ Set up CI/CD pipeline
6. ✅ Prepare for production deployment

---

## Useful Commands Reference

```bash
# Docker Compose
docker-compose ps                    # List services
docker-compose logs -f [service]     # Follow logs
docker-compose restart [service]     # Restart service
docker-compose down                  # Stop all
docker-compose up -d                 # Start all

# Prisma
npm run prisma:studio               # Open Prisma Studio
npm run prisma:generate             # Generate client
npm run prisma:migrate:deploy       # Run migrations
npm run prisma:db:push              # Push schema

# Testing
npm test                            # Run unit tests
npm run test:e2e                    # Run E2E tests
npm run test:coverage               # Coverage report

# Development
npm run dev:all                     # Start all apps in dev mode
npm run build:all                   # Build all apps
npm run lint                        # Run linter
npm run type-check                  # TypeScript check
```

---

## Support

For issues or questions:

1. Check the logs: `docker-compose logs [service]`
2. Review documentation: `README.md`, `ARCHITECTURE.md`
3. Check troubleshooting guide: `TROUBLESHOOTING.md`
4. Review this guide: `E2E_TESTING_EXECUTION_GUIDE.md`

---

**Good luck with testing!** 🚀

