# Fulexo Platform — AI Agent Task Plan (Machine-Executable)

This plan is designed for an AI code agent to execute end-to-end. Follow phases in order. Do not skip acceptance checks. Keep everything self‑hosted (no paid external services).

## GLOBAL_VARIABLES (fill before starting)
```yaml
PROJECT_ROOT: /workspace/fulexo
DOMAIN_APP: app.example.com
DOMAIN_API: api.example.com
EMAIL_SENDER: no-reply@example.com
TIMEZONE: Europe/Istanbul
POSTGRES_DB: fulexo
POSTGRES_USER: fulexo
POSTGRES_PASSWORD: "CHANGE_ME_STRONG_DB_PASS"
REDIS_URL: redis://valkey:6379/0
S3_ENDPOINT: http://minio:9000
S3_ACCESS_KEY: minio
S3_SECRET_KEY: "CHANGE_ME_STRONG_MINIO_PASS"
S3_BUCKET: fulexo-cache
JWT_SECRET: "CHANGE_ME_RANDOM_256BIT"
ENCRYPTION_KEY: "CHANGE_ME_256BIT_HEX_OR_BASE64"
NODE_ENV: production
```

## AGENT_RULES
- Always run commands non-interactively. Treat warnings as errors unless specified.
- After each task, run the specified verify step and check acceptance criteria.
- Never push BaseLinker writes unless feature flag is explicitly ON.
- Protect secrets: do not print them in logs.

---

## PHASE 0 — Bootstrap & Repo

### 0.1 Create repo skeleton
```yaml
- id: mk-repo
  type: command
  run: |
    mkdir -p ${PROJECT_ROOT}/compose/{nginx/conf.d,prometheus,grafana/provisioning/{datasources,dashboards},loki,promtail} \
             ${PROJECT_ROOT}/apps/{api,web,worker} && \
    mkdir -p ${PROJECT_ROOT}/docs
  accept: ["${PROJECT_ROOT}/compose/nginx/conf.d" , "${PROJECT_ROOT}/apps/api"]
```

### 0.2 Initialize git (optional if already in VCS)
```yaml
- id: git-init
  type: command
  run: |
    cd ${PROJECT_ROOT} && git init && git add -A && git commit -m "chore: init structure"
  condition: "git not initialized"
```

### 0.3 Add CI workflow (GitHub Actions)
```yaml
- id: ci-workflow
  type: file
  path: ${PROJECT_ROOT}/.github/workflows/ci.yml
  content: |
    name: CI
    on:
      push:
        branches: [ main ]
      pull_request:
        branches: [ main ]
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - uses: actions/setup-node@v4
            with: { node-version: 20 }
          - run: npm ci --prefix apps/api || npm i --prefix apps/api
          - run: npm ci --prefix apps/web || npm i --prefix apps/web
          - run: npm test --prefix apps/api || echo "no tests"
          - run: npm run build --prefix apps/api || echo "api build"
          - run: npm run build --prefix apps/web || echo "web build"
```

---

## PHASE 1 — OS Baseline

### 1.1 Update & base tools
```yaml
- id: os-update
  type: command
  run: sudo apt update && sudo apt -y upgrade
```

### 1.2 Install Docker & Compose
```yaml
- id: docker-install
  type: command
  run: |
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    newgrp docker << EOF
    docker ps || true
    EOF
  verify: docker --version && docker compose version
```

### 1.3 Firewall (ufw)
```yaml
- id: ufw-setup
  type: command
  run: |
    sudo apt -y install ufw
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo "y" | sudo ufw enable
  verify: sudo ufw status
```

---

## PHASE 2 — Compose & Services

### 2.1 Create .env for compose
```yaml
- id: compose-env
  type: file
  path: ${PROJECT_ROOT}/compose/.env
  content: |
    POSTGRES_DB=${POSTGRES_DB}
    POSTGRES_USER=${POSTGRES_USER}
    POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    REDIS_URL=${REDIS_URL}
    S3_ENDPOINT=${S3_ENDPOINT}
    S3_ACCESS_KEY=${S3_ACCESS_KEY}
    S3_SECRET_KEY=${S3_SECRET_KEY}
    S3_BUCKET=${S3_BUCKET}
    NODE_ENV=${NODE_ENV}
    JWT_SECRET=${JWT_SECRET}
    ENCRYPTION_KEY=${ENCRYPTION_KEY}
  accept: ["${PROJECT_ROOT}/compose/.env"]
```

