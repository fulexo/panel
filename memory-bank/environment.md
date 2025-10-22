# Environment Reference

Canonical list of environment variables used by the Fulexo platform. Defaults target local development. Production must override secrets and domains.

## Core
- `NODE_ENV` (required): `development` | `production`
- `DOMAIN_API` (required): Full URL to API, e.g. `http://localhost:3000` (dev) or `https://api.example.com` (prod)
- `DOMAIN_APP` (required): Full URL to web app, e.g. `http://localhost:3001`

## Database
- `POSTGRES_DB` (required)
- `POSTGRES_USER` (required)
- `POSTGRES_PASSWORD` (required)
- `DATABASE_URL` (derived in compose): `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`

## Cache / Queue
- `REDIS_URL` (required): `redis://valkey:6379/0`

## Security
- `JWT_SECRET` (required): minimum 64 characters
- `ENCRYPTION_KEY` (required): exactly 32 characters
- `MASTER_KEY_HEX` (required): 64 hex characters
- `SHARE_TOKEN_SECRET` (optional): 32+ characters for public share tokens

Validation rules are enforced at API startup. See `apps/api/src/config/env.validation`.

## Public/frontend
- `NEXT_PUBLIC_API_BASE` (required in web): e.g. `http://localhost:3000`
- `NEXT_PUBLIC_APP_URL` (required in web): e.g. `http://localhost:3001`
- `BACKEND_API_BASE` (web -> api inside Docker): usually `http://api:3000`
- `FRONTEND_URL`, `WEB_URL`, `SHARE_BASE_URL`: canonical app URLs used in links and emails

## Object Storage (MinIO)
- `S3_ENDPOINT`: `http://minio:9000`
- `S3_ACCESS_KEY`: dev default `minioadmin` (change in production)
- `S3_SECRET_KEY`: dev default `minioadmin` (change in production)
- `S3_BUCKET`: `fulexo-cache`

## Karrio Integration (optional on dev)
- `KARRIO_API_URL`: e.g. `http://karrio-server:5002`
- `KARRIO_SECRET_KEY` (prod)
- `KARRIO_ALLOWED_HOSTS`, `KARRIO_CORS_ALLOWED_ORIGINS`
- `FULEXO_TO_KARRIO_API_TOKEN`: internal token
- `FULEXO_INTERNAL_API_TOKEN`: internal token used by worker

## Monitoring (optional)
- `GF_SECURITY_ADMIN_PASSWORD`: Grafana admin password

## Ports
- `PORT` (api): default 3000
- `WORKER_PORT`: default 3002

## Dev example (.env)
See `AGENTS.md` for a ready-to-use development `.env` block.

## Mapping to services
- API (`apps/api`): reads security, DB, Redis, S3, domains, Karrio
- Web (`apps/web`): reads `NEXT_PUBLIC_*`, `BACKEND_API_BASE`, domain URLs
- Worker (`apps/worker`): reads DB, Redis, API/Karrio URLs, internal tokens
- Nginx: derives `API_HOST`/`APP_HOST` from `DOMAIN_API`/`DOMAIN_APP` in production

## Notes
- Always provide full protocol in `DOMAIN_*` (http:// or https://)
- Do not reuse dev defaults in production
- Keep `.env` at repo root; production compose uses `compose/.env` (copy root `.env` there)


