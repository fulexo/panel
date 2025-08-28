# ADR-001: PostgreSQL RLS with Prisma and PgBouncer

## Status
Accepted

## Context
- We require strict tenant isolation at the database layer using PostgreSQL Row Level Security (RLS).
- Prisma uses pooled connections and prepared statements.
- PgBouncer in transaction pooling mode breaks session-level GUCs (e.g., `SET app.tenant_id`), needed for RLS policies.

## Decision
- For MVP and until further evaluation, run without PgBouncer or use PgBouncer in SESSION mode for the API service.
- Enforce a per-request transaction scope and set the tenant context using `SET LOCAL app.tenant_id = :tenantId` at the start of each request transaction.
- Keep RLS policies enabled on all multi-tenant tables.

## Consequences
- Slightly higher connection usage without transaction pooling.
- Strong isolation guarantees via RLS.
- If/when moving to transaction pooling, consider alternatives:
  - Use Prisma Data Proxy equivalent (self-hosted alternative) or a connection manager that preserves session.
  - Drop RLS and enforce tenant filters at application level (not preferred).

## Implementation Notes
- Migration to create GUC and policies:
  - `ALTER TABLE <tables> ENABLE ROW LEVEL SECURITY;`
  - Policy: `USING (tenant_id = current_setting('app.tenant_id')::uuid)`
- Middleware ensures each request wraps queries in a transaction and runs `SET LOCAL app.tenant_id` once.