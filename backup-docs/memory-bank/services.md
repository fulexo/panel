# Services Matrix

| Service | Port(s) host->container | Purpose | Health |
|---|---|---|---|
| nginx | 80 (dev), 80/443 (prod) | Reverse proxy | N/A |
| postgres | 5433->5432 | Primary database | `pg_isready` |
| valkey | 6380->6379 | Redis-compatible cache/queue | `redis-cli ping` |
| minio | 9000,9001 | S3-compatible storage/console | `/minio/health/live` |
| api | 3000 | NestJS REST API | `/health`, `/metrics`, `/docs` |
| web | 3001->3000 | Next.js web app | `/api/health` |
| worker | 3002 | Background jobs | `/health`, `/metrics` |
| karrio-server | 5002 | Shipping API (optional) | service-specific |

## Dependencies
- API depends on Postgres, Valkey, MinIO
- Web depends on API
- Worker depends on Postgres, Valkey, API

## Environment mapping
See `memory-bank/environment.md` for variables per service.


