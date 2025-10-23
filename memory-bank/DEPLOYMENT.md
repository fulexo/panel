# Fulexo Platform - Deployment Guide

**Version:** 1.0.0  
**Target:** DigitalOcean / Any Docker Host  
**Last Updated:** October 23, 2025

---

## Quick Start (TL;DR)

```bash
# 1. Generate secrets
./scripts/generate-secrets.sh

# 2. Update domains in .env
DOMAIN_API=https://api.fulexo.com
DOMAIN_APP=https://panel.fulexo.com

# 3. Get SSL certificates
certbot certonly --standalone -d api.fulexo.com
certbot certonly --standalone -d panel.fulexo.com

# 4. Deploy
cd compose
docker-compose up -d --build

# 5. Run migrations
docker-compose exec api npx prisma migrate deploy

# 6. Verify
curl https://api.fulexo.com/health
```

**Est. Time:** 90 minutes (including SSL)

---

## Pre-Deployment Checklist

### Server Requirements
- [x] Ubuntu 22.04 LTS (or similar)
- [x] 4 CPU cores minimum
- [x] 8 GB RAM minimum
- [x] 100 GB SSD storage
- [x] Docker 20+ installed
- [x] Docker Compose installed
- [x] Domain names pointed to server (A records)

### Network Requirements
- [x] Ports open: 80, 443 (public)
- [x] Outbound HTTPS allowed (WooCommerce, Karrio APIs)
- [x] SMTP port 587 or 465 open (email)

### Prerequisites Installed
```bash
# Verify Docker
docker --version  # Should be 20+

# Verify Docker Compose
docker-compose --version  # Should be 2.0+

# Verify Certbot
certbot --version  # For SSL certificates
```

---

## Environment Variables

### Critical Variables (MUST SET)

**Security (Generate with openssl):**
```bash
JWT_SECRET=$(openssl rand -base64 48)              # 64+ chars
ENCRYPTION_KEY=$(openssl rand -hex 16)             # Exactly 32 chars
MASTER_KEY_HEX=$(openssl rand -hex 32)             # 64 hex chars
SHARE_TOKEN_SECRET=$(openssl rand -base64 24)      # 32+ chars
POSTGRES_PASSWORD=$(openssl rand -base64 24)       # Strong password
KARRIO_SECRET_KEY=$(openssl rand -base64 32)       # Karrio key
S3_ACCESS_KEY=$(openssl rand -base64 16)           # MinIO access
S3_SECRET_KEY=$(openssl rand -base64 32)           # MinIO secret
GF_SECURITY_ADMIN_PASSWORD=$(openssl rand -base64 16)  # Grafana password
```

**Domains (Update to your domains):**
```bash
DOMAIN_API=https://api.fulexo.com
DOMAIN_APP=https://panel.fulexo.com
NEXT_PUBLIC_API_BASE=https://api.fulexo.com
NEXT_PUBLIC_APP_URL=https://panel.fulexo.com
FRONTEND_URL=https://panel.fulexo.com
WEB_URL=https://panel.fulexo.com
SHARE_BASE_URL=https://panel.fulexo.com
BACKEND_API_BASE=http://api:3000  # Internal Docker network
```

**Database:**
```bash
POSTGRES_DB=fulexo
POSTGRES_USER=fulexo_user
POSTGRES_PASSWORD=<generated-above>
DATABASE_URL=postgresql://fulexo_user:<password>@postgres:5432/fulexo?schema=public
```

**Redis:**
```bash
REDIS_URL=redis://valkey:6379/0
```

**Storage (MinIO):**
```bash
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=<generated-above>
S3_SECRET_KEY=<generated-above>
S3_BUCKET=fulexo-cache
S3_REGION=us-east-1
```

**Karrio:**
```bash
KARRIO_API_URL=http://karrio-server:5002
KARRIO_SECRET_KEY=<generated-above>
KARRIO_ALLOWED_HOSTS=localhost,127.0.0.1,karrio-server
KARRIO_CORS_ALLOWED_ORIGINS=https://panel.fulexo.com
```

**Mode:**
```bash
NODE_ENV=production
LOG_LEVEL=info  # or: debug, warn, error
```

### Full Environment Template

See `compose/.env` for complete template with all variables.

---

## SSL Certificate Setup

### Let's Encrypt (Recommended)