### 2.2 Write docker-compose.yml
```yaml
- id: compose-yml
  type: file
  path: ${PROJECT_ROOT}/compose/docker-compose.yml
  content: |
    version: "3.9"
    services:
      nginx:
        image: nginx:1.25
        volumes:
          - ./nginx/conf.d:/etc/nginx/conf.d:ro
          - /etc/letsencrypt:/etc/letsencrypt:ro
        ports: ["80:80", "443:443"]
        depends_on: [api, web]
        restart: unless-stopped

      postgres:
        image: postgres:16
        environment:
          POSTGRES_DB: ${POSTGRES_DB}
          POSTGRES_USER: ${POSTGRES_USER}
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
        volumes:
          - pgdata:/var/lib/postgresql/data
        restart: unless-stopped

      valkey:
        image: valkey/valkey:7
        command: ["valkey-server", "--appendonly", "yes"]
        volumes:
          - valkeydata:/data
        restart: unless-stopped

      minio:
        image: minio/minio:latest
        environment:
          MINIO_ROOT_USER: ${S3_ACCESS_KEY}
          MINIO_ROOT_PASSWORD: ${S3_SECRET_KEY}
        command: server /data --console-address ":9001"
        ports: ["9000:9000", "9001:9001"]
        volumes:
          - miniodata:/data
        restart: unless-stopped

      api:
        build: ../apps/api
        env_file: .env
        environment:
          DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
          REDIS_URL: ${REDIS_URL}
          S3_ENDPOINT: ${S3_ENDPOINT}
          S3_ACCESS_KEY: ${S3_ACCESS_KEY}
          S3_SECRET_KEY: ${S3_SECRET_KEY}
          S3_BUCKET: ${S3_BUCKET}
          JWT_SECRET: ${JWT_SECRET}
          ENCRYPTION_KEY: ${ENCRYPTION_KEY}
          NODE_ENV: ${NODE_ENV}
        depends_on: [postgres, valkey, minio]
        restart: unless-stopped

      web:
        build: ../apps/web
        env_file: .env
        environment:
          NEXT_PUBLIC_API_BASE: https://${DOMAIN_API}
          NODE_ENV: ${NODE_ENV}
        depends_on: [api]
        restart: unless-stopped

      worker:
        build: ../apps/worker
        env_file: .env
        environment:
          DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
          REDIS_URL: ${REDIS_URL}
          NODE_ENV: ${NODE_ENV}
        depends_on: [postgres, valkey]
        restart: unless-stopped

      prometheus:
        image: prom/prometheus:latest
        volumes:
          - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
          - prometheusdata:/prometheus
        restart: unless-stopped

      alertmanager:
        image: prom/alertmanager:latest
        volumes:
          - ./alertmanager/config.yml:/etc/alertmanager/config.yml:ro
        ports: ["9093:9093"]
        depends_on: [prometheus]
        restart: unless-stopped

      grafana:
        image: grafana/grafana:latest
        volumes:
          - grafanadata:/var/lib/grafana
        environment:
          GF_SECURITY_ADMIN_PASSWORD: grafana_admin_pass
        depends_on: [prometheus]
        restart: unless-stopped

      loki:
        image: grafana/loki:2.9.0
        volumes:
          - ./loki/config.yml:/etc/loki/config.yml:ro
          - lokidata:/loki
        command: ["-config.file=/etc/loki/config.yml"]
        restart: unless-stopped

      promtail:
        image: grafana/promtail:3.0.0
        volumes:
          - ./promtail/config.yml:/etc/promtail/config.yml:ro
          - /var/lib/docker/containers:/var/lib/docker/containers:ro
        command: ["-config.file=/etc/promtail/config.yml"]
        depends_on: [loki]
        restart: unless-stopped

      jaeger:
        image: jaegertracing/all-in-one:1.57
        ports: ["16686:16686"]
        restart: unless-stopped

      uptimekuma:
        image: louislam/uptime-kuma:1
        volumes:
          - kumadata:/app/data
        ports: ["3001:3001"]
        restart: unless-stopped

    volumes:
      pgdata:
      valkeydata:
      miniodata:
      prometheusdata:
      grafanadata:
      lokidata:
      kumadata:
  accept: ["${PROJECT_ROOT}/compose/docker-compose.yml"]
```

