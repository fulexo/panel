# Karrio Integration Master Blueprint

**Version:** 10.1  
**Date:** 2025-09-30  
**Author:** AI Assistant  
**Status:** IMPLEMENTATION_READY

**Changes in this version:**
- Re-structured the entire document to be a single, numbered list of steps.
- Merged the different phases into a single, sequential flow.
- **Corrected worker implementation (Step 5) to follow microservice architecture.**
- **Clarified environment variable naming conventions (Step 1).**

---

## 1. Introduction

This document is the **final and definitive technical guide** for the deep integration of the Karrio shipping gateway into the Fulexo platform, superseding all previous versions. It is based on a comprehensive, file-level analysis of both the Fulexo and Karrio codebases. 

The **vision** is to transform Fulexo's fulfillment capabilities by replacing the current manual shipment process with a fully automated, scalable, and multi-carrier logistics engine. This will be achieved by adopting a **decoupled microservice architecture**, running Karrio as a managed service within the Fulexo ecosystem.

### User Account Model

It is important to note that all shipping operations will be performed under a single, centralized Karrio admin account. Your customers will not have direct access to the Karrio dashboard or your Karrio account. Your backend will act as an abstraction layer, using a single API token to communicate with the Karrio API on behalf of your users.

### User Flow Diagram

```mermaid
graph TD
    subgraph Your Panel
        A[Order Detail Page] -->|Click "Create Shipment"| B(Multi-Step Modal);
        B --> C{Step 1: Enter Parcel Info};
        C -->|Submit| D[Get Rates];
        D --> E{Step 2: Display Rates};
        E -->|Select Rate| F[Create Shipment];
        F --> G{Step 3: Display Label};
        G --> H[Print Label];
    end

    subgraph Your Backend
        D -->|Request Rates| I(GET /shipments/rates);
        I -->|Call Karrio API| J[KarrioService.getRates];
        F -->|Create Shipment| K(POST /shipments);
        K -->|Call Karrio API| L[KarrioService.createShipment];
    end

    subgraph Karrio API
        J --> M{POST /v1/proxy/rates};
        L --> N{POST /v1/proxy/shipping};
    end

    subgraph Background Jobs
        P[Periodically] --> Q(shipment-tracking-update job);
        Q -->|For each shipped shipment| R[Call Fulexo API Track Endpoint];
        R -->|API calls KarrioService| S[KarrioService.trackShipment];
        S -->|Call Karrio API| T{GET /v1/proxy/tracking/:carrier/::tracking_number};
        T -->|Update DB| U[Update Shipment Status];
    end

    A --> V(View Shipment Status);
    U --> V;
```

---

## 2. Implementation Steps

### Step 1: Infrastructure Setup