**1. Stop any services on ports 80/443:**
```bash
sudo systemctl stop nginx  # If running
docker-compose down        # If running
```

**2. Get certificates:**
```bash
# API domain
sudo certbot certonly --standalone -d api.fulexo.com

# Panel domain
sudo certbot certonly --standalone -d panel.fulexo.com

# Optional: Karrio domains
sudo certbot certonly --standalone -d karrio.fulexo.com
sudo certbot certonly --standalone -d dashboard.karrio.fulexo.com
```

**3. Verify certificates:**
```bash
sudo ls -la /etc/letsencrypt/live/api.fulexo.com/
# Should see: cert.pem, chain.pem, fullchain.pem, privkey.pem
```

**4. Setup auto-renewal:**
```bash
sudo certbot renew --dry-run  # Test renewal
sudo systemctl enable certbot-renew.timer  # Enable auto-renewal
```

### Custom Certificates

If using custom SSL certificates, place them at:
```bash
/etc/letsencrypt/live/api.fulexo.com/fullchain.pem
/etc/letsencrypt/live/api.fulexo.com/privkey.pem
/etc/letsencrypt/live/panel.fulexo.com/fullchain.pem
/etc/letsencrypt/live/panel.fulexo.com/privkey.pem
```

---

## Deployment Steps

### 1. Server Preparation (10 min)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install docker-compose-plugin -y

# Install Certbot
sudo apt-get install certbot -y

# Verify installations
docker --version
docker-compose --version
certbot --version
```

### 2. Clone Repository (2 min)

```bash
# Clone repo
git clone https://github.com/your-org/fulexo-panel.git
cd fulexo-panel

# Checkout production branch (if needed)
git checkout main  # or production
```

### 3. Configure Environment (10 min)

```bash
# Copy template
cp compose/.env.example compose/.env

# Generate secrets (saves to compose/.env)
./scripts/generate-secrets.sh

# Edit .env with your domains
nano compose/.env
# Update DOMAIN_API, DOMAIN_APP, and all NEXT_PUBLIC_* variables
```

**Critical: Verify these in .env:**
- `JWT_SECRET` is 64+ characters
- `ENCRYPTION_KEY` is exactly 32 characters (16 hex pairs)
- `MASTER_KEY_HEX` is exactly 64 hex characters
- All `DOMAIN_*` URLs use https://
- All `NEXT_PUBLIC_*` URLs are correct

### 4. Get SSL Certificates (15 min)

```bash
# See SSL Certificate Setup section above
sudo certbot certonly --standalone -d api.fulexo.com
sudo certbot certonly --standalone -d panel.fulexo.com
```

### 5. Build & Deploy (20 min)

```bash
cd compose

# Pull base images (faster builds)
docker-compose pull

# Build and start all services
docker-compose up -d --build

# Watch logs during startup
docker-compose logs -f api web

# Wait for all services to be healthy (30-60 seconds)
watch docker-compose ps  # Wait until all show "healthy"
```

### 6. Run Database Migrations (2 min)

```bash
# Run Prisma migrations
docker-compose exec api npx prisma migrate deploy

# Verify tables created
docker-compose exec postgres psql -U fulexo_user -d fulexo -c "\dt"
# Should see 25+ tables including Notification, Settings, User, etc.
```

### 7. Create Initial Admin User (Optional)

```bash
# If no seed data, create admin user
docker-compose exec api npm run seed

# Or manually via API:
curl -X POST https://api.fulexo.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fulexo.com",
    "password": "ChangeMeNow123!",
    "name": "Admin User"
  }'
```

### 8. Verification (10 min)

**Health Checks:**
```bash
# API Health
curl https://api.fulexo.com/health
# Expected: {"status":"ok","timestamp":"...","uptime":...}

# Web Health
curl https://panel.fulexo.com
# Expected: HTML response

# API Docs
curl https://api.fulexo.com/docs
# Expected: Swagger UI HTML

# Metrics
curl https://api.fulexo.com/metrics
# Expected: Prometheus metrics
```

**Service Status:**
```bash
docker-compose ps
# All services should show "healthy" or "running"
```

**Login Test:**
```bash
# Test login
curl -X POST https://api.fulexo.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fulexo.com","password":"demo123"}'

