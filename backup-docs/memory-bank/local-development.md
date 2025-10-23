# Local Development Notes

## Windows (PowerShell)
- Use `Invoke-WebRequest` with `-ContentType "application/json"` for API calls.
- Example login:
```powershell
(Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@fulexo.com","password":"demo123"}' -UseBasicParsing).Content
```
- `curl` in PowerShell may proxy to `Invoke-WebRequest`, causing header issues. Prefer the example above.
- `head`/`sed` are not native; use PowerShell equivalents or run commands inside Linux containers.

## macOS / Linux
- Native `curl` works as usual.
- Use bash for scripts under `scripts/*.sh`.

## Running outside Docker (optional)
```bash
# Infra via Docker
cd compose && docker-compose -f docker-compose.dev.yml up -d postgres valkey minio karrio-db karrio-redis

# API
cd apps/api && npm install && npm run start:dev

# Web
cd apps/web && npm install && npm run dev

# Worker
cd apps/worker && npm install && npm run start:dev
```

## Ports
- API 3000, Web 3001, Worker 3002, Postgres 5433->5432, Valkey 6380->6379, MinIO 9000/9001, Karrio 5002


