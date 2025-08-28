# Fulexo Platform Disaster Recovery & Business Continuity Plan

## 1. Recovery Objectives

### RTO (Recovery Time Objective)
- **Critical Services**: 1 hour
  - API endpoints
  - Order processing
  - Customer portal
- **Important Services**: 4 hours
  - Analytics
  - Reporting
  - Background sync
- **Non-Critical Services**: 24 hours
  - Historical data processing
  - Audit logs older than 30 days

### RPO (Recovery Point Objective)
- **Database**: 15 minutes
- **File Storage**: 1 hour
- **Cache**: Can be rebuilt (0 tolerance)
- **Logs**: 1 day

## 2. Backup Strategy

### Database Backups
```yaml
postgresql:
  continuous_archiving:
    method: WAL-G
    retention: 30 days
    
  point_in_time_recovery:
    enabled: true
    window: 7 days
    
  scheduled_backups:
    full:
      frequency: daily
      time: 02:00 UTC
      retention: 30 days
      
    incremental:
      frequency: every 6 hours
      retention: 7 days
      
  backup_locations:
    primary: s3://minio-primary/postgres/
    secondary: s3://minio-secondary/postgres/
    offsite: s3://minio-offsite/postgres/
```

### Backup Script
```bash
#!/bin/bash
# backup.sh

set -euo pipefail

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
MINIO_ALIAS_PRIMARY="minio"
MINIO_BUCKET_DB="fulexo-backups/postgres"
MINIO_BUCKET_CONFIG="fulexo-backups/config"

# Ensure mc alias is configured (one-time)
# mc alias set ${MINIO_ALIAS_PRIMARY} http://minio:9000 $S3_ACCESS_KEY $S3_SECRET_KEY

# PostgreSQL backup
echo "Starting PostgreSQL backup..."
pg_dump -h postgres -U fulexo -Fc -f "$BACKUP_DIR/fulexo_$BACKUP_DATE.dump" fulexo

gzip "$BACKUP_DIR/fulexo_$BACKUP_DATE.dump"

# Upload to MinIO with server-side encryption if configured
mc cp "$BACKUP_DIR/fulexo_$BACKUP_DATE.dump.gz" "${MINIO_ALIAS_PRIMARY}/${MINIO_BUCKET_DB}/"

# MinIO bucket mirror (app files) — if using a separate cache bucket
# mc mirror --overwrite --remove minio/fulexo-cache ${MINIO_ALIAS_PRIMARY}/fulexo-cache-offsite/

# Configuration backup (exclude secrets)
echo "Backing up configurations..."
tar czf "$BACKUP_DIR/config_$BACKUP_DATE.tar.gz" \
  /workspace/compose/ \
  --exclude='*.env'

mc cp "$BACKUP_DIR/config_$BACKUP_DATE.tar.gz" "${MINIO_ALIAS_PRIMARY}/${MINIO_BUCKET_CONFIG}/"

# Cleanup old local backups
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "Backup completed successfully"
```

### Restore Procedures
```bash
#!/bin/bash
# restore.sh

set -euo pipefail

RESTORE_DATE=$1
MINIO_ALIAS_PRIMARY="minio"
MINIO_BUCKET_DB="fulexo-backups/postgres"

if [ -z "$RESTORE_DATE" ]; then
  echo "Usage: ./restore.sh YYYYMMDD_HHMMSS"
  exit 1
fi

# Download backup from MinIO
echo "Downloading backup from MinIO..."
mc cp "${MINIO_ALIAS_PRIMARY}/${MINIO_BUCKET_DB}/fulexo_${RESTORE_DATE}.dump.gz" /tmp/

gunzip "/tmp/fulexo_${RESTORE_DATE}.dump.gz"

# Stop application
docker compose -f compose/docker-compose.yml stop api worker

# Restore database
echo "Restoring database..."
pg_restore -h postgres -U fulexo -d fulexo_restore \
  --clean --if-exists \
  "/tmp/fulexo_${RESTORE_DATE}.dump"

# Verify restore
psql -h postgres -U fulexo -d fulexo_restore -c "SELECT COUNT(*) FROM orders;"

# Switch database
psql -h postgres -U postgres -c "
  ALTER DATABASE fulexo RENAME TO fulexo_old;
  ALTER DATABASE fulexo_restore RENAME TO fulexo;
"

# Restart application
docker compose -f compose/docker-compose.yml start api worker

echo "Restore completed successfully"
```