# Expected: {"accessToken":"...","refreshToken":"...","user":{...}}
```

**Browser Test:**
1. Open https://panel.fulexo.com
2. Login with admin@fulexo.com / demo123
3. Verify dashboard loads
4. Check all menu items accessible

---

## Post-Deployment Configuration

### 1. Configure Email/SMTP (10 min)

**Via Settings UI (Recommended):**
```
1. Login to panel: https://panel.fulexo.com
2. Navigate to: /settings
3. Click "Email" tab
4. Fill in SMTP details:
   - Host: smtp.gmail.com
   - Port: 587
   - User: yourapp@gmail.com
   - Password: [app password from Google]
   - Security: TLS/SSL (ON)
   - From: noreply@fulexo.com
5. Click "Test Connection" → Should show success
6. Click "Save Email Settings"
```

**Gmail App Password Setup:**
```
1. Google Account → Security
2. Enable 2-Step Verification
3. App Passwords → Generate
4. Select "Mail" → "Other (Fulexo)"
5. Copy 16-character password
6. Use in Settings page
```

### 2. Add First WooCommerce Store (10 min)

```
1. Navigate to: /stores
2. Click "Add Store"
3. Fill form:
   - Name: My Shop
   - URL: https://myshop.com
   - Consumer Key: ck_xxxxx (from WooCommerce)
   - Consumer Secret: cs_xxxxx (from WooCommerce)
4. Click "Create Store"
5. Wait for connection test (automatic)
6. Sync starts automatically (30-60 seconds)
7. Go to /products → See synced products
```

**Get WooCommerce API Keys:**
```
WooCommerce Admin Panel:
1. WooCommerce → Settings → Advanced → REST API
2. Click "Add Key"
3. Description: "Fulexo Integration"
4. User: (Admin user)
5. Permissions: Read/Write
6. Generate API Key
7. Copy Consumer Key and Consumer Secret
```

### 3. Create Test Customer (5 min)

```
1. Navigate to: /customers
2. Click "Add Customer"
3. Fill form:
   - Email: test@example.com
   - First Name: Test
   - Last Name: User
   - Password: Test123!
   - Role: CUSTOMER
   - Stores: [Select your store]
   - Active: Yes
4. Click "Create Customer"
5. Welcome email sent (if SMTP configured)
```

---

## Monitoring Setup

### Access Monitoring Services

```
Grafana:     https://panel.fulexo.com:3003
  Username: admin
  Password: <GF_SECURITY_ADMIN_PASSWORD from .env>

Prometheus:  http://localhost:9090 (internal only)
Jaeger:      http://localhost:16686 (internal only)
Uptime Kuma: https://panel.fulexo.com:3004
MinIO Console: http://localhost:9001
  Username: <S3_ACCESS_KEY>
  Password: <S3_SECRET_KEY>
```

### Setup Grafana Dashboards

```
1. Login to Grafana
2. Add Data Sources:
   - Prometheus: http://prometheus:9090
   - Loki: http://loki:3100
3. Import Dashboards:
   - Node Exporter (ID: 1860)
   - Docker Container (ID: 193)
   - Custom Fulexo API Dashboard (create)
```

### Setup Alerts

**Prometheus Alert Rules:**
```yaml
# Example: High API Error Rate
- alert: HighAPIErrorRate
  expr: rate(api_errors_total[5m]) > 0.05
  for: 5m
  annotations:
    summary: "High API error rate detected"
```

---

## Maintenance Operations

### Update Application

```bash
cd fulexo-panel

# Pull latest code
git pull origin main

# Rebuild and restart
cd compose
docker-compose up -d --build

# Run any new migrations
docker-compose exec api npx prisma migrate deploy

# Verify
curl https://api.fulexo.com/health
```

### Backup Database

```bash
# Backup to file
docker-compose exec postgres pg_dump -U fulexo_user fulexo > backup_$(date +%Y%m%d).sql

# Verify backup
ls -lh backup_*.sql

# Store safely (off-server)
scp backup_*.sql backup-server:/backups/fulexo/
```

### Restore Database

```bash
# Restore from backup
docker-compose exec -T postgres psql -U fulexo_user fulexo < backup_20251023.sql

# Verify
docker-compose exec postgres psql -U fulexo_user -d fulexo -c "SELECT COUNT(*) FROM \"User\";"
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f worker

# Last 100 lines
docker-compose logs --tail=100 api

# With timestamps
docker-compose logs -f --timestamps api
```

### Restart Service

```bash
# Restart single service
docker-compose restart api

