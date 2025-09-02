# Security Guidelines (Concise)

AuthN/Z
- JWT access/refresh; short access TTL; rotate keys; TOTP 2FA for admin/staff.
- RBAC roles: FULEXO_ADMIN, FULEXO_STAFF, CUSTOMER_ADMIN, CUSTOMER_USER.

Tenant Isolation
- Enforce tenantId scoping in all queries; verify at service boundary.
- Mask PII per policy (email/phone) for customer roles.

Secrets
- AES‑GCM envelope encryption for Woo ck/cs and other secrets.
- Secrets in environment or vault; rotate periodically; audit access.

Transport & Network
- TLS everywhere via Nginx; security headers (HSTS, CSP, XFO, XCTO).
- Separate networks: app, data; restrict DB/Redis exposure.

Input & Data
- Validate DTOs; sanitize strings; parameterized DB queries.
- Files: size/type checks, magic‑byte verification; optional AV scan.

Sessions & Rate Limits
- Device fingerprinting optional; concurrent session limits.
- Per‑route rate limits; fail‑open if Redis unavailable for auth.

Audit & Monitoring
- Audit critical actions (login, settings, store changes, sync actions).
- Prometheus metrics, alerting on spikes/failures; log aggregation.

Backups & Recovery
- Daily DB backups; restore drills; retention policy.

Incident Response
- Detect → contain → eradicate → recover → post‑mortem; runbooks documented.