1.  **Update `compose/docker-compose.yml`:**
    - The following configuration is the final version, integrating Karrio into Fulexo's existing Docker Compose setup.

    ```yaml
    # compose/docker-compose.yml

    version: "3.9"

    networks:
      fulexo-network:
        driver: bridge

    services:
      # --- FULEXO SERVICES START ---
      nginx:
        image: nginx:1.25
        volumes:
          - ./nginx/conf.d:/etc/nginx/conf.d:ro
          - /etc/letsencrypt:/etc/letsencrypt:ro
        ports: ["80:80", "443:443"]
        depends_on: [api, web]
        restart: unless-stopped
        environment:
          - DOMAIN_API=${DOMAIN_API}
          - DOMAIN_APP=${DOMAIN_APP}
        command: >
          sh -c "
            envsubst '$$DOMAIN_API $$DOMAIN_APP' < /etc/nginx/conf.d/app.conf.template > /etc/nginx/conf.d/app.conf &&
            nginx -g 'daemon off;'
          "
        networks:
          - fulexo-network

      postgres:
        image: postgres:16
        environment:
          POSTGRES_DB: ${POSTGRES_DB}
          POSTGRES_USER: ${POSTGRES_USER}
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
        volumes:
          - pgdata:/var/lib/postgresql/data
        ports:
          - "5433:5432"
        restart: unless-stopped
        networks:
          - fulexo-network

      valkey:
        image: valkey/valkey:7
        command: ["valkey-server", "--appendonly", "yes"]
        volumes:
          - valkeydata:/data
        ports:
          - "6380:6379"
        restart: unless-stopped
        networks:
          - fulexo-network

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
        networks:
          - fulexo-network

      api:
        build: 
          context: ..
          dockerfile: apps/api/Dockerfile
          args:
            - NODE_ENV=production
        env_file: ${ENV_FILE:-.env}
        environment:
          DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
          REDIS_URL: ${REDIS_URL}
          S3_ENDPOINT: ${S3_ENDPOINT}
          S3_ACCESS_KEY: ${S3_ACCESS_KEY}
          S3_SECRET_KEY: ${S3_SECRET_KEY}
          S3_BUCKET: ${S3_BUCKET}
          JWT_SECRET: ${JWT_SECRET}
          ENCRYPTION_KEY: ${ENCRYPTION_KEY}
          MASTER_KEY_HEX: ${MASTER_KEY_HEX}
          DOMAIN_API: ${DOMAIN_API}
          DOMAIN_APP: ${DOMAIN_APP}
          FRONTEND_URL: ${FRONTEND_URL}
          WEB_URL: ${WEB_URL}
          NODE_ENV: ${NODE_ENV}
          KARRIO_API_URL: http://karrio-server:5002
          FULEXO_TO_KARRIO_API_TOKEN: ${FULEXO_TO_KARRIO_API_TOKEN}
        depends_on: [postgres, valkey, minio]
        restart: unless-stopped
        networks:
          - fulexo-network

      web:
        build:
          context: ..
          dockerfile: apps/web/Dockerfile
          args:
            - NODE_ENV=production
        env_file: ${ENV_FILE:-.env}
        environment:
          NODE_ENV: ${NODE_ENV}
          NEXT_PUBLIC_API_BASE: ${NEXT_PUBLIC_API_BASE}
          NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
          FRONTEND_URL: ${FRONTEND_URL}
          WEB_URL: ${WEB_URL}
          SHARE_BASE_URL: ${SHARE_BASE_URL}
        depends_on: [api]
        restart: unless-stopped
        ports:
          - "3001:3000"
        networks:
          - fulexo-network

      worker:
        build:
          context: ..
          dockerfile: apps/worker/Dockerfile
          args:
            - NODE_ENV=production
        env_file: ${ENV_FILE:-.env}
        environment:
          DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
          REDIS_URL: ${REDIS_URL}
          NODE_ENV: ${NODE_ENV}
          FULEXO_API_URL: http://api:3000
          KARRIO_API_URL: http://karrio-server:5002
          FULEXO_TO_KARRIO_API_TOKEN: ${FULEXO_TO_KARRIO_API_TOKEN}
          FULEXO_INTERNAL_API_TOKEN: ${FULEXO_INTERNAL_API_TOKEN}
        ports: ["3002:3002"]
        depends_on: [postgres, valkey, api]
        restart: unless-stopped
        networks:
          - fulexo-network

      prometheus:
        image: prom/prometheus:latest
        volumes:
          - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
          - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
          - prometheusdata:/prometheus
        restart: unless-stopped
        networks:
          - fulexo-network

      alertmanager:
        image: prom/alertmanager:latest
        volumes:
          - ./alertmanager/config.yml:/etc/alertmanager/config.yml:ro
        ports: ["9093:9093"]
        depends_on: [prometheus]
        restart: unless-stopped
        networks:
          - fulexo-network

      grafana:
        image: grafana/grafana:latest
        volumes:
          - grafanadata:/var/lib/grafana
        environment:
          GF_SECURITY_ADMIN_PASSWORD: ${GF_SECURITY_ADMIN_PASSWORD}
        ports: ["3003:3000"]
        depends_on: [prometheus]
        restart: unless-stopped
        networks:
          - fulexo-network

      loki:
        image: grafana/loki:2.9.0
        volumes:
          - ./loki/config.yml:/etc/loki/config.yml:ro
          - lokidata:/loki
        command: ["-config.file=/etc/loki/config.yml"]
        restart: unless-stopped
        networks:
          - fulexo-network

      promtail:
        image: grafana/promtail:3.0.0
        volumes:
          - ./promtail/config.yml:/etc/promtail/config.yml:ro
          - /var/lib/docker/containers:/var/lib/docker/containers:ro
        command: ["-config.file=/etc/promtail/config.yml"]
        depends_on: [loki]
        restart: unless-stopped
        networks:
          - fulexo-network

      jaeger:
        image: jaegertracing/all-in-one:1.57
        ports: ["16686:16686"]
        restart: unless-stopped
        networks:
          - fulexo-network

  uptimekuma:
    image: louislam/uptime-kuma:1
    volumes:
      - kumadata:/app/data
    ports: ["3004:3001"]
    restart: unless-stopped
    networks:
      - fulexo-network

      node-exporter:
        image: prom/node-exporter:latest
        volumes:
          - /proc:/host/proc:ro
          - /sys:/host/sys:ro
          - /:/rootfs:ro
        command:
          - '--path.procfs=/host/proc'
          - '--path.rootfs=/rootfs'
          - '--path.sysfs=/host/sys'
          - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
        ports: ["9100:9100"]
        restart: unless-stopped
        networks:
          - fulexo-network

      cadvisor:
        image: gcr.io/cadvisor/cadvisor:latest
        volumes:
          - /:/rootfs:ro
          - /var/run:/var/run:ro
          - /sys:/sys:ro
          - /var/lib/docker/:/var/lib/docker:ro
          - /dev/disk/:/dev/disk:ro
        ports: ["8080:8080"]
        restart: unless-stopped
        privileged: true
        devices:
          - /dev/kmsg
        networks:
          - fulexo-network
      # --- FULEXO SERVICES END ---

      # --- KARRIO SERVICES START ---
      karrio-db:
        image: postgres:13-alpine
        container_name: karrio-db
        volumes:
          - karrio_db_data:/var/lib/postgresql/data
        environment:
          - POSTGRES_USER=${KARRIO_POSTGRES_USER:-karrio}
          - POSTGRES_PASSWORD=${KARRIO_POSTGRES_PASSWORD:-karrio}
          - POSTGRES_DB=${KARRIO_POSTGRES_DB:-karrio}
        networks:
          - fulexo-network
        restart: always
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
          interval: 10s
          timeout: 5s
          retries: 5

      karrio-redis:
        image: redis:6.2-alpine
        container_name: karrio-redis
        volumes:
          - karrio_redis_data:/data
        networks:
          - fulexo-network
        restart: always

      karrio-server:
        build:
          context: ../karrio
          dockerfile: ./docker/api/Dockerfile
        container_name: karrio-server
        ports:
          - "5002:5002"
        environment:
          # --- Sourced from root .env file ---
          - SECRET_KEY=${KARRIO_SECRET_KEY}
          - DATABASE_URL=postgres://${KARRIO_POSTGRES_USER:-karrio}:${KARRIO_POSTGRES_PASSWORD:-karrio}@karrio-db:5432/${KARRIO_POSTGRES_DB:-karrio}
          - REDIS_URL=redis://karrio-redis:6379/1
          - ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
          - ADMIN_PASSWORD=${ADMIN_PASSWORD:-changeme}
          - ALLOWED_HOSTS=${KARRIO_ALLOWED_HOSTS:-localhost,127.0.0.1,karrio-server}
          - CORS_ALLOWED_ORIGINS=${KARRIO_CORS_ALLOWED_ORIGINS:-http://localhost:3001,http://localhost:5001}
          - KARRIO_ADMIN_URL=http://localhost:5001
          # --- Carrier Credentials ---
          - UPS_USERNAME=${UPS_USERNAME}
          - UPS_PASSWORD=${UPS_PASSWORD}
          - UPS_ACCESS_LICENSE_NUMBER=${UPS_ACCESS_LICENSE_NUMBER}
        depends_on:
          karrio-db:
            condition: service_healthy
          karrio-redis:
            condition: service_started
        networks:
          - fulexo-network
        restart: always

      karrio-dashboard:
        build:
          context: ../karrio
          dockerfile: ./docker/dashboard/Dockerfile
        container_name: karrio-dashboard
        ports:
          - "5001:3002"
        environment:
          - NEXT_PUBLIC_KARRIO_API_URL=http://localhost:5002
        depends_on:
          - karrio-server
        networks:
          - fulexo-network
        restart: always
      # --- KARRIO SERVICES END ---

volumes:
  pgdata:
  valkeydata:
  miniodata:
  prometheusdata:
  grafanadata:
  lokidata:
  kumadata:
  karrio_db_data:
  karrio_redis_data:

networks:
  fulexo-network:
    driver: bridge
    ```

