# Rate Limiting & Token Management (Concise)

Goals
- Protect Woo and internal services from overload.
- Fair‑share across tenants/stores; priority for critical operations.

Layers
- Nginx: basic request burst control (optional).
- API Guard: per‑route token bucket; fail‑open if Redis down (login safe).
- Worker: BullMQ limiter for Woo calls per store.

Design
- Keys
  - api:user:{userId}:route:{name}
  - woo:store:{storeId}
- Buckets
  - API per user/route: e.g., login 5/min, export 10/hour.
  - Woo per store: configurable (defaults conservative), jitter to avoid thundering herd.
- Priority Queue
  - Queues: critical, high, normal, low. Critical bypasses batch limits within safety window.
- Backoff & Circuit Breaker
  - Exponential backoff on 429/5xx; short open → half‑open → closed loop per store.

Quota Allocation
- Default caps per store; optional reserved quota per premium tenant.
- Adaptive adjustments based on moving averages (increase/decrease modestly).

Monitoring
- Metrics: woo_requests_total, woo_rate_limited_total, job_fail_total, sync_lag_seconds.
- Alerts: high 5xx/429, sustained lag, queue depth spikes.

Implementation Notes
- Redis Lua for atomic take/refill; add jitter to TTLs.
- Idempotency keys for write jobs; RemoteEntityMap for dedupe.
- Respect Woo pagination; incremental windows (updated_after) with checkpoint.