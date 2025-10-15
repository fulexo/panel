# Docker Configuration Issues and Fixes

## Overview
This document tracks all Docker configuration issues discovered and their solutions to ensure stable builds and deployments.

## Critical Blockers (Fixed ✅)

### 1. Missing Monitoring Service
**Issue**: In `docker-compose.prod.yml`, nginx depends on a monitoring service that isn't defined.
**Fix**: Removed the monitoring dependency from nginx service.
**File**: `docker-compose.prod.yml`

### 2. API Health Probe URL Mismatch
**Issue**: API serves health check at `/health` but Compose probes `/api/health`.
**Fix**: Updated health check to use `/health` instead of `/api/health`.
**File**: `docker-compose.prod.yml`

### 3. Docker Builds Exclude Required Dev Tooling
**Issue**: Build scripts run `npm ci --only=production` but need devDependencies for TypeScript, Prisma.
**Fix**: Modified Dockerfiles to install all dependencies in builder stage, only production in final stage.
**Files**: `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/worker/Dockerfile`

### 4. Missing .env File in Local Compose
**Issue**: Services declare `env_file: ${ENV_FILE:-.env}` but no .env in compose/ directory.
**Fix**: Updated to reference parent directory `.env` file: `${ENV_FILE:-../.env}`.
**File**: `compose/docker-compose.yml`

### 5. Nginx Targets Wrong Web Port
**Issue**: Nginx points to `web:3001` but container listens on port 3000.
**Fix**: Changed upstream target to `web:3000`.
**File**: `compose/nginx/conf.d/app.conf.template`

## High Priority Issues (Fixed ✅)

### 6. Prisma Version Mismatch
**Issue**: @prisma/client at ^6.14.0 but prisma at ^6.15.0.
**Fix**: Aligned both to ^6.15.0.
**Files**: `apps/api/package.json`, `apps/worker/package.json`

### 7. React Version Inconsistency
**Issue**: react@18.3.x and react-dom@18.2.x need to match.
**Fix**: Aligned both to 18.2.x.
**File**: `apps/web/package.json`

### 8. TLS-Only Nginx Blocks Local Development
**Issue**: Nginx requires SSL certificates which don't exist locally.
**Fix**: Created separate development configs:
- `compose/nginx/conf.d/app.dev.conf` - HTTP-only config
- `compose/docker-compose.dev.yml` - Development compose file
**New Files Created**

### 9. Missing Environment Variables
**Issue**: MASTER_KEY_HEX, FRONTEND_URL, WEB_URL missing from .env.
**Fix**: Added missing variables with sensible defaults.
**File**: `.env`

### 10. Invalid Root Dependency Versions
**Issue**: Root package.json references non-existent versions (next@^15.5.5, react@^19.2.0).
**Fix**: Downgraded to match app versions (next@^14.2.32, react@^18.2.0).
**File**: `package.json`

## Medium Priority Issues

### 11. Production Defaults in .env Template
**Status**: Partially fixed - added development-friendly values
**Recommendation**: Use `docker-compose.dev.yml` for local development

### 12. Duplicate Environment Variables
**Status**: Fixed - removed duplicate SHARE_TOKEN_SECRET definition
**File**: `.env`

## Development Setup Instructions

### For Local Development (HTTP only):
```bash
cd compose
docker-compose -f docker-compose.dev.yml up -d
```

### For Production (HTTPS with certificates):
```bash
cd compose
docker-compose -f docker-compose.yml up -d
```

## Docker Build Process

### Builder Pattern
All Dockerfiles now use multi-stage builds:
1. **deps stage**: Install production dependencies only
2. **builder stage**: Install ALL dependencies (including dev) for building
3. **production stage**: Copy built artifacts and production dependencies only

This ensures:
- TypeScript compilation works (needs typescript package)
- Prisma generation works (needs prisma package)
- Final image is lean (no dev dependencies)

## Environment Configuration

### Required Environment Variables
```bash
# Database
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD

# Security
JWT_SECRET
ENCRYPTION_KEY
MASTER_KEY_HEX

# URLs
FRONTEND_URL
WEB_URL
SHARE_BASE_URL

# Integrations
FULEXO_TO_KARRIO_API_TOKEN
FULEXO_INTERNAL_API_TOKEN
```

### Development vs Production
- Development: Use `docker-compose.dev.yml` with HTTP
- Production: Use `docker-compose.yml` with HTTPS and real certificates

## Monitoring & Health Checks

### Health Check Endpoints
- API: `http://api:3000/health`
- Web: `http://web:3000/api/health`
- Worker: `http://worker:3002/health`

### Docker Health Check Configuration
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

## Best Practices

1. **Always use multi-stage builds** to separate build and runtime dependencies
2. **Reference correct ports** - containers expose on standard ports internally
3. **Use environment-specific compose files** for dev/staging/production
4. **Keep .env files** in sync between root and compose directories
5. **Test builds locally** before deploying to production

## Troubleshooting

### Build Failures
- Check if devDependencies are installed in builder stage
- Verify Prisma schema path is correct
- Ensure TypeScript config is present

### Runtime Failures
- Verify all required environment variables are set
- Check health endpoints are accessible
- Ensure database migrations have run
- Verify network connectivity between services

### Network Issues
- Use service names (not localhost) for inter-service communication
- Ensure all services are on the same Docker network
- Check firewall rules for exposed ports

---

**Last Updated**: December 2024
**Status**: All critical and high priority issues resolved
**Next Review**: Before production deployment