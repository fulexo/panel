# Performance Optimization (Concise)

Database
- Use covering and selective composite indexes (orders: tenantId,status,confirmedAt DESC).
- Avoid N+1 with Prisma include/select; prefer cursor pagination for large lists.
- Periodic ANALYZE/VACUUM; consider partitioning large time‑series tables when needed.

Caching
- L1 memory + L2 Redis; jittered TTL to prevent stampedes.
- Response ETags for GET; cache warmers for dashboards/status counts.

API
- Compression; lean DTOs; limit page sizes; input validation early returns.
- Async jobs for heavy tasks (exports, reconciliation).

Worker
- Concurrency per job; limiter for Woo calls; batch where safe.
- Dead‑letter queue and retry with exponential backoff.

Frontend
- Code splitting; lazy load heavy components; virtualized lists for large tables.
- Image optimization; reduce bundle by trimming deps.

Monitoring
- Key metrics: http_request_duration_ms, job_fail_total, sync_lag_seconds.
- Alert on sustained errors/latency and queue depth anomalies.