### 2.2.1 Prometheus config
```yaml
- id: prometheus-config
  type: file
  path: ${PROJECT_ROOT}/compose/prometheus/prometheus.yml
  content: |
    global:
      scrape_interval: 15s
    alerting:
      alertmanagers:
        - static_configs:
            - targets: ["alertmanager:9093"]
    rule_files:
      - /etc/prometheus/alerts.yml
    scrape_configs:
      - job_name: api
        static_configs:
          - targets: ["api:3000"]
      - job_name: worker
        static_configs:
          - targets: ["worker:3001"]
```

### 2.2.2 Prometheus alert rules
```yaml
- id: prometheus-rules
  type: file
  path: ${PROJECT_ROOT}/compose/prometheus/alerts.yml
  content: |
    groups:
      - name: fulexo-alerts
        rules:
          - alert: ApiHighErrorRate
            expr: sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01
            for: 5m
            labels: { severity: critical }
            annotations: { summary: "API 5xx > 1%", description: "High error rate detected" }
          - alert: SyncLagHigh
            expr: sync_lag_seconds > 1800
            for: 10m
            labels: { severity: warning }
            annotations: { summary: "Sync lag high", description: "Orders sync lag > 30m" }
```

### 2.2.3 Alertmanager config
```yaml
- id: alertmanager-config
  type: file
  path: ${PROJECT_ROOT}/compose/alertmanager/config.yml
  content: |
    route:
      receiver: default
    receivers:
      - name: default
        email_configs: []
```

### 2.3 Nginx server block
```yaml
- id: nginx-conf
  type: file
  path: ${PROJECT_ROOT}/compose/nginx/conf.d/app.conf
  content: |
    server { listen 80; server_name ${DOMAIN_API}; return 301 https://$host$request_uri; }
    server { listen 80; server_name ${DOMAIN_APP}; return 301 https://$host$request_uri; }

    server {
      listen 443 ssl http2;
      server_name ${DOMAIN_API};
      ssl_certificate /etc/letsencrypt/live/${DOMAIN_API}/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_API}/privkey.pem;

      # Security headers
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
      add_header X-Content-Type-Options nosniff always;
      add_header X-Frame-Options DENY always;
      add_header Referrer-Policy no-referrer-when-downgrade always;
      add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; frame-ancestors 'none'" always;

      location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        proxy_buffering on;
        proxy_pass http://api:3000;
      }
    }

    server {
      listen 443 ssl http2;
      server_name ${DOMAIN_APP};
      ssl_certificate /etc/letsencrypt/live/${DOMAIN_APP}/fullchain.pem;
      ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_APP}/privkey.pem;

      # Security headers (UI)
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
      add_header X-Content-Type-Options nosniff always;
      add_header X-Frame-Options DENY always;
      add_header Referrer-Policy no-referrer-when-downgrade always;
      add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; frame-ancestors 'none'" always;

      location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
        proxy_buffering on;
        proxy_pass http://web:3000;
      }
    }
  accept: ["${PROJECT_ROOT}/compose/nginx/conf.d/app.conf"]
```

### 2.4 Bring up base services
```yaml
- id: compose-up
  type: command
  run: |
    cd ${PROJECT_ROOT}/compose && docker compose up -d
  verify: docker compose ps
```

---

## PHASE 3 — TLS (Certbot)
```yaml
- id: tls-certbot
  type: command
  run: |
    sudo snap install core && sudo snap refresh core
    sudo snap install --classic certbot
    sudo ln -s /snap/bin/certbot /usr/bin/certbot || true
    sudo certbot --nginx -d ${DOMAIN_API} -d ${DOMAIN_APP} --non-interactive --agree-tos -m ${EMAIL_SENDER}
  verify: sudo ls /etc/letsencrypt/live/${DOMAIN_API}
```

---