2.  **Update `.env.example`:**
    - Add these variables to your `.env.example` file. Generate strong random values for secrets.

    ```bash
    # ----------------------------------------------------------------------
    # FULEXO CORE SETTINGS
    # Note: These variables are for the main Fulexo database.
    # They are prefixed with FULEXO_ to avoid conflicts with Karrio's DB.
    # ----------------------------------------------------------------------
    POSTGRES_USER=fulexo_user
    POSTGRES_PASSWORD=your_secure_postgres_password
    POSTGRES_DB=fulexo
    FULEXO_API_URL=http://localhost:3000

    # ----------------------------------------------------------------------
    # KARRIO INTEGRATION - ADD THIS SECTION
    # ----------------------------------------------------------------------
    # Core Karrio Settings
    KARRIO_SECRET_KEY= # Generate a 50+ char random string
    KARRIO_POSTGRES_USER=karrio
    KARRIO_POSTGRES_PASSWORD= # Generate a strong password
    KARRIO_POSTGRES_DB=karrio
    KARRIO_ALLOWED_HOSTS=localhost,127.0.0.1,karrio-server
    KARRIO_CORS_ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5001
    ADMIN_EMAIL=admin@fulexo.com
    ADMIN_PASSWORD= # Set a secure initial password for Karrio admin

    # Fulexo <-> Karrio Authentication
    # This token will be created within Karrio and used by Fulexo to authenticate.
    FULEXO_TO_KARRIO_API_TOKEN= # Generate a secure token, e.g., using `openssl rand -hex 32`

    # Internal Fulexo Authentication (Worker <-> API)
    # Secure token for internal service-to-service communication.
    FULEXO_INTERNAL_API_TOKEN= # Generate a secure token, e.g., using `openssl rand -hex 32`

    # Carrier Credentials (Example for UPS)
    UPS_USERNAME=
    UPS_PASSWORD=
    UPS_ACCESS_LICENSE_NUMBER=
    # Add other carrier variables as needed
    ```