## 3. High Availability Architecture

### Database HA
```yaml
postgresql_cluster:
  primary:
    host: pg-primary.fulexo.internal
    role: read-write
    
  replicas:
    - host: pg-replica-1.fulexo.internal
      role: read-only
      lag_threshold: 10MB
      
    - host: pg-replica-2.fulexo.internal
      role: read-only
      lag_threshold: 10MB
      
  failover:
    method: automatic
    tool: Patroni
    consensus: etcd
    switchover_timeout: 30s
```

### Application HA
```yaml
application:
  api:
    instances: 3
    health_check: /health
    load_balancer: nginx
    
  worker:
    instances: 2
    redundancy: active-active
    
  cache:
    redis_cluster:
      mode: cluster
      replicas: 1
      nodes: 6
```

## 4. Disaster Scenarios & Response

### Scenario 1: Database Corruption
```yaml
detection:
  - Checksum failures
  - Constraint violations
  - Application errors
  
response:
  1. Isolate corrupted database
  2. Switch to replica
  3. Restore from last known good backup
  4. Replay WAL logs to minimize data loss
  
prevention:
  - Regular VACUUM and ANALYZE
  - Checksum verification
  - Regular backup testing
```

### Scenario 2: Data Center Outage
```yaml
detection:
  - Complete loss of connectivity
  - Multiple service failures
  
response:
  1. Activate DR site
  2. Update DNS to point to DR site
  3. Restore from offsite backups
  4. Notify customers
  
prevention:
  - Multi-region deployment
  - Regular DR drills
  - Automated failover
```

### Scenario 3: Ransomware Attack
```yaml
detection:
  - Encrypted files
  - Ransom messages
  - Unusual file activity
  
response:
  1. Isolate affected systems
  2. Activate incident response team
  3. Restore from immutable backups
  4. Forensic analysis
  5. Security audit
  
prevention:
  - Immutable backups
  - Network segmentation
  - Regular security updates
  - Employee training
```

### Scenario 4: Data Breach
```yaml
detection:
  - Unauthorized access logs
  - Data exfiltration alerts
  - Anomaly detection
  
response:
  1. Contain breach
  2. Reset all credentials
  3. Audit access logs
  4. Notify affected parties (GDPR 72h)
  5. Legal compliance
  
prevention:
  - Encryption at rest and in transit
  - Access controls
  - Regular security audits
  - Penetration testing
```

## 5. Monitoring & Alerting for DR

### Critical Metrics
```yaml
metrics:
  backup_health:
    - last_successful_backup_age
    - backup_size_trend
    - backup_duration
    - restore_test_status
    
  replication_health:
    - replication_lag_bytes
    - replica_status
    - wal_sender_status
    
  service_availability:
    - uptime_percentage
    - error_rate
    - response_time_p99
```

### Alert Configuration
```yaml
alerts:
  critical:
    backup_failed:
      condition: last_backup_age > 25 hours
      action: page_oncall
      
    replication_lag_high:
      condition: lag_bytes > 100MB
      action: page_dba
      
    multi_service_down:
      condition: services_down > 2
      action: activate_dr_team
```

## 6. DR Testing Schedule

### Monthly Tests
- Backup restoration to test environment
- Replica failover simulation
- Application restart procedures

### Quarterly Tests
- Full DR drill with failover
- Data center outage simulation
- Recovery time measurement

### Annual Tests
- Complete disaster simulation
- Multi-region failover
- Business continuity exercise

## 7. Communication Plan

### Internal Communication
```yaml
incident_levels:
  P1_critical:
    notify:
      - CTO
      - Engineering Lead
      - DevOps Team
    channel: phone + slack
    
  P2_major:
    notify:
      - Engineering Team
      - Support Team
    channel: slack + email
    
  P3_minor:
    notify:
      - On-call Engineer
    channel: slack
```

### Customer Communication
```yaml
templates:
  initial_notification: |
    Subject: Service Disruption Notice
    
    We are currently experiencing a service disruption affecting [SERVICES].
    Our team is actively working on resolution.
    
    Impact: [DESCRIPTION]
    Start Time: [TIME]
    Expected Resolution: [ETA]
    
  resolution_notice: |
    Subject: Service Restored
    
    The service disruption has been resolved.
    All systems are operational.
    
    Duration: [DURATION]
    Root Cause: [SUMMARY]
    
status_page:
  url: https://status.example.com
  auto_update: true
  components:
    - API
    - Web Portal
    - Background Processing
```

