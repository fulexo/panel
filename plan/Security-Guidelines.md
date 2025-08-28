# Fulexo Platform Security Guidelines

## 1. Token Management & Encryption

### BaseLinker Token Security
```yaml
Implementation:
  encryption:
    algorithm: AES-256-GCM
    key_derivation: PBKDF2
    iterations: 100000
    salt_bytes: 32
    
  envelope_encryption:
    master_key: Stored in HSM/KMS or environment
    data_keys: Per-token unique keys
    key_rotation: Every 90 days
    
  storage:
    format: |
      {
        "ciphertext": "base64_encrypted_token",
        "nonce": "base64_nonce",
        "key_version": 1,
        "encrypted_data_key": "base64_encrypted_dek",
        "created_at": "2025-01-01T00:00:00Z",
        "rotated_at": "2025-01-01T00:00:00Z"
      }
```

### Key Rotation Strategy
```typescript
// Key rotation service
class KeyRotationService {
  async rotateKeys() {
    // 1. Generate new master key version
    const newKeyVersion = await this.generateNewMasterKey();
    
    // 2. Re-encrypt all tokens with new key
    const tokens = await this.getAllEncryptedTokens();
    for (const token of tokens) {
      const decrypted = await this.decrypt(token, token.key_version);
      const reencrypted = await this.encrypt(decrypted, newKeyVersion);
      await this.updateToken(token.id, reencrypted);
    }
    
    // 3. Mark old key for deletion after grace period
    await this.scheduleKeyDeletion(oldKeyVersion, '30d');
  }
}
```

## 2. Secrets Management

### Environment Variables
```yaml
development:
  storage: .env.local (gitignored)
  
staging:
  storage: Docker secrets
  injection: Runtime environment
  
production:
  storage: 
    - HashiCorp Vault (self-hosted)
    - Kubernetes Secrets
    - SOPS-encrypted files (gitops)
  note: |
    Cloud-managed secret stores (e.g., AWS Secrets Manager, Azure Key Vault) are out-of-scope for the self-hosted deployment profile.
  rotation:
    database_password: 30 days
    jwt_secret: 90 days
    api_keys: 180 days
```

### JWT Security
```typescript
interface JWTConfig {
  accessToken: {
    secret: string; // Rotated every 90 days
    expiresIn: '15m';
    algorithm: 'RS256'; // Asymmetric for production
  };
  refreshToken: {
    secret: string; // Different from access token secret
    expiresIn: '7d';
    algorithm: 'RS256';
  };
  rotation: {
    gracePeriod: '24h'; // Accept old tokens during rotation
    strategy: 'dual-key'; // Support old and new key simultaneously
  };
}
```

## 3. Network Security

### Service-to-Service Communication
```yaml
internal_communication:
  protocol: mTLS
  certificate_authority: Internal CA
  certificate_rotation: Every 30 days
  
service_mesh:
  solution: Istio/Linkerd
  features:
    - Automatic mTLS
    - Traffic encryption
    - Service authentication
    - Authorization policies
```

### Network Segmentation
```yaml
network_zones:
  dmz:
    services: [nginx, waf]
    rules: Allow 80/443 from internet
    
  application:
    services: [api, web, worker]
    rules: Allow from DMZ only
    
  data:
    services: [postgres, redis, minio]
    rules: Allow from application zone only
    
  management:
    services: [prometheus, grafana, jaeger]
    rules: Restricted admin access only
```

## 4. Input Validation & Sanitization

### SQL Injection Prevention
```typescript
// Use parameterized queries with Prisma
const safeQuery = await prisma.$queryRaw`
  SELECT * FROM orders 
  WHERE tenant_id = ${tenantId}::uuid 
  AND status = ${status}
`;

// Input validation middleware
class ValidationMiddleware {
  validateUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }
  
  sanitizeInput(input: any): any {
    // Remove null bytes
    if (typeof input === 'string') {
      return input.replace(/\0/g, '');
    }
    return input;
  }
}
```

### XSS Prevention
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Content Security Policy
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
    reportUri: '/api/csp-report'
  }
};

// HTML sanitization
function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target']
  });
}
```

### File Upload Security
```typescript
interface FileUploadConfig {
  maxSize: 10 * 1024 * 1024; // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'];
  virusScanning: {
    enabled: true;
    engine: 'clamav';
  };
  storage: {
    temporary: '/tmp/uploads';
    permanent: 's3://secure-bucket';
  };
  validation: {
    checkMagicBytes: true;
    sanitizeFilename: true;
    generateUUID: true;
  };
}

