# ADR-003: Self-Hosted WAF and Rate Limiting

## Status
Accepted

## Context
- Self-host requirement prohibits cloud WAF/CDN.
- Need multi-layer protection: edge (Nginx), WAF (ModSecurity + OWASP CRS), crowd-driven bans (CrowdSec), and application-level quotas.

## Decision
- Nginx: enable `limit_req`/`limit_conn` at the edge.
- ModSecurity with OWASP CRS v4 in detection→blocking mode after tuning.
- CrowdSec with Nginx bouncer for IP reputation and scenarios.
- Application: Redis-backed token bucket per-tenant, per-user, and per-endpoint; BL API per-token 100 rpm limiter with Lua.

## Consequences
- Additional containers and tuning required.
- Predictable, cloud-independent protection.

## Implementation Notes
- Provision ModSecurity ruleset and exclusions for known safe endpoints (e.g., file downloads, websockets if any).
- Emit `Retry-After` and standard rate limit headers.
- Expose Prometheus metrics: `rate_limit_hits_total`, `waf_dropped_total`, `token_utilization`.