# Fulexo Fulfillment Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Code Quality](https://img.shields.io/badge/Code%20Quality-Excellent-brightgreen)](./COMPREHENSIVE_REVIEW_SUMMARY.md)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen)](./COMPREHENSIVE_REVIEW_SUMMARY.md)
[![License](https://img.shields.io/badge/License-ISC-blue)](./LICENSE)
[![Project Status](https://img.shields.io/badge/Status-Production%20Ready-success)](./PROJECT_STATUS.md)

Fulexo is a multi-tenant fulfillment platform that centralises WooCommerce store management, warehouse operations, and parcel shipping. The monorepo contains a Next.js control panel, a NestJS API, a BullMQ worker, and the Karrio shipping gateway so carriers, rates, and labels are available directly inside the order flow.

## 🎯 Project Status

**✅ All Systems Operational** - Last verified: October 13, 2025

- ✅ TypeScript: 0 errors across all apps
- ✅ ESLint: 0 errors, 0 warnings
- ✅ Build: All packages compile successfully
- ✅ Tests: All quality checks passing
- ✅ Dependencies: All packages up to date

See [Comprehensive Review Summary](./COMPREHENSIVE_REVIEW_SUMMARY.md) for detailed code quality report and [Project Status](./PROJECT_STATUS.md) for current project health.

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

### Quick Start (Recommended)

1. **Install dependencies**
   ```bash
   npm install
   npm run install:all
   ```

2. **Prepare environment variables**
   ```bash
   # For development
   cp .env.example .env
   cp apps/web/.env.local.example apps/web/.env.local
   
   # Edit .env files with your configuration:
   # - Database credentials (PostgreSQL)
   # - JWT secrets (minimum 64 characters)
   # - Redis/Valkey connection
   # - MinIO/S3 credentials
   # - Karrio API tokens (optional for initial setup)
   ```

3. **Generate Prisma Client**
   ```bash
   cd apps/api
   npm run prisma:generate
   cd ../..
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

The workspace exposes comprehensive quality checks from the repository root:

```bash
# Code Quality Checks
npm run lint           # ESLint validation (all packages)
npm run lint:fix       # Auto-fix ESLint issues

# Type Checking
cd apps/api && npx tsc --noEmit    # API TypeScript check
cd apps/web && npx tsc --noEmit    # Web TypeScript check  
cd apps/worker && npx tsc --noEmit # Worker TypeScript check

# Testing
npm run test           # Jest unit tests
npm run test:coverage  # Jest with coverage report
npm run test:e2e       # Playwright end-to-end tests
npm run test:e2e:ui    # Playwright UI mode
npm run test:cypress   # Cypress UI tests
npm run test:all       # Run all tests
```

### Build Verification

```bash
# Verify all apps build successfully
npm run build:all

# Or build individually
cd apps/api && npm run build
cd apps/web && npm run build
cd apps/worker && npm run build
```

## Production operations

- `docker-compose.prod.yml` defines the production stack, including the API, web, worker, and the Karrio services.
- `scripts/deploy.sh` builds containers, performs health checks, and ensures the Karrio services are bootstrapped.
- `scripts/backup.sh`, `scripts/backup-restore.sh`, and `scripts/rollback.sh` help manage backups and recoveries.
- `scripts/health-check.sh`, `scripts/setup-security.sh`, and `scripts/setup-ssl.sh` assist with ongoing maintenance of production hosts.

## 📚 Documentation

### Quick Links
- **[📖 Documentation Index](DOCUMENTATION_INDEX.md)** – Complete documentation directory
- **[⚡ Quick Start Guide](QUICK_START.md)** – Get up and running in 15 minutes
- **[💻 Development Guide](DEVELOPMENT.md)** – Comprehensive developer documentation
- **[🚀 Deployment Guide](DEPLOYMENT.md)** – Production deployment instructions
- **[📡 API Documentation](API_DOCUMENTATION.md)** – Complete API reference

### Core Documentation
- **[COMPREHENSIVE_REVIEW_SUMMARY.md](COMPREHENSIVE_REVIEW_SUMMARY.md)** – Code quality report and error fixes (October 2025)
- **[CHANGELOG.md](CHANGELOG.md)** – Version history and changes
- **[ARCHITECTURE.md](ARCHITECTURE.md)** – System architecture and design
- **[SECURITY.md](SECURITY.md)** – Security policies and guidelines
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** – Problem diagnosis and solutions

### Integration & Operations
- **[KARRIO_INTEGRATION_BLUEPRINT.md](KARRIO_INTEGRATION_BLUEPRINT.md)** – Karrio shipping integration
- **[scripts/README.md](scripts/README.md)** – Operational scripts guide

### Development Guides
- **[docs/frontend-standards.md](docs/frontend-standards.md)** – Frontend coding standards
- **[docs/api-contract-notes.md](docs/api-contract-notes.md)** – API contracts
- **[docs/design-tokens.md](docs/design-tokens.md)** – Design system tokens

**See [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md) for complete documentation directory.**

## Community

Report issues or feature requests via [GitHub Issues](https://github.com/fulexo/panel/issues). Contributions and feedback that improve the Fulexo fulfilment experience are welcome.