3.  **Update Nginx Configuration:**
    - Add the following server blocks to your `nginx/conf.d/app.conf.template` file to expose the Karrio dashboard and API.

    ```nginx
    # nginx/nginx.conf

    # ... existing http block

        # Karrio API Server Configuration (karrio.fulexo.com)
        server {
            listen 80;
            listen [::]:80;
            server_name karrio.fulexo.com;
            
            return 301 https://$server_name$request_uri;
        }

        server {
            listen 443 ssl http2;
            listen [::]:443 ssl http2;
            server_name karrio.fulexo.com;

            # SSL Configuration
            ssl_certificate /etc/letsencrypt/live/karrio.fulexo.com/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/karrio.fulexo.com/privkey.pem;
            ssl_protocols TLSv1.2 TLSv1.3;
            ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
            ssl_prefer_server_ciphers off;
            ssl_session_cache shared:SSL:10m;
            ssl_session_timeout 10m;

            location / {
                proxy_pass http://karrio-server:5002;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
        }

        # Karrio Dashboard Configuration (dashboard.karrio.fulexo.com)
        server {
            listen 80;
            listen [::]:80;
            server_name dashboard.karrio.fulexo.com;
            
            return 301 https://$server_name$request_uri;
        }

        server {
            listen 443 ssl http2;
            listen [::]:443 ssl http2;
            server_name dashboard.karrio.fulexo.com;

            # SSL Configuration
            ssl_certificate /etc/letsencrypt/live/dashboard.karrio.fulexo.com/fullchain.pem;
            ssl_certificate_key /etc/letsencrypt/live/dashboard.karrio.fulexo.com/privkey.pem;
            ssl_protocols TLSv1.2 TLSv1.3;
            ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
            ssl_prefer_server_ciphers off;
            ssl_session_cache shared:SSL:10m;
            ssl_session_timeout 10m;

            location / {
                proxy_pass http://karrio-dashboard:3002;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
            }
        }

    # ... rest of http block
    ```

4.  **Verification:**
    1.  Create a new feature branch: `git checkout -b feature/karrio-integration-final`.
    2.  Modify `compose/docker-compose.yml` exactly as specified in **Step 1.1**.
    3.  Add the new variables from **Step 1.2** to your local `.env` file (sourcing secrets from a password manager or secure store).
    4.  Modify `nginx/conf.d/app.conf.template` as specified in **Step 1.3**.
    5.  Run `docker-compose up --build` and verify that all services start without errors.
    6.  Access the Karrio dashboard at `http://localhost:5001` and create the API Token for Fulexo. Place this token in the `.env` file for the `FULEXO_TO_KARRIO_API_TOKEN` variable.

### Step 2: Database Extension