class FileUploadService {
  async validateFile(file: Express.Multer.File): Promise<boolean> {
    // Check file size
    if (file.size > this.config.maxSize) {
      throw new Error('File too large');
    }
    
    // Check MIME type
    if (!this.config.allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type');
    }
    
    // Check magic bytes
    const magicBytes = await this.getMagicBytes(file.buffer);
    if (!this.isValidMagicBytes(magicBytes, file.mimetype)) {
      throw new Error('File content does not match MIME type');
    }
    
    // Virus scan
    if (this.config.virusScanning.enabled) {
      const scanResult = await this.scanForVirus(file.buffer);
      if (scanResult.infected) {
        throw new Error('File contains malware');
      }
    }
    
    return true;
  }
}
```

## 5. Audit Logging

### Audit Log Schema
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  session_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  request_id UUID,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Tamper protection
  checksum VARCHAR(64) NOT NULL, -- SHA256 of row content
  previous_checksum VARCHAR(64) REFERENCES audit_logs(checksum)
);

-- Indexes for performance
CREATE INDEX idx_audit_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user_date ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);

-- Partitioning for retention
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Audit Log Retention & GDPR
```typescript
class AuditLogService {
  // Retention policy
  readonly retentionDays = {
    security: 365 * 2,  // 2 years for security events
    compliance: 365 * 7, // 7 years for compliance
    general: 90         // 90 days for general logs
  };
  
  // GDPR anonymization
  async anonymizePII(olderThan: Date): Promise<void> {
    await this.db.auditLogs.updateMany({
      where: { 
        created_at: { lt: olderThan },
        anonymized: false 
      },
      data: {
        ip_address: this.hashIP,
        user_agent: 'REDACTED',
        metadata: this.redactPII,
        anonymized: true
      }
    });
  }
  
  // Tamper detection
  async verifyIntegrity(logId: string): Promise<boolean> {
    const log = await this.getLog(logId);
    const calculatedChecksum = this.calculateChecksum(log);
    return calculatedChecksum === log.checksum;
  }
}
```

## 6. Rate Limiting & DDoS Protection

### Multi-Layer Rate Limiting
```yaml
layers:
  1_nginx:
    type: connection_limit
    config:
      limit_conn_zone: $binary_remote_addr zone=addr:10m
      limit_conn: addr 10
      limit_req_zone: $binary_remote_addr zone=req:10m rate=10r/s
      limit_req: zone=req burst=20 nodelay
      
  # NOTE: For self-hosted deployments, replace cloud WAF with the following layer
  2_waf_self_hosted:
    type: modsecurity_crowdsec
    modsecurity:
      engine: on
      crs: OWASP-CRS v4
      anomaly_threshold: 5
    crowdsec:
      enabled: true
      bouncer: nginx
      scenarios:
        - crowdsecurity/http-probing
        - crowdsecurity/http-bad-user-agent
      decisions_ttl: 24h
      remediation: ban
      
  3_application:
    type: token_bucket
    config:
      global: 10000/min
      per_tenant: 1000/min
      per_user: 100/min
      per_endpoint:
        login: 5/min
        export: 10/hour
        bulk_operation: 1/min
```

### DDoS Protection
```typescript
class DDoSProtection {
  // Circuit breaker pattern
  private circuitBreaker = new CircuitBreaker({
    timeout: 3000,
    errorThreshold: 50,
    resetTimeout: 30000
  });
  
  // Adaptive rate limiting
  async adaptiveRateLimit(tenantId: string): Promise<number> {
    const recentErrors = await this.getRecentErrors(tenantId);
    const baseLimit = 100;
    
    if (recentErrors > 10) {
      return baseLimit * 0.5; // Reduce limit by 50%
    } else if (recentErrors > 5) {
      return baseLimit * 0.75; // Reduce limit by 25%
    }
    
    return baseLimit;
  }
}
```

## 7. Authentication & Authorization

### Multi-Factor Authentication
```typescript
interface MFAConfig {
  methods: {
    totp: {
      enabled: true;
      issuer: 'Fulexo Platform';
      algorithm: 'SHA256';
      digits: 6;
      period: 30;
    };
    backup_codes: {
      enabled: true;
      count: 10;
      length: 8;
    };
    webauthn: {
      enabled: true;
      rpName: 'Fulexo';
      rpID: 'example.com';
    };
  };
  enforcement: {
    admin_users: 'required';
    staff_users: 'required';
    customer_admin: 'optional';
    customer_user: 'optional';
  };
}
```

### Session Management
```typescript
class SessionManager {
  // Secure session configuration
  readonly sessionConfig = {
    secret: process.env.SESSION_SECRET,
    name: 'fulexo.sid',
    cookie: {
      secure: true, // HTTPS only
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      domain: '.example.com'
    },
    rolling: true, // Reset expiry on activity
    resave: false,
    saveUninitialized: false
  };
  
