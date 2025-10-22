# Troubleshooting

## Login fails with 404 on /auth/login
- Use `/api/auth/login` (global prefix).
- Check API health: `curl -f http://localhost:3000/health`.

## PowerShell header errors (Invoke-WebRequest)
- Use `-ContentType "application/json"` and single-quoted JSON or escaped quotes.
- Example in `AGENTS.md`.

## Prisma migrations not applied
```bash
cd compose
docker-compose -f docker-compose.dev.yml up -d
# wait ~30s
docker-compose exec api npx prisma migrate deploy
```

## Port already in use
- Change published ports in compose or stop the conflicting service.
- Common: 3000/3001/3002, 5433, 6380, 9000/9001.

## Karrio server restart loop
- Karrio is optional on dev; comment out or ignore if not needed.

## MinIO not accessible
- Ensure ports 9000/9001 are exposed and not blocked by firewall.

## Bcrypt native module errors when running seed inside container
- Prefer logging in with `admin@fulexo.com / demo123`.
- If you must reseed, run Prisma Studio or create users via API.

## Web 404 or blank screen
- Verify `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_APP_URL` in `.env`.

## CORS errors
- Ensure `DOMAIN_API` and `DOMAIN_APP` include protocol and match the origins you use.
