# Fulexo Docker Stack (Swarm) Quickstart

Note: Primary docs are in `memory-bank/docker.md`. Use `AGENTS.md` for standard dev/prod setup before Swarm.

## Files
- compose/docker-stack.yml: Swarm-ready stack file
- compose/.env: Environment variables (copy from project root .env)

## Prerequisites
- Docker Engine with Swarm mode: `docker swarm init`
- Valid DNS and certificates (for production TLS)

## Deploy
```bash
cd compose
cp ../.env .env
# Optional: adjust DOMAIN_API/DOMAIN_APP to your domains

# Deploy the stack
docker stack deploy -c docker-stack.yml fulexo

# Check services
docker stack services fulexo

# Remove stack
# docker stack rm fulexo
```

## Notes
- Nginx derives API_HOST/APP_HOST from DOMAIN_* full URLs at runtime.
- Internal service discovery uses service names: `api`, `web`, `postgres`, `valkey`, `minio`.
- For local dev, use `docker-compose -f docker-compose.dev.yml up -d`.