# Restart all
docker-compose restart

# Full rebuild
docker-compose down
docker-compose up -d --build
```

### Scale Workers

```bash
# Scale worker to 3 instances
docker-compose up -d --scale worker=3

# Verify
docker-compose ps worker
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs service-name

# Check environment
docker-compose exec service-name env | grep -i error

# Verify ports not in use
sudo netstat -tlnp | grep -E ':(80|443|3000|3001|5432|6379)'

# Restart with fresh build
docker-compose down
docker-compose build --no-cache service-name
docker-compose up -d
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres pg_isready -U fulexo_user

# Check DATABASE_URL format
docker-compose exec api env | grep DATABASE_URL

# Verify password
docker-compose exec postgres psql -U fulexo_user -d fulexo -c "SELECT 1;"
```

### Email Not Sending

```bash
# Check SMTP settings in database
docker-compose exec postgres psql -U fulexo_user -d fulexo \
  -c "SELECT * FROM \"Settings\" WHERE category = 'email';"

# Test SMTP connection manually
docker-compose exec api node -e "
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: { user: 'user@gmail.com', pass: 'password' }
  });
  transport.verify().then(() => console.log('OK')).catch(console.error);
"

# Check logs
docker-compose logs api | grep -i email
```

### WooCommerce Sync Issues

```bash
# Check store connection
curl -X POST https://api.fulexo.com/api/stores/:storeId/test \
  -H "Authorization: Bearer <token>"

# Manual sync
curl -X POST https://api.fulexo.com/api/stores/:storeId/sync \
  -H "Authorization: Bearer <token>"

# Check worker logs
docker-compose logs worker | grep -i woo

# Check queue
docker-compose exec valkey redis-cli LLEN "bull:fx-jobs:wait"
```

---

## Performance Tuning

### Database Optimization

```sql
-- Check slow queries
docker-compose exec postgres psql -U fulexo_user -d fulexo \
  -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

-- Analyze tables
docker-compose exec postgres psql -U fulexo_user -d fulexo \
  -c "ANALYZE;"

-- Vacuum
docker-compose exec postgres psql -U fulexo_user -d fulexo \
  -c "VACUUM ANALYZE;"
```

### Cache Optimization

```bash
# Check Redis memory usage
docker-compose exec valkey redis-cli INFO memory

# Check cache hit rate
docker-compose exec valkey redis-cli INFO stats | grep keyspace

# Clear cache if needed
docker-compose exec valkey redis-cli FLUSHDB
```

### Resource Limits

Edit `docker-compose.yml` to adjust resources:
```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## Security Checklist

- [x] All secrets generated with strong randomness
- [x] HTTPS enforced (no HTTP access)
- [x] TLS 1.2/1.3 only
- [x] Strong cipher suites configured
- [x] Rate limiting enabled (15+ zones)
- [x] Security headers configured (15+)
- [x] Database passwords strong (24+ chars)
- [x] JWT secret 64+ characters
- [x] Encryption key exactly 32 characters
- [x] Master key 64 hex characters
- [x] PostgreSQL not exposed publicly (internal only)
- [x] Redis not exposed publicly (internal only)
- [x] MinIO not exposed publicly (except console on 9001)
- [x] Regular backups configured
- [x] Monitoring and alerting active
- [x] Logs retained and monitored

---

## Rollback Procedure

```bash
# 1. Stop current deployment
docker-compose down

# 2. Restore database backup
docker-compose up -d postgres
docker-compose exec -T postgres psql -U fulexo_user fulexo < backup_previous.sql

# 3. Checkout previous version
git checkout <previous-commit-hash>

# 4. Rebuild and start
docker-compose up -d --build

# 5. Verify
curl https://api.fulexo.com/health
```

---

## Production Checklist

- [x] All environment variables configured
- [x] SSL certificates installed and valid
- [x] Database migrations applied
- [x] Email SMTP configured and tested
- [x] First store connected and synced
- [x] Test customer created
- [x] Monitoring dashboards configured
- [x] Alerts configured
- [x] Backup procedure tested
- [x] Rollback procedure tested
- [x] Documentation reviewed
- [x] Team trained on operations

---

**Document Owner:** DevOps Team  
**Review Frequency:** After each deployment  
**Emergency Contact:** DevOps on-call
