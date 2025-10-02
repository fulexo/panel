# Troubleshooting Guide

Use this checklist to diagnose issues across the Fulexo stack. Commands default to the local `compose/docker-compose.yml` file; replace it with `docker-compose.prod.yml` when operating in production.

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