1.  **Update `schema.prisma`:**
    - Add the following fields to the `Shipment` model in `apps/api/prisma/schema.prisma`:

    ```prisma
    // apps/api/prisma/schema.prisma

    model Shipment {
      id          String   @id @default(uuid())
      orderId     String
      tenantId    String
      
      carrier     String?
      trackingNo  String?
      status      String?
      labelUrl    String?
      protocolUrl String?
      weight      Decimal? @db.Decimal(10,3)
      dimensions  Json?
      shippedAt   DateTime?
      deliveredAt DateTime?
      createdAt   DateTime @default(now())
      updatedAt   DateTime @updatedAt
      order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
      tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

      karrioShipmentId String?
      trackingUrl      String?
      rate             Json?
      meta             Json?
      
      @@index([trackingNo])
      @@index([orderId])
      @@index([tenantId, status])
      @@index([tenantId, carrier])
      @@index([tenantId, createdAt])
      @@index([tenantId, status, createdAt])
      @@index([carrier])
      @@index([status])
      @@index([shippedAt])
      @@index([deliveredAt])
    }
    ```

2.  **Apply Database Migrations:**
    - Run the following command to apply the database migrations:
    ```bash
    npx prisma migrate dev --name added_karrio_fields_to_shipment
    ```

### Step 3: Backend Implementation

1.  **Install Dependencies:**
    - Install the `@nestjs/axios` package in the `api` app:
    ```bash
    cd apps/api
    npm install @nestjs/axios
    ```

2.  **Create `KarrioModule` and `KarrioService`:**
    - Create a new directory `apps/api/src/karrio`.
    - Create a new file `apps/api/src/karrio/karrio.module.ts`:
    ```typescript
    // apps/api/src/karrio/karrio.module.ts
    import { Module } from '@nestjs/common';
    import { HttpModule } from '@nestjs/axios';
    import { KarrioService } from './karrio.service';

    @Module({
      imports: [HttpModule],
      providers: [KarrioService],
      exports: [KarrioService],
    })
    export class KarrioModule {}
    ```
    - Create a new file `apps/api/src/karrio/karrio.service.ts`:
    ```typescript
    // apps/api/src/karrio/karrio.service.ts
    import { HttpService } from '@nestjs/axios';
    import { Injectable, Logger, HttpException } from '@nestjs/common';
    import { ConfigService } from '@nestjs/config';
    import { firstValueFrom } from 'rxjs';
    import { catchError } from 'rxjs/operators';

    @Injectable()
    export class KarrioService {
      private readonly logger = new Logger(KarrioService.name);
      private readonly karrioApiUrl = this.configService.get<string>('KARRIO_API_URL');
      private readonly apiToken = this.configService.get<string>('FULEXO_TO_KARRIO_API_TOKEN');

      constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
      ) {}

      private getHeaders() {
        return {
          'Authorization': `Token ${this.apiToken}`,
          'Content-Type': 'application/json',
        };
      }

      async getRates(payload: any): Promise<any> {
        const url = `${this.karrioApiUrl}/v1/proxy/rates`;
        this.logger.debug(`Requesting rates from Karrio for reference: ${payload.reference}`);
        const { data } = await firstValueFrom(
          this.httpService.post(url, payload, { headers: this.getHeaders() }).pipe(
            catchError((error) => {
              this.logger.error('Karrio rate request failed!', error.response?.data);
              throw new HttpException('Failed to get rates from carrier.', error.response?.status || 500);
            }),
          ),
        );
        return data;
      }

      async createShipment(payload: any): Promise<any> {
        const url = `${this.karrioApiUrl}/v1/proxy/shipping`;
        this.logger.debug(`Creating shipment with Karrio for reference: ${payload.reference}`);
        const { data } = await firstValueFrom(
          this.httpService.post(url, payload, { headers: this.getHeaders() }).pipe(
            catchError((error) => {
              this.logger.error('Karrio shipment creation failed!', error.response?.data);
              throw new HttpException('Failed to create shipment.', error.response?.status || 500);
            }),
          ),
        );
        return data;
      }

      async trackShipment(carrierName: string, trackingNumber: string): Promise<any> {
        const url = `${this.karrioApiUrl}/v1/proxy/tracking/${carrierName}/${trackingNumber}`;
        this.logger.debug(`Tracking shipment with Karrio: ${carrierName}/${trackingNumber}`);
        const { data } = await firstValueFrom(
          this.httpService.get(url, { headers: this.getHeaders() }).pipe(
            catchError((error) => {
              this.logger.error('Karrio shipment tracking failed!', error.response?.data);
              throw new HttpException('Failed to track shipment.', error.response?.status || 500);
            }),
          ),
        );
        return data;
      }
    }
    ```