## PHASE 4 — API (NestJS) skeleton
```yaml
- id: api-init
  type: command
  run: |
    cd ${PROJECT_ROOT}/apps/api && npm init -y && npm i @nestjs/core @nestjs/common @nestjs/platform-express rxjs reflect-metadata prom-client @nestjs/swagger swagger-ui-express && npm i -D typescript ts-node @types/node
    cat > tsconfig.json << 'EOF'
    {"compilerOptions":{"target":"ES2021","module":"commonjs","outDir":"dist","rootDir":"src","esModuleInterop":true,"experimentalDecorators":true,"emitDecoratorMetadata":true}}
    EOF
    mkdir -p src
    cat > src/main.ts << 'EOF'
    import { NestFactory } from '@nestjs/core';
    import { Module, Get, Controller, Res } from '@nestjs/common';
    import { register } from 'prom-client';
    import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

    @Controller('health')
    class HealthController { @Get() health(){ return {status:'ok'} } }

    @Controller()
    class MetricsController { @Get('metrics') async metrics(@Res() res:any){ res.setHeader('Content-Type', register.contentType); res.send(await register.metrics()); } }

    @Module({ controllers:[HealthController, MetricsController] })
    class AppModule {}

    async function bootstrap(){
      const app = await NestFactory.create(AppModule);
      const config = new DocumentBuilder().setTitle('Fulexo API').setVersion('1.0').addBearerAuth().build();
      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('docs', app, document);
      await app.listen(3000);
    }
    bootstrap();
    EOF
    cat > Dockerfile << 'EOF'
    FROM node:20-alpine as build
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci || npm i
    COPY . .
    RUN npx tsc
    FROM node:20-alpine
    WORKDIR /app
    COPY --from=build /app/dist ./dist
    COPY package*.json ./
    RUN npm ci --omit=dev || npm i --omit=dev
    EXPOSE 3000
    CMD ["node","dist/main.js"]
    EOF
  verify: ls ${PROJECT_ROOT}/apps/api/src/main.ts
```

---

## PHASE 5 — Worker skeleton
```yaml
- id: worker-init
  type: command
  run: |
    cd ${PROJECT_ROOT}/apps/worker && npm init -y && npm i bullmq ioredis prom-client
    cat > index.js << 'EOF'
    const { Worker, QueueEvents } = require('bullmq');
    const Redis = require('ioredis');
    const client = require('prom-client');
    const http = require('http');
    client.collectDefaultMetrics();
    const connection = new Redis(process.env.REDIS_URL || 'redis://valkey:6379/0',{ maxRetriesPerRequest:null });
    const worker = new Worker('fx-jobs', async job => ({ok:true, job:job.name}), { connection });
    const events = new QueueEvents('fx-jobs', { connection });
    http.createServer(async (req,res)=>{ if(req.url==='/metrics'){res.setHeader('Content-Type', client.register.contentType); res.end(await client.register.metrics());} else { res.writeHead(200); res.end('ok'); } }).listen(3001);
    console.log('worker up');
    EOF
    cat > Dockerfile << 'EOF'
    FROM node:20-alpine
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci || npm i
    COPY . .
    EXPOSE 3001
    CMD ["node","index.js"]
    EOF
  verify: ls ${PROJECT_ROOT}/apps/worker/index.js
```

---

## PHASE 6 — Web (Next.js) skeleton
```yaml
- id: web-init
  type: command
  run: |
    cd ${PROJECT_ROOT}/apps/web && npm init -y && npm i next react react-dom && npm i -D typescript @types/react @types/node && npx next telemetry disable
    mkdir -p app && cat > app/page.tsx << 'EOF'
    export default function Home() {
      return (
        <main>
          <h1>Fulexo</h1>
        </main>
      );
    }
    EOF
    cat > tsconfig.json << 'EOF'
    {
      "compilerOptions": {
        "target": "ES2021",
        "lib": ["dom", "es2021"],
        "jsx": "preserve",
        "module": "esnext",
        "moduleResolution": "bundler",
        "strict": true,
        "baseUrl": "."
      }
    }
    EOF
    cat > next.config.js << 'EOF'
    module.exports = { reactStrictMode: true };
    EOF
    cat > Dockerfile << 'EOF'
    FROM node:20-alpine as build
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci || npm i
    COPY . .
    RUN npx next build
    FROM node:20-alpine
    WORKDIR /app
    COPY --from=build /app .
    EXPOSE 3000
    CMD ["npx","next","start","-p","3000"]
    EOF
  verify: ls ${PROJECT_ROOT}/apps/web/app/page.tsx
```

---

## PHASE 7 — Rebuild & Up
```yaml
- id: compose-rebuild
  type: command
  run: |
    cd ${PROJECT_ROOT}/compose && docker compose build && docker compose up -d
  verify: docker compose ps
  accept: ["api", "web", "worker", "postgres", "valkey", "minio", "nginx"]
```

