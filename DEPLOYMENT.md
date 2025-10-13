# Deployment Guide

**Last Updated:** October 13, 2025  
**Status:** ✅ Production Ready

This guide covers deployment of the Fulexo platform to production environments.

## 📋 Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Production Environment Setup](#production-environment-setup)
- [Deployment Process](#deployment-process)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Procedures](#rollback-procedures)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Pre-Deployment Checklist

### Code Quality Verification

Run all checks before deploying:

```bash
# 1. TypeScript validation
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
cd apps/worker && npx tsc --noEmit

# 2. ESLint validation
npm run lint

# 3. Run all tests
npm run test
npm run test:e2e

# 4. Build verification
npm run build:all
```

**Required:** All checks must pass ✅

### Environment Configuration

```bash
# 1. Create production environment file
cp .env.example .env.production

# 2. Update critical variables:
# - NODE_ENV=production
# - Strong JWT_SECRET (64+ chars)
# - Strong ENCRYPTION_KEY (32 chars)
# - Production database URL
# - Production Redis URL
# - Production domain names
# - S3/MinIO credentials
# - SMTP settings
# - Karrio API tokens
```

### Security Review

- [ ] All secrets are strong and unique
- [ ] JWT_SECRET is at least 64 characters
- [ ] Database credentials are secure
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled
- [ ] Security headers are configured
- [ ] SSL/TLS certificates are valid
- [ ] Firewall rules are configured

---

## Production Environment Setup

### Server Requirements

**Minimum Specifications:**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 50 GB SSD
- OS: Ubuntu 22.04 LTS or similar

**Recommended Specifications:**
- CPU: 8 cores
- RAM: 16 GB
- Disk: 100 GB SSD
- OS: Ubuntu 22.04 LTS

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
docker --version
docker compose version
node --version
npm --version
```

### Clone and Setup

```bash
# Clone repository
git clone https://github.com/fulexo/panel.git
cd panel

# Install dependencies
npm install
npm run install:all

# Generate Prisma client
cd apps/api
npm run prisma:generate
cd ../..
```

---

## Deployment Process

### Method 1: Docker Compose (Recommended)

```bash
# 1. Build images
docker compose -f docker-compose.prod.yml build

# 2. Start services
docker compose -f docker-compose.prod.yml up -d

# 3. Run database migrations
docker compose -f docker-compose.prod.yml exec api npm run prisma:migrate:deploy

# 4. Verify services
docker compose -f docker-compose.prod.yml ps
```

### Method 2: Manual Deployment

```bash
# 1. Build all applications
npm run build:all

# 2. Start PostgreSQL and Redis
# (via Docker or system services)

# 3. Run database migrations
cd apps/api
npm run prisma:migrate:deploy

# 4. Start services with PM2
npm install -g pm2

# Start API
cd apps/api
pm2 start dist/main.js --name fulexo-api

# Start Worker
cd apps/worker
pm2 start dist/index.js --name fulexo-worker

# Start Web (with Next.js production server)
cd apps/web
pm2 start npm --name fulexo-web -- start

# Save PM2 config
pm2 save
pm2 startup
```

### Method 3: Using Deployment Script

```bash
# Use the provided deployment script
./scripts/deploy.sh

# The script will:
# 1. Run all quality checks
# 2. Build Docker images
# 3. Run database migrations
# 4. Start services
# 5. Perform health checks
# 6. Configure monitoring
```

---

## Post-Deployment Verification

### Health Checks

```bash
# API Health
curl https://api.yourdomain.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-13T...",
  "uptime": 12345,
  "checks": {
    "database": true,
    "redis": true
  }
}

# Web Health
curl https://yourdomain.com/api/health

# Worker Health
curl http://worker:3002/health
```

### Functional Testing

```bash
# Test authentication
curl -X POST https://api.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your_password"}'

# Test API endpoints
curl https://api.yourdomain.com/api/stores \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Performance Verification

```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/

# Monitor metrics
curl https://api.yourdomain.com/metrics | grep http_request_duration
```

### Security Verification

