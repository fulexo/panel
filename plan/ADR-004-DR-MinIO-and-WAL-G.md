# ADR-004: Disaster Recovery with MinIO and WAL-G

## Status
Accepted

## Context
- Self-host constraint disallows cloud object storage (S3/Glacier).
- Need reliable backups and point-in-time recovery (PITR).

## Decision
- Use MinIO as S3-compatible storage for WAL-G backups (base + WALs).
- Maintain two independent MinIO targets for primary and offsite backups.
- Mirror non-database artifacts with `mc mirror` to offsite.

## Consequences
- Operate and secure MinIO endpoints.
- DR drills must validate PITR on staging regularly.

## Implementation Notes
- Configure WAL-G with MinIO endpoint, credentials and server-side encryption.
- Retention: full (30d), incremental (7d), WAL retention to cover RPO (15m).
- Quarterly full DR drill with failover simulation and RTO/RPO measurement.