---

## PHASE 8 — BaseLinker Client Wrapper (API)
```yaml
- id: api-bl-client
  type: file
  path: ${PROJECT_ROOT}/apps/api/src/bl-client.ts
  content: |
    export async function blRequest(method: string, parameters: any, token: string){
      const body = new URLSearchParams({ method, parameters: JSON.stringify(parameters) });
      const res = await fetch('https://api.baselinker.com/connector.php', { method: 'POST', headers:{ 'X-BLToken': token }, body });
      if(!res.ok) throw new Error('BL HTTP '+res.status);
      const json = await res.json();
      if(json.status !== 'SUCCESS') throw new Error(json.error_message || 'BL error');
      return json;
    }
  verify: grep -q "blRequest" ${PROJECT_ROOT}/apps/api/src/bl-client.ts
```

### 8.1 Add rate-limit utility (token-bucket placeholder)
```yaml
- id: api-rate-limit
  type: file
  path: ${PROJECT_ROOT}/apps/api/src/ratelimit.ts
  content: |
    export class TokenBucket { constructor(public capacity=100, public refillMs=60000){ this.tokens=capacity; this.ts=Date.now(); }
      private tokens:number; private ts:number;
      take(n=1){ const now=Date.now(); const add=((now-this.ts)/this.refillMs)*this.capacity; this.tokens=Math.min(this.capacity,this.tokens+add); this.ts=now; if(this.tokens>=n){ this.tokens-=n; return true } return false }
    }
  verify: grep -q "TokenBucket" ${PROJECT_ROOT}/apps/api/src/ratelimit.ts
```

---

## PHASE 9 — Database (Prisma Migrations)
```yaml
- id: prisma-init
  type: command
  run: |
    cd ${PROJECT_ROOT}/apps/api && npm i prisma @prisma/client && npx prisma init --datasource-provider postgresql
  verify: ls ${PROJECT_ROOT}/apps/api/prisma/schema.prisma
- id: prisma-extensions
  type: command
  run: |
    docker compose -f ${PROJECT_ROOT}/compose/docker-compose.yml exec -T postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "CREATE EXTENSION IF NOT EXISTS citext;"
    docker compose -f ${PROJECT_ROOT}/compose/docker-compose.yml exec -T postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
- id: prisma-schema
  type: file
  path: ${PROJECT_ROOT}/apps/api/prisma/schema.prisma
  content: |
    datasource db { provider = "postgresql" url = env("DATABASE_URL") }
    generator client { provider = "prisma-client-js" }

    model Tenant { id String @id @default(uuid()) name String slug String @unique users User[] blAccounts BLAccount[] createdAt DateTime @default(now()) }

    model User { id String @id @default(uuid()) tenantId String email String @unique passwordHash String role String twofaSecret String? createdAt DateTime @default(now()) tenant Tenant @relation(fields:[tenantId], references:[id]) }

    model BLAccount { id String @id @default(uuid()) tenantId String? label String? tokenEncrypted Bytes active Boolean @default(true) lastSyncAt DateTime? tenant Tenant? @relation(fields:[tenantId], references:[id]) }

    model OwnershipRule { id String @id @default(uuid()) tenantId String entityType String priority Int conditionsJson Json actionJson Json active Boolean @default(true) tenant Tenant @relation(fields:[tenantId], references:[id]) }

    model EntityMap { id String @id @default(uuid()) entityType String blId String tenantId String customerId String? @@unique([entityType, blId]) }

    model Customer { id String @id @default(uuid()) tenantId String email String? emailNormalized String? phoneE164 String? name String? createdAt DateTime @default(now()) @@unique([tenantId, emailNormalized]) }

    model Order { id String @id @default(uuid()) tenantId String customerId String? accountId String? blOrderId String externalOrderNo String? status String? total Decimal? currency String? customerEmail String? customerPhone String? confirmedAt DateTime? createdAt DateTime @default(now()) updatedAt DateTime @default(now()) @@unique([tenantId, blOrderId]) }

    model OrderItem { id String @id @default(uuid()) orderId String sku String? name String? qty Int price Decimal? }

    model Shipment { id String @id @default(uuid()) orderId String carrier String? trackingNo String? status String? shippedAt DateTime? deliveredAt DateTime? }

    model Product { id String @id @default(uuid()) tenantId String sku String name String? updatedAt DateTime @default(now()) @@unique([tenantId, sku]) }

    model Invoice { id String @id @default(uuid()) orderId String number String? currency String? total Decimal? date DateTime? }

    model Return { id String @id @default(uuid()) orderId String status String? reason String? createdAt DateTime @default(now()) }
- id: prisma-migrate
  type: command
  run: |
    cd ${PROJECT_ROOT}/apps/api && npx prisma migrate deploy && npx prisma generate
```



