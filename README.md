# Fulexo Fulfillment Platform

Fulexo is a multi-tenant fulfillment platform that centralises WooCommerce store management, warehouse operations, and parcel shipping. The monorepo contains a Next.js control panel, a NestJS API, a BullMQ worker, and the Karrio shipping gateway so carriers, rates, and labels are available directly inside the order flow.

## Repository layout

- `apps/api` – NestJS API with Prisma, tenant isolation, WooCommerce sync jobs, and the Karrio integration layer.
- `apps/web` – Next.js 14 front-end that surfaces dashboards, store configuration, shipment tools, and customer workflows.
- `apps/worker` – BullMQ worker that processes background jobs such as WooCommerce webhooks and shipment tracking updates.
- `compose/` – Docker Compose definitions for local development, observability, and the co-located Karrio stack.
- `scripts/` – Operational scripts for deployments, backups, monitoring, and server hardening.
- `karrio/` – Karrio API and dashboard sources that are built into the local Docker stack.

## Core capabilities

- **Multi-tenant operations** – Tenants, users, and WooCommerce stores are isolated in the database and protected through tenant-aware guards across the API.
- **WooCommerce synchronisation** – Store imports, order syncing, and reconciliation utilities keep data aligned across the API, worker, and storefront.
- **Integrated shipping** – The order detail page launches the Create Shipment flow, surfaces Karrio rates, creates labels, and records carrier metadata for downstream fulfilment.
- **Observability and tooling** – Prometheus, Grafana, Loki, Jaeger, and Uptime Kuma ship in the default Docker stack for metrics, logging, and tracing.
- **Security features** – JWT authentication, optional TOTP-based two-factor, encryption helpers, and configurable rate limiting underpin the API.

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- Node.js 20+ and npm 10+
- Git and a Unix-like shell environment

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   npm run install:all
   ```
2. **Prepare environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with database credentials, JWT keys, S3/MinIO access, and Karrio tokens
   ```
3. **Start local services** – Launch the full stack (API, web, worker, databases, monitoring, and Karrio) with Docker Compose:
   ```bash
   docker compose -f compose/docker-compose.yml up -d
   ```
4. **Apply database migrations**
   ```bash
   cd apps/api
   npm run prisma:migrate
   cd ../..
   ```
5. **Run the applications in development mode**
   ```bash
   npm run dev:all
   ```
6. **Access the stack**
   - Panel (Next.js): http://localhost:3001 directly, or http://localhost via the bundled Nginx reverse proxy when `DOMAIN_APP` is set to `localhost`.
   - API (NestJS): served through Nginx at http://localhost/api by default (Swagger is proxied at http://localhost/api/docs). If you expose the container port (e.g. with the production compose file) it is available on http://localhost:3000 with Swagger at http://localhost:3000/docs.
   - Karrio dashboard: http://localhost:5001
   - Karrio API: http://localhost:5002

## Testing and quality

The workspace exposes Jest, Playwright, ESLint, and TypeScript checks from the repository root:

```bash
npm run lint           # Lint API, web, and worker packages
npm run type-check     # TypeScript project references
npm run test           # Jest unit tests
npm run test:e2e       # Playwright end-to-end tests
npm run test:cypress   # Cypress UI tests
```

## Production operations

- `docker-compose.prod.yml` defines the production stack, including the API, web, worker, and the Karrio services.
- `scripts/deploy.sh` builds containers, performs health checks, and ensures the Karrio services are bootstrapped.
- `scripts/backup.sh`, `scripts/backup-restore.sh`, and `scripts/rollback.sh` help manage backups and recoveries.
- `scripts/health-check.sh`, `scripts/setup-security.sh`, and `scripts/setup-ssl.sh` assist with ongoing maintenance of production hosts.

## Additional documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) – System architecture, component responsibilities, and integration flows.
- [SECURITY.md](SECURITY.md) – Security controls, configuration guidance, and incident handling references.
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) – Diagnostic commands and remediation steps for common issues.
- [KARRIO_INTEGRATION_BLUEPRINT.md](KARRIO_INTEGRATION_BLUEPRINT.md) – Detailed rollout plan for the Karrio integration.
- [scripts/README.md](scripts/README.md) – Operational script catalogue and usage notes.

## Community

Report issues or feature requests via [GitHub Issues](https://github.com/fulexo/panel/issues). Contributions and feedback that improve the Fulexo fulfilment experience are welcome.
