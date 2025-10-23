# Fulexo Platform – Agent Quickstart

This document is the single entry point for AI agents and operators to set up, run, verify, and troubleshoot the Fulexo platform locally with Docker. Canonical documentation lives under `memory-bank/*`.

Links:
- Memory Bank index: `memory-bank/`
- Environment reference: `memory-bank/environment.md`
- Docker workflows: `memory-bank/docker.md`
- Services matrix and health: `memory-bank/services.md`
- Auth and login: `memory-bank/api-auth.md`
- Troubleshooting: `memory-bank/troubleshooting.md`
- Runbooks: `memory-bank/runbooks.md`
- Local development notes (Windows/macOS/Linux): `memory-bank/local-development.md`

## Prerequisites
- Docker Desktop with Docker Compose
- Node.js 18+ (optional, for local dev outside Docker)
- 8+ GB RAM available

## One-shot: Start the full dev stack (HTTP only)
```bash
cd compose
docker-compose -f docker-compose.dev.yml up -d
```

Wait 20–30s, then apply DB migrations:
```bash
docker-compose exec api npx prisma migrate deploy
```

## Endpoints (Development)
- Web: http://localhost:3001
- API base: http://localhost:3000
- API Swagger docs: http://localhost:3000/docs
- API health: http://localhost:3000/health
- API metrics: http://localhost:3000/metrics
- MinIO console: http://localhost:9001 (minioadmin/minioadmin)
- Karrio API (optional): http://localhost:5002

## Login (seed credentials)
- Email: `admin@fulexo.com`
- Password: `demo123`

PowerShell example:
```powershell
(Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@fulexo.com","password":"demo123"}' -UseBasicParsing).Content
```

Curl example:
```bash
curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fulexo.com","password":"demo123"}'
```

## Minimal .env for local dev
Create `.env` at repo root (or use `compose/env-template`). Values below are dev-safe defaults.
```bash
NODE_ENV=development
DOMAIN_API=http://localhost:3000
DOMAIN_APP=http://localhost:3001

POSTGRES_DB=fulexo
POSTGRES_USER=fulexo_user
POSTGRES_PASSWORD=localdev123

REDIS_URL=redis://valkey:6379/0

JWT_SECRET=dev_jwt_secret_key_minimum_64_characters_for_local_development_only_change_this
ENCRYPTION_KEY=devkey1234567890123456789012dev!
MASTER_KEY_HEX=2c5e373def84c8229739b50511a6bba6e87db7755a2fb0b7bc8414880d55e65b

NEXT_PUBLIC_API_BASE=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3001
BACKEND_API_BASE=http://api:3000
SHARE_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3001
WEB_URL=http://localhost:3001

S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=fulexo-cache

KARRIO_API_URL=http://karrio-server:5002
KARRIO_ALLOWED_HOSTS=localhost,127.0.0.1,karrio-server
KARRIO_CORS_ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5001
FULEXO_TO_KARRIO_API_TOKEN=dev_token_fulexo_to_karrio
FULEXO_INTERNAL_API_TOKEN=dev_token_internal

GF_SECURITY_ADMIN_PASSWORD=admin
LOG_LEVEL=LOG
ADMIN_PASSWORD=demo123
CUSTOMER_PASSWORD=demo123
PORT=3000
WORKER_PORT=3002
```

Validation rules (see `memory-bank/environment.md` for full list):
- `JWT_SECRET` ≥ 64 chars
- `ENCRYPTION_KEY` exactly 32 chars
- `MASTER_KEY_HEX` 64 hex chars

## Health and smoke tests
```bash
# API
curl -f http://localhost:3000/health

# Web
curl -f http://localhost:3001/api/health

# Simple API smoke (Windows PowerShell)
powershell -ExecutionPolicy Bypass -File scripts/test-api-simple.ps1
```

## Common operations
```bash
# Logs
docker-compose -f compose/docker-compose.dev.yml logs -f api

# Stop stack
docker-compose -f compose/docker-compose.dev.yml down

# Nuke volumes (data loss!)
docker-compose -f compose/docker-compose.dev.yml down -v
```

## Troubleshooting highlights
- 404 on `/auth/login`: use `/api/auth/login` (global prefix `/api`)
- PowerShell header errors: prefer `Invoke-WebRequest` with `-ContentType` and JSON body
- Port in use: adjust port mappings or stop conflicting services
- Karrio optional: can be disabled if not needed on dev

For full troubleshooting, see `memory-bank/troubleshooting.md`.


