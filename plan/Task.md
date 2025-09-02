# Execution Plan (WooCommerce‑Focused, Brief)

P1 — Core Setup
- Multi‑tenant auth (JWT + optional 2FA), RBAC, Prisma schema migrated.
- Stores module (WooStore CRUD): add/test/register‑webhooks; secrets encrypted.
- Orders read: list/filter/detail; share‑link with short‑lived JWT.

P2 — Sync & Webhooks
- Webhook endpoints: orders/products created/updated.
- Worker jobs: woo-sync-orders/products (incremental by updated_after), mapping via RemoteEntityMap.
- Rate‑limit & retry; DLQ; reconciliation job (nightly).

P3 — Policies & Requests
- Visibility/PII policies per tenant; customer portal scoping.
- Requests module (stock adjust/new product/order note/document upload) internal‑only.

P4 — Observability & Ops
- Metrics dashboards (API/Worker); alerts on error/lag; log aggregation.
- Backups; restore drill; TLS & headers hardened; secrets rotation.

Deliverables
- API + Web + Worker containers via Compose; Nginx TLS.
- Minimal docs: Blueprint, Rate‑Limiting, Security, Performance, this Task plan.