3.  **Finalize `ShipmentsModule` Refactoring:**
    - **File:** `apps/api/src/shipments/shipments.module.ts`
      - Import and include `KarrioModule`.

    ```typescript
    // apps/api/src/shipments/shipments.module.ts
    import { Module } from '@nestjs/common';
    import { ShipmentsController } from './shipments.controller';
    import { ShipmentsService } from './shipments.service';
    import { PrismaService } from '../prisma.service';
    import { KarrioModule } from '../karrio/karrio.module';

    @Module({
      imports: [KarrioModule],
      controllers: [ShipmentsController],
      providers: [ShipmentsService, PrismaService],
      exports: [ShipmentsService],
    })
    export class ShipmentsModule {}
    ```

    - **File:** `apps/api/src/shipments/shipments.service.ts`
      - Inject `KarrioService` and implement the `_mapOrderToKarrioPayload` function.

    ```typescript
    // apps/api/src/shipments/shipments.service.ts
    import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
    import { PrismaService } from '../prisma.service';
    import { PrismaClient } from '@prisma/client';
    import { Decimal } from 'decimal.js';
    import { toPrismaJsonValue } from '../common/utils/prisma-json.util';
    import { KarrioService } from '../karrio/karrio.service';

    @Injectable()
    export class ShipmentsService {
      constructor(private prisma: PrismaService, private karrio: KarrioService) {}

      private async runTenant<T>(tenantId: string, fn: (db: PrismaClient) => Promise<T>): Promise<T> {
        return this.prisma.withTenant(tenantId, fn);
      }

      // ... existing list, get, create, update, delete, bulkUpdate, bulkDelete methods

      async getRates(tenantId: string, orderId: string, payload: any) {
        const order = await this.runTenant(tenantId, (db) => db.order.findUnique({ where: { id: orderId } }));
        if (!order) throw new NotFoundException('Order not found');

        const karrioPayload = await this._mapOrderToKarrioPayload(tenantId, order, payload.parcels);
        return this.karrio.getRates(karrioPayload);
      }

      async createShipment(tenantId: string, orderId: string, payload: any) {
        const order = await this.runTenant(tenantId, (db) => db.order.findUnique({ where: { id: orderId } }));
        if (!order) throw new NotFoundException('Order not found');

        const karrioPayload = await this._mapOrderToKarrioPayload(tenantId, order, payload.parcels);
        karrioPayload.service = payload.service;
        karrioPayload.label_type = 'PDF';

        const karrioShipment = await this.karrio.createShipment(karrioPayload);

        return this.runTenant(tenantId, (db) =>
          db.shipment.create({
            data: {
              order: { connect: { id: orderId } },
              tenant: { connect: { id: tenantId } },
              carrier: karrioShipment.carrier_name,
              trackingNo: karrioShipment.tracking_number,
              status: karrioShipment.status,
              labelUrl: karrioShipment.label_url,
              trackingUrl: karrioShipment.tracking_url,
              karrioShipmentId: karrioShipment.id,
              rate: toPrismaJsonValue(karrioShipment.selected_rate),
              meta: toPrismaJsonValue(karrioShipment.meta),
            },
          }),
        );
      }

      async track(tenantId: string, carrier: string, trackingNo: string) {
        return this.karrio.trackShipment(carrier, trackingNo);
      }

      private async _mapOrderToKarrioPayload(tenantId: string, order: any, parcels: any[]) {
        const shipperSettings = await this.runTenant(tenantId, (db) =>
          db.settings.findMany({ where: { category: 'shipping_origin' } }),
        );

        const shipper = shipperSettings.reduce((acc, setting) => {
          acc[setting.key.replace('shipping_origin_', '')] = setting.value;
          return acc;
        }, {} as any);

        return {
          shipper: {
            company_name: shipper.company_name,
            address_line1: shipper.address_line1,
            city: shipper.city,
            postal_code: shipper.postal_code,
            country_code: shipper.country_code,
            person_name: shipper.person_name,
            phone: shipper.phone,
          },
          recipient: {
            company_name: order.shippingAddress?.company,
            address_line1: order.shippingAddress?.addressLine1,
            address_line2: order.shippingAddress?.addressLine2,
            city: order.shippingAddress?.city,
            postal_code: order.shippingAddress?.postalCode,
            country_code: order.shippingAddress?.country,
            person_name: `${order.shippingAddress?.firstName} ${order.shippingAddress?.lastName}`,
            phone: order.customerPhone,
            email: order.customerEmail,
          },
          parcels: parcels,
          reference: order.orderNumber,
        };
      }
    }
    ```

    - **File:** `apps/api/src/auth/internal-auth.guard.ts`
      - Create a new internal authentication guard for service-to-service calls.
      
    - **File:** `apps/api/src/auth/auth.module.ts`
      - Add the InternalAuthGuard to the providers array.
      
    - **File:** `apps/api/src/shipments/shipments.controller.ts`
      - Add new endpoints for getting rates, creating shipments, and tracking shipments.
      - Use InternalAuthGuard for the track endpoint to allow worker access.

    ```typescript
    // apps/api/src/auth/internal-auth.guard.ts
    import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

    @Injectable()
    export class InternalAuthGuard implements CanActivate {
      canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          throw new UnauthorizedException('Missing or invalid authorization header');
        }
        
        const token = authHeader.substring(7);
        const expectedToken = process.env.FULEXO_INTERNAL_API_TOKEN;
        
        if (!expectedToken || token !== expectedToken) {
          throw new UnauthorizedException('Invalid internal API token');
        }
        
        // Set a minimal user object for internal requests
        request.user = { 
          id: 'internal-worker', 
          role: 'INTERNAL', 
          tenantId: 'system' 
        };
        
        return true;
      }
    }

    // apps/api/src/auth/auth.module.ts
    import { Module } from '@nestjs/common';
    import { InternalAuthGuard } from './internal-auth.guard';
    // ... existing imports ...

    @Module({
      // ... existing module configuration ...
      providers: [
        // ... existing providers ...
        InternalAuthGuard,
      ],
      exports: [
        // ... existing exports ...
        InternalAuthGuard,
      ],
    })
    export class AuthModule {}

    // apps/api/src/shipments/shipments.controller.ts
    import { Controller, Get, Param, Query, Post, Put, Delete, Body, UseGuards } from '@nestjs/common';
    import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
    import { InternalAuthGuard } from '../auth/internal-auth.guard';
    import { ShipmentsService } from './shipments.service';
    import { CurrentUser } from '../auth/decorators/current-user.decorator';
    import { Roles } from '../auth/decorators/roles.decorator';
    import { AuthenticatedUser } from '../auth/types/user.types';

    @ApiTags('shipments')
    @ApiBearerAuth()
    @Controller('shipments')
    export class ShipmentsController {
      constructor(private readonly shipments: ShipmentsService) {}

      // ... existing list, get, create, update, delete, bulkUpdate, bulkDelete methods

      @Post(':orderId/rates')
      @ApiOperation({ summary: 'Get shipment rates for an order' })
      async getRates(
        @CurrentUser() user: AuthenticatedUser,
        @Param('orderId') orderId: string,
        @Body() payload: any,
      ) {
        return this.shipments.getRates(user.tenantId, orderId, payload);
      }

      @Post(':orderId')
      @ApiOperation({ summary: 'Create a shipment for an order' })
      async createShipment(
        @CurrentUser() user: AuthenticatedUser,
        @Param('orderId') orderId: string,
        @Body() payload: any,
      ) {
        return this.shipments.createShipment(user.tenantId, orderId, payload);
      }

      @Get('track/:carrier/:trackingNo')
      @UseGuards(InternalAuthGuard)
      @ApiOperation({ summary: 'Track a shipment (Internal)' })
      async track(
        @CurrentUser() user: AuthenticatedUser,
        @Param('carrier') carrier: string,
        @Param('trackingNo') trackingNo: string,
      ) {
        return this.shipments.track(user.tenantId, carrier, trackingNo);
      }
    }
    ```

