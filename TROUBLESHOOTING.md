# Troubleshooting Guide

**Last Updated:** October 13, 2025  
**Current Status:** ✅ All Systems Operational

Use this checklist to diagnose issues across the Fulexo stack. Commands default to the local `compose/docker-compose.yml` file; replace it with `docker-compose.prod.yml` when operating in production.

## 🚨 Before You Start

1. Check [COMPREHENSIVE_REVIEW_SUMMARY.md](./COMPREHENSIVE_REVIEW_SUMMARY.md) for recent fixes
2. Verify all environment variables are set correctly
3. Ensure Docker services are running: `docker compose ps`
4. Check system resources (CPU, memory, disk space)

## Quick diagnostics

```bash
docker compose -f compose/docker-compose.yml ps         # Container status
docker compose -f compose/docker-compose.yml logs api   # API logs
docker compose -f compose/docker-compose.yml logs web   # Web logs
docker compose -f compose/docker-compose.yml logs worker
```

If containers are unhealthy, restart them individually:

```bash
docker compose -f compose/docker-compose.yml restart api
```

## Database issues

- Verify connectivity:
  ```bash
  docker compose -f compose/docker-compose.yml exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT 1;'
  ```
- Apply migrations if schema drift occurs:
  ```bash
  cd apps/api
  npm run prisma:migrate
  ```
- Reset the database in development (destructive):
  ```bash
  cd apps/api
  npx prisma migrate reset
  ```

## Redis/Valkey issues

- Check health and memory usage:
  ```bash
  docker compose -f compose/docker-compose.yml exec valkey redis-cli INFO memory
  docker compose -f compose/docker-compose.yml exec valkey redis-cli PING
  ```
- Flush development data (not for production):
  ```bash
  docker compose -f compose/docker-compose.yml exec valkey redis-cli FLUSHALL
  ```

## API problems

- Check health endpoint and configuration:
  ```bash
  curl http://localhost:3000/health
  docker compose -f compose/docker-compose.yml exec api env | grep -E 'DATABASE_URL|REDIS_URL|JWT'
  ```
- Clear compiled output and reinstall dependencies if builds fail:
  ```bash
  rm -rf apps/api/dist apps/api/node_modules
  npm run install:all
  ```

## Web UI issues

- Confirm Next.js is running and reachable:
  ```bash
  curl -I http://localhost:3001
  docker compose -f compose/docker-compose.yml exec web env | grep NEXT_PUBLIC_API_BASE
  ```
- Rebuild the front-end when caches become inconsistent:
  ```bash
  rm -rf apps/web/.next apps/web/node_modules
  npm run install:all
  ```

## Karrio integration

- Ensure the services are running:
  ```bash
  docker compose -f compose/docker-compose.yml ps karrio-server karrio-dashboard karrio-db karrio-redis
  docker compose -f compose/docker-compose.yml logs karrio-server
  ```
- Validate credentials and tokens:
  ```bash
  docker compose -f compose/docker-compose.yml exec api env | grep KARRIO
  ```
- Manually test the internal shipment tracking endpoint with the internal bearer token:
  ```bash
  curl -H "Authorization: Bearer $FULEXO_INTERNAL_API_TOKEN" \
       -H "x-tenant-id: <tenantId>" \
       http://localhost:3000/api/shipments/track/<carrier>/<trackingNo>
  ```

## Background jobs

- Inspect worker logs and queue status:
  ```bash
  docker compose -f compose/docker-compose.yml logs worker
  docker compose -f compose/docker-compose.yml exec valkey redis-cli LRANGE bull:fx-jobs:completed 0 10
  ```
- Ensure the worker can reach the API:
  ```bash
  docker compose -f compose/docker-compose.yml exec worker curl -I http://api:3000/health
  ```

## SSL and reverse proxy

- Test TLS certificates in production after running `scripts/setup-ssl.sh`:
  ```bash
  sudo certbot renew --dry-run
  openssl s_client -connect api.example.com:443 -servername api.example.com | openssl x509 -noout -dates
  ```
- Validate the rendered Nginx configuration:
  ```bash
  docker compose -f compose/docker-compose.yml exec nginx nginx -t
  ```

## Backups and recovery

- Trigger backups manually:
  ```bash
  sudo ./scripts/backup.sh --full
  ```
- Restore from an existing archive:
  ```bash
  sudo ./scripts/backup-restore.sh list
  sudo ./scripts/backup-restore.sh restore /path/to/backup
  ```

## When all else fails

1. Capture logs and metrics for later analysis.
2. Stop the stack, prune containers/images, and rebuild:
   ```bash
   docker compose -f compose/docker-compose.yml down -v --remove-orphans
   docker system prune -f
   docker compose -f compose/docker-compose.yml up -d --build
   ```
3. If the issue persists, file a detailed report in GitHub Issues with logs, reproduction steps, and environment details.

## Code Quality Issues

### TypeScript Errors

If you encounter TypeScript errors:

```bash
# Check for TypeScript errors in all apps
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
cd apps/worker && npx tsc --noEmit

# Regenerate Prisma client if database-related errors
cd apps/api
npm run prisma:generate

# Clean and reinstall if node_modules issues
rm -rf node_modules package-lock.json
npm install
```

### ESLint Errors

```bash
# Check for linting errors
npm run lint

# Auto-fix fixable errors
npm run lint:fix

# Check specific app
cd apps/web && npx eslint .
```

### Build Failures

```bash
# Clean build artifacts
rm -rf apps/*/dist apps/*/.next

# Rebuild all apps
npm run build:all

# Build individually for better error messages
cd apps/api && npm run build
cd apps/web && npm run build
cd apps/worker && npm run build
```

