# Docker Workflows

Single source of truth for running Fulexo with Docker.

## Files
- Development: `compose/docker-compose.dev.yml` (HTTP only)
- Production: `compose/docker-compose.yml` (HTTPS via Nginx + certs)
- Alt prod: `docker-compose.prod.yml`
- Swarm: `compose/docker-stack.yml` (optional)

## Dev workflow (HTTP)
```bash
cd compose
docker-compose -f docker-compose.dev.yml up -d
docker-compose exec api npx prisma migrate deploy
```

Services and ports (dev): see `memory-bank/services.md`.

## Prod workflow (HTTPS)
```bash
cd compose
cp ../.env .env
docker-compose up -d
./../scripts/migrate-prod.sh
```

Nginx derives hostnames from full URLs:
```bash
API_HOST=$(printf '%s' "$DOMAIN_API" | sed -E 's#^https?://##; s#/.*$##')
APP_HOST=$(printf '%s' "$DOMAIN_APP" | sed -E 's#^https?://##; s#/.*$##')
```

## Swarm (optional)
```bash
docker swarm init
cd compose && cp ../.env .env
docker stack deploy -c docker-stack.yml fulexo
```

## Common commands
```bash
# Logs
docker-compose -f compose/docker-compose.dev.yml logs -f api

# Stop
docker-compose -f compose/docker-compose.dev.yml down

# Remove volumes (data loss!)
docker-compose -f compose/docker-compose.dev.yml down -v
```

## Environment handling
- Root `.env` powers dev and build args
- Production compose reads `compose/.env` (copy your root `.env`)
- Validation occurs at API startup; see `memory-bank/environment.md`

## Notes
- Karrio services are optional in dev; you can disable them if not testing shipping flows
- PostgreSQL is mapped to host 5433 in dev to avoid conflicts