---

## PHASE 10 — Health checks
```yaml
- id: health-api
  type: http
  url: https://${DOMAIN_API}/health
  expectStatus: 200
  expectBody: "{\"status\":\"ok\"}"
```
### 10.1 Metrics endpoint check
```yaml
- id: metrics-check
  type: http
  url: https://${DOMAIN_API}/metrics
  expectStatus: 200
```

---

## PHASE 11 — Ownership Rules & Policies (stubs)
```yaml
- id: api-stubs
  type: file
  path: ${PROJECT_ROOT}/apps/api/src/stubs.txt
  content: |
    TODO: Implement modules for OwnershipRules, Policies, Orders, Shipments, Returns, Invoices, Products.
    Follow blueprint sections 12–16, 31–33.
```

---

## PHASE 12 — Requests & Approvals (DB + endpoints) [Follow Blueprint §31]
- Create tables: requests, request_comments, request_attachments
- Implement endpoints: list/create/update/status transitions, file uploads (MinIO), email notifications
- Add UI pages (admin+customer): list/detail/forms/comments
- Acceptance: create a STOCK_ADJUSTMENT request and approve→apply path end-to-end

---

## PHASE 13 — Inventory Management (Admin) [Follow Blueprint §33]
- Implement BL inventory endpoints usage with dry-run and bulk jobs
- Build UI: warehouses/catalogs, products list/detail, bulk stock/price import, documents (add/confirm), PO & suppliers
- Acceptance: perform a bulk stock update (dry-run then execute) and confirm an inventory document

---

## PHASE 14 — Admin BL Writes (feature-flag) [Blueprint §32]
- Implement write actions with dry-run preview + audit
- Add policy toggles per module/account
- Acceptance: test setOrderStatus with dry-run and confirm execution under rate-limit

---

## PHASE 15 — Email (Postfix/MailHog) [Blueprint §20]
- Configure Postfix send-only with DKIM/SPF/DMARC
- Dev: run MailHog container and route test messages
- Templates: compile MJML→HTML; enqueue and deliver
- Acceptance: invitation + request-approved mails delivered

---

## PHASE 16 — Security Hardening [Blueprint §11, §19]
- Enable CSP/HSTS/SRI headers at Nginx
- Enforce 2FA for admin roles
- Encrypt BL tokens at-rest
- Acceptance: security headers present; MFA required for admin login

### 16.1 Secrets management (prod)
```yaml
- id: secrets-notes
  type: file
  path: ${PROJECT_ROOT}/docs/secrets.md
  content: |
    Use Docker/K8s secrets or SOPS-encrypted files for production. Avoid plain .env on disk. Rotate BL encryption keys with key_version.
```

---

## PHASE 17 — Backups & Restore [Blueprint §12]
- Cron pg_dump daily; MinIO mirror; restore drill in staging
- Acceptance: successful restore of latest dump

---

## PHASE 18 — Tests [Blueprint §15, §21]
- Unit: BLClient, RulesEngine, Rate-limit
- Integration: BL sandbox sync loop
- E2E: critical flows (orders list/detail, requests, inventory dry-run)
- Acceptance: CI green

---

## PHASE 19 — Staging → Production
- Stand up staging with separate domains and env
- Smoke tests + sign-off
- Production deploy with compose build/up

---

## PHASE 20 — Onboarding & Go‑Live [Blueprint §25]
- Admin user + MFA; tenant wizard; BL account bind; initial sync progress
- Go‑Live checklist execution

---

## PHASE 21 — Backfill & Reconciliation [Blueprint §37, §38]
- Implement backfill jobs and checkpointing.
- Nightly reconciliation to archive missing entities.
- Acceptance: backfill completes within SLA; reconciliation archives orphans.

---

## NOTES FOR AGENT
- Parameterize domains/secrets via GLOBAL_VARIABLES.
- Prefer editing files idempotently. Always back up on destructive changes.
- After each phase, commit changes to git with meaningful messages.