  // Concurrent session control
  async enforceSessionLimit(userId: string, limit: number = 3): Promise<void> {
    const sessions = await this.getActiveSessions(userId);
    if (sessions.length >= limit) {
      // Terminate oldest session
      await this.terminateSession(sessions[0].id);
    }
  }
  
  // Session fingerprinting
  generateFingerprint(req: Request): string {
    return crypto.createHash('sha256')
      .update(req.headers['user-agent'] || '')
      .update(req.headers['accept-language'] || '')
      .update(req.headers['accept-encoding'] || '')
      .digest('hex');
  }
}
```

## 8. Compliance & Privacy

### GDPR Compliance
```typescript
class GDPRCompliance {
  // Data retention policies
  readonly retentionPolicies = {
    orders: '7 years', // Legal requirement
    customer_data: '3 years after last activity',
    logs: '90 days',
    backups: '30 days'
  };
  
  // Right to erasure
  async deleteUserData(userId: string): Promise<void> {
    // Anonymize instead of delete for audit trail
    await this.anonymizeOrders(userId);
    await this.anonymizeCustomerData(userId);
    await this.deletePersonalData(userId);
    await this.notifyDeletion(userId);
  }
  
  // Data portability
  async exportUserData(userId: string): Promise<Buffer> {
    const data = {
      profile: await this.getProfile(userId),
      orders: await this.getOrders(userId),
      activities: await this.getActivities(userId)
    };
    
    return Buffer.from(JSON.stringify(data, null, 2));
  }
}
```

### PCI DSS Compliance (if handling card data)
```yaml
requirements:
  network_security:
    - Firewall configuration
    - No direct internet access to cardholder data
    
  access_control:
    - Unique IDs for each person
    - Restrict access to cardholder data
    - Two-factor authentication
    
  monitoring:
    - Track all access to network resources
    - Regular security testing
    - Security audit logs
    
  encryption:
    - Encrypt transmission of cardholder data
    - Strong cryptography (AES-256)
```

## 9. Security Headers

### Nginx Configuration
```nginx
# Security headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

# CSP with report-uri
add_header Content-Security-Policy "
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  report-uri https://api.example.com/csp-report;
" always;
```

## 10. Security Monitoring & Incident Response

### Security Monitoring
```yaml
monitoring:
  siem:
    solution: ELK Stack / Splunk
    data_sources:
      - Application logs
      - System logs
      - Network logs
      - Database logs
      
  alerts:
    critical:
      - Multiple failed login attempts
      - Privilege escalation attempts
      - SQL injection attempts
      - XSS attempts
      - Unauthorized API access
      
    warning:
      - Unusual traffic patterns
      - Large data exports
      - After-hours access
      - Geographic anomalies
```

### Incident Response Plan
```yaml
phases:
  1_detection:
    - Automated alerts
    - Manual reports
    - Monitoring dashboards
    
  2_containment:
    - Isolate affected systems
    - Disable compromised accounts
    - Block malicious IPs
    
  3_eradication:
    - Remove malware
    - Patch vulnerabilities
    - Reset credentials
    
  4_recovery:
    - Restore from backups
    - Monitor for reinfection
    - Verify system integrity
    
  5_lessons_learned:
    - Document incident
    - Update procedures
    - Implement improvements
```

## 11. Security Testing

### Automated Security Testing
```yaml
continuous_testing:
  static_analysis:
    tools: [SonarQube, Snyk, CodeQL]
    frequency: Every commit
    
  dependency_scanning:
    tools: [npm audit, OWASP Dependency Check]
    frequency: Daily
    
  container_scanning:
    tools: [Trivy, Clair]
    frequency: Every build
    
  dynamic_testing:
    tools: [OWASP ZAP, Burp Suite]
    frequency: Weekly
    
  penetration_testing:
    provider: External vendor
    frequency: Quarterly
```

## 12. Security Checklist

### Pre-Deployment
- [ ] All secrets in secure storage
- [ ] TLS certificates valid
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Authentication/authorization tested
- [ ] Audit logging enabled
- [ ] Backup/restore tested
- [ ] Security scan passed
- [ ] Penetration test completed

### Post-Deployment
- [ ] Monitor security alerts
- [ ] Review audit logs daily
- [ ] Update dependencies monthly
- [ ] Rotate secrets quarterly
- [ ] Security training completed
- [ ] Incident response drills
- [ ] Compliance audit passed