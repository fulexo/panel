# ADR-005: BaseLinker Write Operations Governance

## Status
Accepted

## Context
- Default architecture is read-only; selective admin writes are required for ops.
- Writes must be safe, auditable, and rate-limit aware.

## Decision
- Feature flags per module (orders, shipments, invoices, returns, inventory) and per-account whitelist.
- Two-step execution: dry-run preview → confirm & queue write.
- Optional approval flow for sensitive operations.
- Idempotency via client-provided `idempotencyKey` and server audit linkage.

## Consequences
- Additional UI flows and queue orchestration.
- Transparent audit trail with masked PII.

## Implementation Notes
- Audit payloads with masked secrets; store request/response summaries.
- Backoff and low concurrency for write queues; max 3 attempts.
- Metrics: `bl_writes_total`, `bl_write_failures_total`, `bl_write_duration_ms`.