## Environment Variable Issues

### Missing or Invalid Environment Variables

```bash
# Verify environment variables are loaded
cd apps/api && node -e "require('dotenv').config(); console.log(process.env.DATABASE_URL)"

# Check for missing NEXT_PUBLIC variables
cd apps/web && grep NEXT_PUBLIC .env .env.local

# Use the provided templates
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local
```

### Common Environment Variable Errors

1. **Missing NEXT_PUBLIC_API_BASE**
   - Solution: Add to `apps/web/.env.local`: `NEXT_PUBLIC_API_BASE=http://localhost:3000/api`

2. **Invalid DATABASE_URL**
   - Solution: Check PostgreSQL connection string format
   - Example: `postgresql://user:password@localhost:5432/dbname`

3. **JWT_SECRET too short**
   - Solution: Use at least 64 characters
   - Generate: `openssl rand -base64 64`

## Dependency Issues

### Package Installation Failures

```bash
# Clear npm cache
npm cache clean --force

# Remove all node_modules
rm -rf node_modules apps/*/node_modules

# Reinstall from scratch
npm install
npm run install:all

# If still failing, check Node version
node --version  # Should be 20.x or higher
npm --version   # Should be 10.x or higher
```

### Prisma Client Issues

```bash
# Regenerate Prisma client
cd apps/api
npm run prisma:generate

# If migrations are out of sync
npm run prisma:migrate:dev

# Reset database (development only - DESTRUCTIVE)
npm run prisma:migrate:reset
```

## Performance Issues

### Slow API Response Times

```bash
# Check database query performance
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT * FROM pg_stat_activity;"

# Check Redis connection
docker compose exec valkey redis-cli --latency

# Monitor API metrics
curl http://localhost:3000/metrics | grep http_request_duration
```

### High Memory Usage

```bash
# Check container memory usage
docker stats

# Check Node.js heap usage
curl http://localhost:3000/health

# Restart services if needed
docker compose restart api web worker
```

## Network and Connectivity Issues

### CORS Errors

```bash
# Verify CORS configuration in API
docker compose exec api env | grep -E 'DOMAIN_APP|FRONTEND_URL|WEB_URL'

# Check allowed origins in main.ts
cat apps/api/src/main.ts | grep -A 20 "enableCors"
```

### API Not Reachable from Web

```bash
# Verify API is running
curl http://localhost:3000/health

# Check web can reach API
docker compose exec web wget -O- http://api:3000/health

# Verify environment variable
docker compose exec web env | grep NEXT_PUBLIC_API_BASE
```

## Authentication Issues

### JWT Token Errors

```bash
# Verify JWT_SECRET is set
docker compose exec api env | grep JWT_SECRET

# Check token expiration
# Tokens expire after configured time - users need to re-login

# Clear all sessions (development)
docker compose exec valkey redis-cli FLUSHALL
```

### 2FA Issues

```bash
# Disable 2FA for a user (via database)
docker compose exec postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c \
  "UPDATE \"User\" SET \"twofaEnabled\" = false WHERE email = 'user@example.com';"
```

## Monitoring and Logging

### Access Application Logs

```bash
# API logs
docker compose logs -f api

# Web logs
docker compose logs -f web

# Worker logs
docker compose logs -f worker

# All logs
docker compose logs -f
```

### Access Monitoring Tools

- **Grafana**: http://localhost:3001/grafana (admin/admin)
- **Prometheus**: http://localhost:9090
- **Loki**: Check Grafana data sources
- **Jaeger**: http://localhost:16686

## Emergency Procedures

### Complete Stack Reset (Development Only)

```bash
# WARNING: This will delete all data!

# Stop all services
docker compose down -v

# Clean all build artifacts
rm -rf apps/*/dist apps/*/.next apps/*/node_modules

# Reinstall dependencies
npm install
npm run install:all

# Regenerate Prisma client
cd apps/api && npm run prisma:generate

# Start fresh
docker compose up -d
cd apps/api && npm run prisma:migrate:dev
```

### Rollback to Last Working State

```bash
# If using git
git stash
git checkout <last-working-commit>

# Rebuild
npm run build:all

# Restart services
docker compose restart
```

## Getting Help

If issues persist:

1. Check [COMPREHENSIVE_REVIEW_SUMMARY.md](./COMPREHENSIVE_REVIEW_SUMMARY.md) for recent changes
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. Check [CHANGELOG.md](./CHANGELOG.md) for version-specific issues
4. Search existing GitHub issues
5. Create a new issue with:
   - Error messages
   - Steps to reproduce
   - Environment details (OS, Node version, Docker version)
   - Relevant logs

## Quick Reference

### Health Checks

```bash
# API Health
curl http://localhost:3000/health

# Worker Health  
curl http://localhost:3002/health

# Web Health
curl http://localhost:3001/api/health

# Database Health
docker compose exec postgres pg_isready

# Redis Health
docker compose exec valkey redis-cli PING
```

### Port Reference

| Service | Port | URL |
|---------|------|-----|
| API | 3000 | http://localhost:3000 |
| Web | 3001 | http://localhost:3001 |
| Worker | 3002 | http://localhost:3002 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis/Valkey | 6379 | localhost:6379 |
| MinIO | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| Grafana | 3000 | http://localhost:3001/grafana |
| Prometheus | 9090 | http://localhost:9090 |
| Karrio API | 5002 | http://localhost:5002 |
| Karrio Dashboard | 5001 | http://localhost:5001 |

