# Runbooks

## Start dev stack
```bash
cd compose
docker-compose -f docker-compose.dev.yml up -d
docker-compose exec api npx prisma migrate deploy
```

## Stop dev stack
```bash
docker-compose -f compose/docker-compose.dev.yml down
```

## View logs
```bash
docker-compose -f compose/docker-compose.dev.yml logs -f api
```

## Health checks
```bash
curl -f http://localhost:3000/health
curl -f http://localhost:3001/api/health
```

## Login smoke test (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-api-simple.ps1
```

## Reset database (development only, data loss!)
```bash
cd compose
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
# wait, then migrations
docker-compose exec api npx prisma migrate deploy
```

## Create user (alternatives)
- Use Prisma Studio: `docker-compose exec api npx prisma studio`
- Or call `POST /api/auth/register` (requires a valid `tenantId`)

## Clear httpOnly tokens (dev)
```bash
curl -s -X POST http://localhost:3000/api/auth/clear-tokens
```