4.  **Verification:**
    - Use `curl` to test the new endpoints:
      - **Get Rates:** `curl -X POST http://localhost:3000/api/shipments/:orderId/rates -H "Content-Type: application/json" -d '{...}'`
      - **Create Shipment:** `curl -X POST http://localhost:3000/api/shipments/:orderId -H "Content-Type: application/json" -d '{...}'`
      - **Track Shipment:** `curl http://localhost:3000/api/shipments/track/ups/1Z...`

### Step 4: Frontend Implementation

1.  **Create "Create Shipment" Button:**
    - In `apps/web/app/orders/[id]/page.tsx`, add a button to trigger the shipment creation modal.

    ```tsx
    // apps/web/app/orders/[id]/page.tsx

    // ... imports

    export default function OrderDetailPage({ params }: { params: { id: string } }) {
      // ... existing code

      return (
        // ... existing JSX
        <Button onClick={() => setModalOpen(true)}>Create Shipment</Button>
        // ... existing JSX
      );
    }
    ```

2.  **Create Multi-Step Modal:**
    - Create a new component `apps/web/components/modals/CreateShipmentModal.tsx`.
    - This component will be a multi-step modal with the following steps:
      - **Step 1: Parcel Information:** A form to enter the weight and dimensions of the parcel.
      - **Step 2: Fetch Rates:** A button to trigger the API call to get rates. The rates will be displayed in a list.
      - **Step 3: Select Rate and Create Shipment:** A button to create the shipment with the selected rate.
      - **Step 4: Display Label:** A view to display the shipping label.

