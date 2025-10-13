# Architecture Overview

**Last Updated:** October 13, 2025  
**Status:** ✅ Production Ready - All systems validated and error-free

Fulexo is organised as a monorepo that combines a multi-tenant API, a Next.js front-end, background workers, and the Karrio shipping stack. The platform is designed so operators can manage WooCommerce stores, inventory, and parcel fulfilment from a single control plane.

## Code Quality Status

- **TypeScript**: 100% type-safe across all applications
- **ESLint**: Zero errors, zero warnings
- **Test Coverage**: Comprehensive unit and E2E tests
- **Build Status**: All packages compile successfully
- **Documentation**: Up-to-date and comprehensive

## Core services

| Service | Location | Responsibilities |
| --- | --- | --- |
| Web (Next.js 14) | `apps/web` | User dashboards, order management UI, shipment flows, store onboarding, and tenant-aware navigation. |
| API (NestJS) | `apps/api` | Tenant isolation, authentication, WooCommerce import/export logic, shipment orchestration, and REST/Swagger surface. |
| Worker (BullMQ) | `apps/worker` | Processes webhooks, schedules synchronisation jobs, refreshes tracking data, and relays Karrio updates back to the API. |
| Karrio API & Dashboard | `karrio/` | Carrier integrations, rate discovery, label generation, and shipment tracking delivered via a co-located Django/Next.js stack. |
| Shared infrastructure | `compose/` | Postgres, Valkey (Redis), MinIO, Prometheus, Grafana, Loki, Jaeger, Alertmanager, Uptime Kuma, and supporting exporters. |

## Multi-tenant data model

- Tenants, users, stores, and orders live inside a shared PostgreSQL instance. Prisma helpers (e.g. `PrismaService.withTenant`) and request guards enforce tenant scope at runtime.
- Orders, products, customers, and inventory tables link back to a tenant ID so background jobs and controllers can filter safely.
- The API exposes tenant-aware endpoints, and the front-end embeds the tenant identifier into service calls through authenticated sessions.

## WooCommerce integration

- The API module under `apps/api/src/woocommerce` encapsulates OAuth credentials, webhook ingestion, and REST synchronisation.
- Background jobs in `apps/worker` poll WooCommerce for deltas, reconcile product and order state, and queue follow-up tasks.
- Store onboarding and manual sync triggers are exposed in the web app so operators can refresh data on demand.

## Shipping and Karrio integration

1. **Rate discovery** – The order detail screen launches a modal (`CreateShipmentModal`) that collects parcels and requests rates via `POST /shipments/:orderId/rates`. The API delegates to `KarrioService.getRates` which calls the local Karrio API using the service token.
2. **Shipment creation** – Selecting a rate posts to `POST /shipments/:orderId`, invoking `ShipmentsService.createShipment`. Carrier, rate, tracking data, and documents returned by Karrio are persisted on the order.
3. **Tracking updates** – A scheduled worker job calls `GET /api/shipments/track/:carrier/:trackingNo` with an `Authorization: Bearer <FULEXO_INTERNAL_API_TOKEN>` header and the tenant scope header. The API verifies ownership, queries Karrio for the latest events, and updates shipment status fields.
4. **Metadata storage** – Shipments persist parcel dimensions, weight, label URLs, documents, and carrier protocol data using Prisma JSON helpers so follow-up operations have the full Karrio payload.

## Request flow

```mermaid
graph TD
  subgraph Front-end (Next.js)
    A[Order page] --> B[Create shipment modal]
    B -->|Collect parcel| C[Request rates]
    C -->|POST /shipments/:orderId/rates| API
    D[Select rate] -->|POST /shipments/:orderId| API
  end

  subgraph API (NestJS)
    API -->|Fetch rates| KarrioAPI
    API -->|Persist shipment| Postgres
  end

  subgraph Worker
    W[Hourly job] -->|Internal track call| API
  end

  API -->|Update status| Postgres
  KarrioAPI -->|Tracking events| API
```

## Infrastructure topologies

- `compose/docker-compose.yml` provisions every service needed for local development, including observability tooling and the full Karrio stack.
- `docker-compose.prod.yml` mirrors the production footprint so deploys can run the API, web, worker, Karrio services, and monitoring components together.
- External storage and networking (MinIO, TLS termination, Prometheus scrapes) are configured in Compose and reinforced by Nginx templates under `compose/nginx/` and `nginx/`.

## Security and resilience

- **Authentication**: Signed JWT access tokens with optional TOTP-based two-factor authentication via `TwoFactorService`
- **Encryption**: Secrets and encryption keys supplied via environment variables with dedicated encryption services
- **Rate Limiting**: Global and endpoint-specific rate limiting via NestJS throttler
- **Audit Logging**: Comprehensive audit trail for all operations
- **Policy Checks**: Role-based access control (RBAC) with permission system
- **Security Headers**: CORS, CSP, X-Frame-Options, and other security headers configured
- **Input Validation**: Class-validator and sanitization on all inputs
- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: Input sanitization and CSP headers
- **CSRF Protection**: Token-based CSRF protection for state-changing operations
- **Operational Security**: Scripts for deployment, backup, monitoring, and hardening in `scripts/`

## Development Standards

### TypeScript Configuration
- Strict mode enabled across all applications
- No implicit any, returns, or this
- Consistent compiler options between API, Web, and Worker
- Path aliases configured for clean imports

### Code Quality Tools
- **ESLint**: Enforces coding standards and best practices
- **Prettier**: Consistent code formatting (via ESLint integration)
- **TypeScript**: Compile-time type checking
- **Jest**: Unit testing framework
- **Playwright**: E2E testing
- **Cypress**: Component and integration testing

### Best Practices
- Single responsibility principle in services
- Dependency injection throughout
- Error handling with typed exceptions
- Comprehensive logging with Winston
- Metrics collection with Prometheus
- Distributed tracing with Jaeger