```bash
# Check security headers
curl -I https://yourdomain.com/

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=...
# Content-Security-Policy: ...

# Verify SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

---

## Rollback Procedures

### Quick Rollback

```bash
# Using Docker Compose
docker compose -f docker-compose.prod.yml down
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml up -d

# Using deployment script
./scripts/rollback.sh
```

### Database Rollback

```bash
# Backup current state
./scripts/backup.sh

# Revert to previous migration
cd apps/api
npx prisma migrate resolve --rolled-back <migration-name>

# Restore from backup if needed
./scripts/backup-restore.sh backup-file.sql
```

---

## Monitoring and Maintenance

### Daily Checks

```bash
# Check all services are healthy
./scripts/health-check.sh

# Check disk space
df -h

# Check memory usage
free -m

# Check Docker container stats
docker stats --no-stream
```

### Weekly Maintenance

```bash
# 1. Backup database
./scripts/backup.sh

# 2. Clean old logs
docker compose logs --tail=1000 > logs-archive.txt
docker compose down && docker compose up -d

# 3. Check for updates
npm outdated
docker compose pull

# 4. Review metrics
# Access Grafana and review dashboards
```

### Monthly Maintenance

```bash
# 1. Update dependencies
npm update
npm run install:all

# 2. Run security audit
npm audit
npm audit fix

# 3. Review and rotate secrets
# Update JWT_SECRET and other critical secrets

# 4. Database optimization
docker compose exec postgres vacuumdb -U $POSTGRES_USER -d $POSTGRES_DB --analyze
```

---

## Scaling Considerations

### Horizontal Scaling

```bash
# Scale worker instances
docker compose -f docker-compose.prod.yml up -d --scale worker=3

# Scale API instances (requires load balancer)
docker compose -f docker-compose.prod.yml up -d --scale api=2
```

### Database Scaling

```bash
# Enable connection pooling
# Update DATABASE_URL with connection pooler
DATABASE_URL="postgresql://user:pass@pooler-host:6543/db?pgbouncer=true"

# Configure read replicas
# Update Prisma schema with read replica URLs
```

### Caching Strategy

```bash
# Configure Redis for caching
# Increase memory limit in docker-compose.prod.yml
# Implement cache warming for frequently accessed data
```

---

## Backup and Recovery

### Automated Backups

```bash
# Setup cron job for daily backups
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * /path/to/panel/scripts/backup.sh
```

### Manual Backup

```bash
# Full backup
./scripts/backup.sh

# Database only
docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup-$(date +%Y%m%d).sql

# Files backup (MinIO)
docker compose exec minio mc mirror /data /backup/minio-$(date +%Y%m%d)
```

### Recovery

```bash
# Restore from backup
./scripts/backup-restore.sh backup-20251013.sql

# Verify restoration
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT COUNT(*) FROM \"User\";"
```

---

## SSL/TLS Configuration

### Using Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Verify: sudo certbot renew --dry-run
```

### Manual SSL Setup

```bash
# Generate self-signed certificate (development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# Configure Nginx with certificates
# See compose/nginx/nginx.conf for configuration
```

---

## Production Checklist

### Before Go-Live

- [ ] All tests passing
- [ ] All security headers configured
- [ ] SSL/TLS certificates installed
- [ ] Domain names configured
- [ ] Database backups configured
- [ ] Monitoring alerts configured
- [ ] Log aggregation configured
- [ ] Rate limiting tested
- [ ] Load testing completed
- [ ] Disaster recovery plan documented
- [ ] Team trained on operations
- [ ] Support channels established

### After Go-Live

- [ ] Monitor health dashboards
- [ ] Check error rates
- [ ] Verify backup jobs running
- [ ] Test emergency procedures
- [ ] Document any issues
- [ ] Update runbooks as needed

---

## Emergency Contacts

### Production Issues
- On-call engineer: [Configure your contact]
- DevOps team: [Configure your contact]
- Database admin: [Configure your contact]

### Service Status
- Status page: [Configure your status page]
- Incident management: [Configure your tool]

---

## Additional Resources

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
- [SECURITY.md](./SECURITY.md) - Security policies
- [scripts/README.md](./scripts/README.md) - Operational scripts

---

**For urgent issues, refer to [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**