## 8. Recovery Runbooks

### Database Recovery Runbook
```bash
# 1. Assess damage
psql -h postgres -U fulexo -c "\dt"

# 2. Check last backup
mc ls ${MINIO_ALIAS_PRIMARY}/${MINIO_BUCKET_DB}/ --recursive | tail -5

# 3. Create recovery database
createdb -h postgres -U postgres fulexo_recovery

# 4. Restore backup
pg_restore -h postgres -U fulexo -d fulexo_recovery /path/to/backup.dump

# 5. Verify data integrity
psql -h postgres -U fulexo -d fulexo_recovery -f /scripts/verify_integrity.sql

# 6. Switch application to recovery database
sed -i 's/fulexo/fulexo_recovery/g' /apps/api/.env

# 7. Restart services
docker compose restart api worker

# 8. Monitor for issues
tail -f /var/log/fulexo/*.log
```

### Application Recovery Runbook
```bash
# 1. Check service status
docker compose ps

# 2. Review logs for errors
docker compose logs --tail=100 api worker

# 3. Restart failed services
docker compose restart api worker

# 4. Clear corrupted cache
docker compose exec valkey redis-cli FLUSHALL

# 5. Warm cache
docker compose exec api npm run cache:warm

# 6. Verify endpoints
curl https://api.fulexo.com/health

# 7. Run smoke tests
npm run test:smoke
```

## 9. Business Continuity

### Critical Business Functions
1. **Order Processing**: Must maintain ability to receive and process orders
2. **Shipment Tracking**: Customer shipment visibility
3. **Customer Support**: Access to customer data and order history
4. **Financial Reporting**: Daily revenue and transaction reports

### Minimum Viable Operations
```yaml
degraded_mode:
  features:
    enabled:
      - Order viewing
      - Basic search
      - Customer login
      
    disabled:
      - Analytics
      - Bulk exports
      - Background sync
      
  capacity:
    api_instances: 1
    worker_instances: 1
    cache: disabled
    
  data_freshness:
    acceptable_lag: 1 hour
```

## 10. Post-Incident Procedures

### Incident Review Template
```markdown
## Incident Report

**Date**: [DATE]
**Duration**: [DURATION]
**Severity**: P1/P2/P3
**Services Affected**: [LIST]

### Timeline
- [TIME]: Initial detection
- [TIME]: Response initiated
- [TIME]: Root cause identified
- [TIME]: Fix deployed
- [TIME]: Service restored

### Root Cause
[DESCRIPTION]

### Impact
- Customers affected: [NUMBER]
- Data loss: [YES/NO]
- Financial impact: [AMOUNT]

### Action Items
- [ ] [IMPROVEMENT 1]
- [ ] [IMPROVEMENT 2]
- [ ] [IMPROVEMENT 3]

### Lessons Learned
[SUMMARY]
```

## 11. Compliance & Legal

### GDPR Requirements
- Data breach notification within 72 hours
- Right to erasure procedures
- Data portability during recovery
- Audit trail preservation

### SLA Commitments
- 99.9% uptime (43.2 minutes/month downtime allowed)
- Recovery time objectives documented
- Customer compensation policies

## 12. DR Budget & Resources

### Cost Estimates
```yaml
monthly_costs:
  backup_storage: $500
  replica_instances: $1200
  dr_site: $800
  monitoring_tools: $300
  total: $2800
  
annual_costs:
  dr_drills: $5000
  security_audits: $10000
  training: $3000
  total: $18000
```

### Team Responsibilities
```yaml
roles:
  incident_commander:
    - Coordinate response
    - External communication
    - Decision making
    
  technical_lead:
    - Execute recovery procedures
    - Troubleshoot issues
    - Coordinate technical team
    
  communications_lead:
    - Customer notifications
    - Status page updates
    - Internal updates
```

## 13. Continuous Improvement

### Metrics to Track
- Mean Time To Recovery (MTTR)
- Mean Time Between Failures (MTBF)
- Backup success rate
- DR drill success rate
- Incident response time

### Quarterly Review Checklist
- [ ] Review and update runbooks
- [ ] Test backup restoration
- [ ] Update contact lists
- [ ] Review SLA compliance
- [ ] Update risk assessment
- [ ] Train new team members