### Step 5: Background Jobs & Finalization

1.  **Implement `shipment-tracking-update` Job:**
    - In `apps/worker/index.ts`, add a new job processor for `shipment-tracking-update` and schedule it to run periodically.
    - **ARCHITECTURAL NOTE:** The worker is a separate microservice. It **CANNOT** directly import code from the `api` service. Instead, it must communicate with the `api` service via its public HTTP endpoints. The following implementation uses an HTTP client (`node-fetch` is assumed to be available) to call the API.

    ```typescript
    // apps/worker/index.ts

    // ... existing imports
    import fetch from 'node-fetch'; // Ensure an HTTP client is available

    // ... existing jobProcessors

      'shipment-tracking-update': async (job: { data: Record<string, unknown> }) => {
        const logger = console; // Assuming a logger is available
        logger.info('Starting shipment tracking update job...');

        const FULEXO_API_URL = process.env.FULEXO_API_URL;
        const FULEXO_INTERNAL_API_TOKEN = process.env.FULEXO_INTERNAL_API_TOKEN;

        if (!FULEXO_API_URL || !FULEXO_INTERNAL_API_TOKEN) {
          logger.error('FULEXO_API_URL or FULEXO_INTERNAL_API_TOKEN is not configured for the worker.');
          throw new Error('Worker is not configured for internal API calls.');
        }

        const shipments = await prisma.shipment.findMany({
          where: {
            status: 'shipped', // Or any other status that requires tracking
            trackingNo: { not: null },
            carrier: { not: null },
          },
          take: 100, // Process in batches
        });

        logger.info(`Found ${shipments.length} shipments to track.`);

        for (const shipment of shipments) {
          if (shipment.carrier && shipment.trackingNo) {
            try {
              const trackUrl = `${FULEXO_API_URL}/api/shipments/track/${shipment.carrier}/${shipment.trackingNo}`;
              
              const response = await fetch(trackUrl, {
                headers: {
                  // This assumes the API's auth guard is updated to accept this internal token
                  'Authorization': `Bearer ${FULEXO_INTERNAL_API_TOKEN}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
              }

              const trackingInfo = await response.json();
              
              // Based on the tracking info, update the shipment status in the database.
              // This logic depends on the structure of the 'trackingInfo' object.
              if (trackingInfo.status && trackingInfo.status !== shipment.status) {
                await prisma.shipment.update({
                  where: { id: shipment.id },
                  data: { 
                    status: trackingInfo.status,
                    ...(trackingInfo.status === 'delivered' && { deliveredAt: new Date() })
                  },
                });
                logger.info(`Updated shipment ${shipment.id} to status ${trackingInfo.status}`);
              }

            } catch (error) {
              logger.error(`Failed to track shipment ${shipment.id}:`, { error });
            }
          }
        }
        logger.info('Shipment tracking update job finished.');
      },

    // ... existing worker setup

    async function scheduleRecurringJobs() {
      // ... existing recurring jobs

      await schedulerQueue.add('shipment-tracking-update', {},
        {
          repeat: { pattern: '0 * * * *' }, // every hour
          removeOnComplete: true,
          priority: 2, // Medium-low priority
        });
    }

    // ... rest of the file
    ```

**Note on Production Deployments:** The `scripts/deploy.sh` script will need to be updated to manage the `karrio` services (e.g., `docker-compose -f docker-compose.prod.yml up -d karrio-server karrio-dashboard`).

---

## 3. First Actionable Step

1.  Create a new feature branch: `git checkout -b feature/karrio-integration-final`.
2.  Execute **Step 1: Infrastructure Setup** as described above.
3.  Proceed with the subsequent steps in order.
