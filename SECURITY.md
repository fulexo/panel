# Security Guide

This document summarises the security controls that ship with the Fulexo platform and the steps required to operate the stack safely in production.

## Platform controls

- **Authentication** – The API issues signed JWT access tokens and refresh tokens. Optional TOTP two-factor authentication can be enabled through the `/auth/2fa` endpoints (implemented in `TwoFactorService`).
- **Authorisation** – Role- and tenant-aware guards protect controllers. Internal service calls use the `InternalAuthGuard` and require an `Authorization: Bearer <FULEXO_INTERNAL_API_TOKEN>` header, plus an `x-tenant-id` scope when acting on behalf of a tenant.
- **Data protection** – Secrets, encryption keys, and master keys are supplied via environment variables. `EncryptionService` helpers encrypt TOTP secrets and other sensitive payloads before they hit the database.
- **Rate limiting and monitoring** – NestJS throttler guards and the Prometheus metrics endpoint (`/metrics`) expose request statistics, failures, and latency histograms.

## Environment variables

Populate `.env` (or your secret manager) with the security-sensitive configuration documented in `.env.example`:

- `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `ENCRYPTION_KEY` and `MASTER_KEY_HEX`
- `FULEXO_INTERNAL_API_TOKEN` and `FULEXO_TO_KARRIO_API_TOKEN`
- SMTP credentials when outbound email is required for password resets or notifications
- S3/MinIO credentials for asset storage

Rotate secrets periodically and restrict read access to your environment files.

## Hardening production hosts

The `scripts` directory provides utilities that implement baseline hardening steps. Run them with elevated privileges on fresh hosts:

```bash
sudo ./scripts/setup-security.sh      # Installs UFW, fail2ban, unattended upgrades, and optional swap support
sudo ./scripts/setup-ssl.sh           # Generates self-signed TLS certificates for the panel and API domains
sudo ./scripts/setup-production.sh    # Registers a systemd unit that manages the docker compose stack
```

Additional recommendations:

- Disable SSH password authentication and use key-based access.
- Keep the host patched (`sudo apt update && sudo apt upgrade -y`).
- Enable automatic upgrades via `unattended-upgrades` (already configured by `setup-security.sh`).
- Limit sudo access to trusted operators.

## Operational monitoring

- Use `scripts/health-check.sh` to verify container status, database connectivity, and SSL validity.
- Prometheus, Grafana, Loki, and Alertmanager are available in the Compose stacks for metrics, dashboards, and alerting.
- To inspect logs or metrics manually:
  ```bash
  docker compose -f docker-compose.prod.yml logs api
  docker compose -f docker-compose.prod.yml logs worker
  docker compose -f docker-compose.prod.yml exec postgres psql -U $POSTGRES_USER -c 'SELECT 1;'
  curl -H "Authorization: Bearer <token>" https://api.example.com/metrics
  ```

## Incident response

1. **Contain** – Isolate the environment by stopping exposed services if a compromise is suspected:
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```
2. **Preserve evidence** – Archive logs before rotating or deleting them:
   ```bash
   mkdir -p /var/log/fulexo_incident
   docker compose -f docker-compose.prod.yml logs --no-color > /var/log/fulexo_incident/containers.log
   journalctl -u docker.service > /var/log/fulexo_incident/docker.log
   ```
3. **Restore from backup** – Use the provided tooling to recover quickly:
   ```bash
   sudo ./scripts/backup-restore.sh list
   sudo ./scripts/backup-restore.sh restore /path/to/backup
   ```
4. **Reset credentials** – Rotate JWT secrets, database passwords, MinIO keys, and the internal API token.
5. **Review access** – Audit user sessions, disable compromised accounts, and require 2FA enrolment for privileged operators.

## Best practices

- Enforce strong passwords and enable 2FA for administrative users.
- Run the production stack behind Nginx with TLS (templates under `nginx/`).
- Restrict database and Redis endpoints to internal networks.
- Regularly test backups by performing restores in a staging environment.
- Monitor Prometheus alerts and tune them to your traffic profile.

For additional guidance consult the operational scripts in `scripts/` and the troubleshooting procedures in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
