### Fulexo Platform Blueprint — WooCommerce‑Centric (Concise)

Purpose
- Single admin panel to manage multiple customer stores (orders, products, invoices) via WooCommerce.
- Multi‑tenant, secure, self‑hosted, provider‑agnostic core with Woo as primary provider.

Architecture
- Web: Next.js (App Router), Tailwind, protected routes, token in localStorage.
- API: NestJS, JWT + optional 2FA, RBAC, Prisma (PostgreSQL), Redis for cache/queues.
- Worker: BullMQ for sync/jobs; Prometheus metrics.
- Storage: PostgreSQL (primary), Redis (cache/queue), MinIO (optional files).
- Reverse Proxy: Nginx + TLS; monitoring stack (Prometheus/Grafana/Loki/Jaeger optional).

Data Model (high‑level)
- Tenant, User (roles: FULEXO_ADMIN, FULEXO_STAFF, CUSTOMER_ADMIN, CUSTOMER_USER)
- WooStore(tenantId, baseUrl, ck, cs, webhookSecret, active)
- Orders, OrderItems, Products, Invoices, Shipments, Returns
- RemoteEntityMap(storeId, entityType, remoteId, localId)
- WebhookEvent(tenantId, storeId, topic, payload, status)

Security & Policies
- JWT access + refresh; optional TOTP 2FA for admin/staff.
- Row Level Security via tenantId scoping in Prisma layer.
- Policies per tenant: module visibility, actions, data scope, PII masking.
- Secrets: AES‑GCM envelope encryption for Woo credentials.

Woo Integration
- REST client per store (ck/cs); incremental pulls (updated_after) and push where needed.
- Webhooks: orders.create/update, products.create/update, etc. (store‑scoped secrets).
- Sync strategy: webhook‑first; periodic reconciliation jobs as safety net.
- RemoteEntityMap for idempotency and cross‑id mapping.

Sync & Jobs
- Jobs: woo-sync-orders, woo-sync-products, webhook ingest, reconciliation, cache warmers.
- Backoff and retry with dead‑letter; tenant/store aware rate‑limits.

API Highlights
- Stores: list/add/test/register‑webhooks/activate/deactivate.
- Orders: list/filter/detail, charges (internal), share‑link (short‑lived JWT).
- Products/Customers/Invoices/Shipments/Returns: list/detail where applicable.
- Settings: email, notifications, general; per‑tenant secrets encrypted.

UI Highlights
- Admin: Dashboard, Stores, Orders, Products, Customers, Requests, Settings.
- Customer: Scoped Dashboard, Orders, Products; limited by tenant policies.

Observability
- /metrics on API/Worker; dashboards for job health, sync lag, API latency.

Deployment
- Docker Compose: api, web, worker, postgres, redis, nginx (+ optional stacks).
- TLS via Certbot; environment via compose/.env.

Roadmap (phased)
- P1: Multi‑store CRUD, Orders read, Products read, webhook ingest.
- P2: Incremental sync and mapping, Policies/PII, Requests module.
- P3: Reconciliation/analytics, exports, performance tuning.