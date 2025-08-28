### Fulexo Platform Blueprint — BaseLinker-Driven (Read-Only v1) — Fully Self‑Hosted

#### Amaç ve Kapsam
- BaseLinker (BL) tek veri kaynağı; platform salt-okuma (read-only) olarak BL verilerini listeler, görselleştirir, raporlar.
- Tüm kontrol sizde: Müşterinin (tenant) ne göreceği ve neler yapabileceği merkezi sahiplik kuralları ve görünürlük politikalarıyla yönetilir.
- Tamamen self-hosted: Ücretli dış hizmet yok. Tüm bileşenler kendi sunucunuzda (Docker Compose) çalışır.

#### Rollerin Özeti
- FULEXO_ADMIN: BL hesap/kural/politika/rol yönetimi, tüm tenant ve ayarlar.
- FULEXO_STAFF: Operasyon (sipariş, kargo, iade, fatura, ürün); sınırlı ayarlar.
- CUSTOMER_ADMIN: Kendi tenant; kendi kullanıcılarını ve görünürlük ayarlarını yönetebilir.
- CUSTOMER_USER: Kendi tenant verilerini read-only görüntüler.

## 1) Mimari Genel Bakış (Self‑Hosted)
- Frontend: Next.js 14 (App Router, TS, Tailwind, shadcn/ui), SSR+ISR, TanStack Query.
- Backend API: NestJS (TS), REST (OpenAPI), JWT + opsiyonel 2FA, RBAC guard.
- Worker: BullMQ (Valkey/Redis) ile artımlı senkron ve batch işler; rate-limit güdümlü.
- Veri: PostgreSQL (mirror/cache + sahiplik alanları); Valkey/Redis (kısa TTL cache + kuyruk); MinIO (opsiyonel dosya cache/CDN).
- Entegrasyon: BL Connector API (X‑BLToken, 100 req/dk limit); wrapper + backoff.
- Gözlem: Prometheus (metrics) + Grafana (dash), Loki/Promtail (log), Jaeger/Zipkin (trace), Uptime-Kuma (uptime).
- Giriş noktası: Nginx reverse proxy + Let's Encrypt (Certbot) TLS sertifikaları.

Ağ Topolojisi (öneri)
- app.example.com → Next.js (frontend)
- api.example.com → NestJS (API)
- jaeger.example.com, grafana.example.com, logs.example.com (opsiyonel ayrı subdomainler, basic auth ile koru)

## 2) Self‑Hosted Bileşenler (Önerilen Sürümler)
- Docker Engine 26+, Docker Compose v2
- Nginx 1.24+ (reverse proxy)
- PostgreSQL 16+ (PgBouncer 1.21+ connection pooling için)
- Valkey/Redis 7+ (cluster mode optional)
- MinIO RELEASE.2025-xx-xxTxx-xx-xxZ (S3 uyumlu obje depolama)
- Prometheus 2.53+ (Alertmanager 0.26+), Grafana 11+, Loki 2.9+, Promtail 3.0+
- Jaeger all-in-one 1.57+
- Uptime-Kuma 1.23+
- Certbot (nginx plugin) veya acme.sh (otomatik TLS)
- ClamAV 1.2+ (virus scanning için opsiyonel)
- MailHog (development) / Postfix (production email)

## 3) Docker Compose — Kısa Demolar

Dizin yapısı (öneri)
```
repo/
  compose/
    docker-compose.yml
    .env
    nginx/
      conf.d/
        app.conf
    prometheus/
      prometheus.yml
      alerts.yml
    alertmanager/
      config.yml
    grafana/
      provisioning/
        datasources/
        dashboards/
    loki/
      config.yml
    promtail/
      config.yml
  apps/
    api/   (NestJS)
    web/   (Next.js)
    worker/(Node worker)
```

Örnek docker-compose.yml (özet)
```yaml
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
      POSTGRES_DB: fulexo
      POSTGRES_USER: fulexo
      POSTGRES_PASSWORD: strong_db_password
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
      MINIO_ROOT_USER: minio
      MINIO_ROOT_PASSWORD: strong_minio_pass
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    volumes:
      - miniodata:/data
    restart: unless-stopped

  api:
    build: ../apps/api
    env_file: .env
    environment:
      DATABASE_URL: postgresql://fulexo:strong_db_password@postgres:5432/fulexo
      REDIS_URL: redis://valkey:6379/0
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: minio
      S3_SECRET_KEY: strong_minio_pass
      S3_BUCKET: fulexo-cache
      NODE_ENV: production
    depends_on: [postgres, valkey, minio]
    restart: unless-stopped

  web:
    build: ../apps/web
    env_file: .env
    environment:
      NEXT_PUBLIC_API_BASE: https://api.example.com
      NODE_ENV: production
    depends_on: [api]
    restart: unless-stopped

  worker:
    build: ../apps/worker
    env_file: .env
    environment:
      DATABASE_URL: postgresql://fulexo:strong_db_password@postgres:5432/fulexo
      REDIS_URL: redis://valkey:6379/0
      NODE_ENV: production
    depends_on: [postgres, valkey]
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml:ro
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
      GF_SECURITY_ADMIN_PASSWORD: strong_grafana_pass
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
```

Örnek Nginx server block (SSL sonrası)
```nginx
server {
  listen 443 ssl http2;
  server_name api.example.com;
  ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
  location / {
    proxy_pass http://api:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 4) Sahiplik (Ownership) ve Görünürlük Politikaları

Ownership Modeli
- bl_accounts(id, tenant_id, ...): BL hesabı doğrudan tenant'a bağlanabilir.
- ownership_rules: Tek BL hesabında birden çok müşteri varsa kurallar ile eşleme yapılır (öncelik sıralı).
- entity_map: Manuel eşlemenin kalıcı kaydı (örn. BL order/product id → tenant/customer).

Eşleme Sırası
1) Hesap `tenant_id` doluysa → doğrudan o tenant.
2) Değilse → `ownership_rules` koşulları:
   - order_source / marketplace_code / shop_id
   - BL tag/etiket
   - buyer.email/phone/domain
   - ürün tag/category/manufacturer/custom fields
3) Eşleşme yoksa → Unassigned kuyruğu; operatör manuel atar (entity_map'a yazılır).

Visibility/Policy Modeli (tenant bazlı)
- Modül görünürlüğü: orders/shipments/returns/invoices/products.
- Aksiyonlar: allowDownloadLabels, allowInvoicePDF, allowExportCSV, allowLiveRefresh.
- Alan/PII: maskPII (email/telefon), showPrices.
- Veri kapsamı: allowedStatuses, allowedOrderSources, allowedWarehouses.
- Customer scoping: CUSTOMER_ADMIN kendi alt kullanıcıları için kapsam kısıtları.

API Kapsamı
- WHERE tenant_id = :sessionTenant AND (customer_id IN :sessionCustomers?)
- Serializer tarafında PII maskeleme policy'ye göre uygulanır.

Ownership Rule DSL (örnek)
```json
{
  "entity_type": "order",
  "priority": 10,
  "conditions": [
    { "field": "order.order_source", "op": "in", "value": ["amazon", "shop"] },
    { "field": "order.tags", "op": "contains", "value": "CLIENT_A" }
  ],
  "action": { "tenantId": "TENANT_A", "customerId": null, "visibility": {"maskPII": false} },
  "active": true
}
```

## 5) Veri Şeması (DDL Örnekleri)

Önemli tablolar (özet DDL — PostgreSQL)
```sql
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null
);

create table users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('FULEXO_ADMIN','FULEXO_STAFF','CUSTOMER_ADMIN','CUSTOMER_USER')),
  twofa_secret text,
  created_at timestamptz default now()
);

create table bl_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete set null,
  label text,
  token_encrypted bytea not null,
  active boolean default true,
  last_sync_at timestamptz
);

create table ownership_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entity_type text not null,
  priority int not null,
  conditions_json jsonb not null,
  action_json jsonb not null,
  active boolean default true
);

create table entity_map (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  bl_id text not null,
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id text,
  unique(entity_type, bl_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id),
  account_id uuid references bl_accounts(id),
  bl_order_id text not null,
  external_order_no text,
  status text,
  total numeric(14,2),
  currency text,
  customer_email text,
  customer_phone text,
  confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, bl_order_id)
);
create index idx_orders_tenant_status_date on orders(tenant_id, status, confirmed_at desc);
create index idx_orders_email_phone on orders(tenant_id, customer_email, customer_phone);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sku text,
  name text,
  qty int not null,
  price numeric(14,2)
);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  carrier text,
  tracking_no text,
  status text,
  shipped_at timestamptz,
  delivered_at timestamptz
);
create index idx_shipments_tracking on shipments(tracking_no);

-- returns, invoices, products tabloları benzer alanlarla oluşturulur.
```

## 6) Backend (NestJS) — Ayrıntılar

Katmanlar
- Modules: Auth, RBAC, Tenants, BLAccounts, OwnershipRules, EntityMap, Orders, Shipments, Returns, Invoices, Products, Analytics, Sync, Files, Admin, Health.
- Services: BLClient, RulesEngine, SyncService, MappingService, CacheService, AuditService, JobService.
- DTO/Serializer: PII maskeleme ve policy tabanlı alan gizleme.

Örnek API Uçları
- Auth: POST /auth/login, POST /auth/2fa/verify, POST /auth/logout
- Accounts: GET/POST /accounts (admin-only)
- Rules: GET/POST/PUT/DELETE /rules; POST /rules/test
- Unassigned: GET /unassigned?type=order|product..., POST /unassigned/assign
- Orders: GET /orders?q=&status=&date_from=&date_to=&account_id=, GET /orders/:id, POST /orders/:id/refresh (policy)
- Shipments: GET /shipments, GET /shipments/:id, GET /shipments/:id/label (policy), GET /shipments/:id/protocol (policy)
- Returns: GET /returns, GET /returns/:id
- Invoices: GET /invoices, GET /invoices/:id, GET /invoices/:id/pdf (policy)
- Products: GET /products, GET /products/:id, POST /products/:id/refresh (policy)
- Statuses: GET /statuses, GET /statuses/map
- Analytics: GET /analytics/summary
- Health/Admin: GET /health, GET /metrics (Prom), GET /logs (admin)

BLClient (psödo)
```ts
async function blRequest(method: string, parameters: any, token: string) {
  const body = new URLSearchParams({ method, parameters: JSON.stringify(parameters) });
  await rateLimit(token); // token başına pencere sayacı (Redis)
  const res = await fetch("https://api.baselinker.com/connector.php", {
    method: "POST",
    headers: { "X-BLToken": token },
    body
  });
  if (!res.ok) throw new Error(`BL HTTP ${res.status}`);
  const json = await res.json();
  if (json.status !== "SUCCESS") throw new Error(json.error_message || "BL error");
  return json;
}
```

Rate-Limit (Redis token bucket)
- Key: `bl:ratelimit:${token}`
- Dakikada 100 jeton; istek öncesi `DECR`, yetersizse bekleme/backoff.

RBAC Guard
- Her istekte JWT → tenant_id, role, optional customer_scope.
- Repositories tüm query'lerde tenant filter uygular.

## 7) Worker (BullMQ) — Scheduler + İşler

İş Tipleri ve Sıklıklar
- orders:sync:account (2 dk) — `getOrders` confirmed artımlı, 100'lük sayfalama, checkpoint sync_state.
- returns:sync:account (5 dk) — `getOrderReturns` artımlı.
- shipments:track:tenant (5 dk) — son 7 gün gönderilerini `getCourierPackagesStatusHistory` ile güncelle.
- invoices:sync:account (10 dk) — `getInvoices` metaları.
- products:sync:account (opsiyonel) — `getInventoryProductsList` özet mirror.
- files:cache:cleanup (günlük) — MinIO/FS cache temizliği.
- cache:warm (15 dk) — Popüler verileri cache'e önceden yükleme
- reconciliation:daily (günlük) — BL ve internal veri tutarlılık kontrolü
- backup:database (günlük) — PostgreSQL backup işlemi
- audit:anonymize (haftalık) — GDPR uyumlu PII anonimleştirme
- metrics:aggregate (5 dk) — Business metrikleri hesaplama

Scheduler
- Redis ZSET (cron:schedule) + HASH (task metadata) + 30s lock ile claim & reschedule.
- Dead Letter Queue (DLQ) failed job'lar için
- Circuit breaker pattern ile hata yönetimi
- Priority queues: critical (1), high (2), normal (3), low (4)
- Rate limiting: Per-tenant token bucket implementation

## 8) Frontend (Next.js) — Ayrıntılar

Sayfalar
- Admin: dashboard, orders, orders/[id], shipments, returns, invoices, products, customers, analytics, logs, settings/{accounts,rules,unassigned,policies,users,branding}
- Portal: dashboard, orders, orders/[id], shipments, returns, invoices, products, settings

Bileşenler
- Ownership Rules Builder: koşul/op/değer + öncelik + action; test paneli.
- Unassigned Queue: bulk assign, history/audit.
- Policy Editor: modules/actions/fields/data scope/PII toggles.
- Tablolar: virtualized; export (policy + rate-limit'e göre throttle).
- Global arama önekleri: ord:, inv:, track:, email:, phone:, sku:

Güvenlik (UI)
- CSP, HSTS, SRI; XSS'e karşı sanitize; SSRF'den kaçınma; güvenli cookie bayrakları.

## 9) Cache Politikası
- Redis read-through
  - List (30–120 sn), Detail (60–300 sn), File (15 dk)
- Invalidation
  - Senkron sonrası ilgili anahtarlar silinir veya TTL ile doğal temizlenir.
- Key isimlendirme
  - `list:orders:tenant:${id}:page:${n}:filters:${hash}`
  - `detail:order:${orderId}`
  - `file:label:${shipmentId}`

## 10) Loglama, Metrik ve İzleme
- Prometheus: API/Worker `/metrics` endpoint; metrikler: sync_lag_seconds, bl_requests_total, rate_limit_hits_total, job_fail_total, http_request_duration_ms{route,..}
- Alertmanager: kritik alarmlar için e‑posta/Slack entegrasyonu.
- Grafana: hazır dashboard jsonları (provisioning klasörü).
- Loki/Promtail: container loglarını Loki'ye gönder; label: svc, tenant, job.
- Jaeger: trace-id başlıkları; kritik akışlar için span'lar (BL çağrısı, DB IO).
- Uptime-Kuma: app/api endpoint'leri için sağlık kontrolleri.

## 11) Güvenlik Sertleşmesi
- TLS: Let's Encrypt (certbot) otomatik yenileme; HSTS.
- Nginx rate-limit: istek başına temel RPS limiti; fail2ban (nginx logları üzerinden).
- JWT imzalama için güçlü secret/rotasyon; 2FA TOTP opsiyon.
- BL Token'ları: AES‑GCM ile at-rest şifreli (envelope): master key `.env` + per-record nonce/salt.
- DB erişimi: ayrı kullanıcı/rol; en az yetki; pg_hba.conf kısıtları (sadece docker ağı).
- Firewall (ufw): 80/443/22/9001 gibi gerekli portlar; diğerleri kapalı.
- Dosya izinleri: docker volumes sadece ilgili servis tarafından yazılabilir.

## 12) Yedekleme ve Geri Yükleme
- PostgreSQL: günlük `pg_dump` + haftalık tam yedek; saklama 14–30 gün.
```bash
# yedek
pg_dump -h localhost -U fulexo -Fc -f /backups/fulexo_$(date +%F).dump fulexo
# geri yükleme
pg_restore -h localhost -U fulexo -d fulexo --clean /backups/fulexo_YYYY-MM-DD.dump
```
- MinIO: `mc mirror` ile farklı diske veya harici diske periyodik çoğaltma.
- Konfig: docker compose dosyaları, nginx konfig, grafana/loki configleri git'te tutulur.

## 13) Kurulum Adımları (Ubuntu 22.04+)
1) Sistem güncelleme, docker ve compose kurulumu
```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# docker compose v2 paket veya plugin ile
```
2) Repo klonla → `compose/.env` oluştur → şifreleri doldur.
3) `docker compose -f compose/docker-compose.yml up -d --build`
4) MinIO'da bucket oluştur (web konsol: :9001); `.env` S3_* alanlarını doğrula.
5) Nginx + Certbot: A kayıtları hazır; `certbot --nginx -d api.example.com -d app.example.com`.
6) API migrate/seed: `docker compose exec api node dist/migrate.js` (veya prisma/typeorm cli).
7) Admin kullanıcı oluştur (script veya API): `POST /auth/seed-admin` (sadece bir kez, env kontrollü).
8) Worker cron işlerini doğrula (BullMQ concurrency ve scheduler logları); Grafana'ya bağlan.

## 14) Bakım ve Ölçek
- Postgres bakım: autovacuum ayarı; büyük tablolar için indeks bakım; gerektiğinde partitioning (orders by month).
- Ölçek: API ve Worker replikaları (docker compose scale), Nginx upstream round-robin.
- Log rotasyonu: Loki disk tüketimi limitleri; retention policy.

## 15) Test Stratejisi
- Birim: BLClient, RulesEngine, Policy serializer, Rate-limit/backoff, Repos tenant filter.
- Entegrasyon: BL sandbox; sync uçtan uca; Unassigned→Assign akışı; policy enforcement.
- E2E (Playwright): Admin/Portal menü & görünürlük; liste/detay; dosya indirme; PII maskeleme.
- Yük: BL limitine saygılı job concurrency testi; p95 gecikme hedefleri.

## 16) Yol Haritası (6 Hafta)
- Hafta 1: Monorepo/compose, BLClient, şema, orders sync v1, Rules v1, Orders List v1.
- Hafta 2: Order detail/timeline, Status map, Unassigned v1, Policy Editor v1.
- Hafta 3: Shipments (list/detail), label/protocol on-demand + cache, tracking updater.
- Hafta 4: Returns & Invoices (list/detail), invoice PDF on-demand, analytics tiles.
- Hafta 5: Products (list + detail live), performance/cache tuning, exports + PII masking.
- Hafta 6: RBAC/2FA, logs/metrics/tracing, branding, dokümantasyon; prod sertleşme.

## 17) Kabul Kriterleri
- Kayıtlar doğru tenant/customer'a atanır; Unassigned sıfırlanabilir.
- 100 req/dk ihlali yok; sync lag metrikleri hedef altında.
- RBAC + Policy ile menü/aksiyon/alan ve veri kapsamı doğru kısıtlanır.
- Listeler p95 < 1 sn; detay p95 < 2 sn (cache'li); dosya indirme çalışır.
- Audit kritik olayları kaydeder; BL token güvenliği doğrulanır.

## 18) Ekler (Örnek Konfigler)

Prometheus scrape (api/worker)
```yaml
scrape_configs:
  - job_name: api
    static_configs:
      - targets: ["api:3000"]
  - job_name: worker
    static_configs:
      - targets: ["worker:3001"]
```

Loki (basit)
```yaml
server:
  http_listen_port: 3100
schema_config:
  configs:
  - from: 2024-01-01
    store: boltdb-shipper
    object_store: filesystem
    bucket: loki
    schema: v13
storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks
```

Promtail (docker logları)
```yaml
server:
  http_listen_port: 9080
positions:
  filename: /tmp/positions.yaml
clients:
  - url: http://loki:3100/loki/api/v1/push
scrape_configs:
  - job_name: docker
    static_configs:
      - targets: [localhost]
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*-json.log
```

Nginx HTTP→HTTPS yönlendirme (kısa)
```nginx
server { listen 80; server_name api.example.com; return 301 https://$host$request_uri; }
```

## 19) UX ve Sayfa Bazlı Özellikler (Admin vs Müşteri)

### Bilgi Mimarisi (IA)
- Admin Navigasyon:
  - Dashboard
  - Orders, Shipments, Returns, Invoices, Products, Customers
  - Analytics, Logs
  - Settings: Accounts (BL), Ownership Rules, Unassigned, Policies, Users & Roles, Branding
- Müşteri Navigasyon:
  - Dashboard
  - Orders, Shipments, Returns, Invoices, Products
  - Settings (Profile, Preferences)

### Ortak UI Kalıpları
- Tablo kolonları: seçilebilir/gizlenebilir; sürükle-bırak sıralama; kalıcı kullanıcı tercihi
- Filtre çubuğu: tarih aralığı, durum, kaynak, arama; "Saved Views" (tenant/global)
- Toplu eylemler: export CSV (policy'ye bağlı), link paylaş (read-only paylaşım token'lı)
- Satır eylemleri: BL'de aç, ID kopyala, ilişkili varlıklar (shipment/invoice/return)
- Timeline: ikonlu olaylar; kargo/istatü geçişleri; saat dilimi tenant'a göre
- Yükleme: skeleton + progressive streaming; boş/doluluk durumları (empty/zero state)
- Hata durumları: ağ/retry; oran sınırlama uyarıları
- Klavye kısayolları: / global arama, g o Orders, g s Shipments

### Giriş & Kimlik (Auth)
- Login: email + şifre; brute force throttling (5 denemede 15 dk)
- 2FA: TOTP kurulumu (QR) ve doğrulama; cihaz hatırla (30 gün) token'ı (şifreli)
- Şifre sıfırlama: token'lı mail; güçlü parola politikası (min 12, zxcvbn >= 3)
- Oturum yönetimi: aktif oturum listesi; oturum sonlandırma
- Davet: Admin kullanıcı daveti (email link) → ilk girişte şifre ve 2FA kurulum
- Erişim reddi sayfaları: 403 (izin yok), 404, 429 (rate-limit)

### Dashboard (Admin)
- Kartlar: Today/7d/30d Orders, Revenue, Return Rate, Shipped %
- Grafikler: Sipariş zaman serisi; statü dağılımı; kargo SLA (ship/delivery lead time)
- Sync & Queue: son sync timestamp, bekleyen job sayısı, rate-limit hit grafiği
- Uyarılar: Unassigned sayacı; SLA ihlali uyarıları

### Dashboard (Müşteri)
- Kendi kapsamına göre kartlar ve grafikler; tenant policy'ye göre filtrelenmiş

### Orders List
- Kolonlar: Order ID (BL), External No, Status (mapped), Customer, Total, Currency, Confirmed At, Account/Source
- Filtreler: tarih, durum, kaynak, e-posta/telefon, tutar aralığı, hesap
- Saved Views: global/tenant bazlı; varsayılan görünüm belirleme
- Export: CSV (policy), iş kuyruğunda üretim; hazır olduğunda bildirim/email

### Order Detail
- Başlık: BL Order ID, durum rozetleri, hesap/kaynak
- Özet: toplam, para, ödeme özeti, adresler (PII mask policy)
- Items tablosu: SKU, ad, qty, fiyat (showPrices policy)
- Timeline: BL statü değişimleri + shipment event'leri
- İlişkili: Shipments, Invoices, Returns panelleri
- Aksiyonlar: BL'de aç, refresh (policy), export tekil CSV/PDF (opsiyon)

### Shipments
- Liste: Paket ID, Carrier, Tracking, Status, UpdatedAt, Order
- Detay: Tracking timeline; Label/Protocol indirme (policy; on-demand cache)

### Returns
- Liste: Return ID, Status, Reason, Date, Order
- Detay: Return items, durum akışı, ilişkili sipariş

### Invoices
- Liste: Number/Series, Total, Currency, Date, Order
- Detay: PDF indir (policy), kalemler (eğer BL dönerse meta)

### Products
- Liste: SKU, Name, Stock (özet), UpdatedAt, Variants
- Detay: BL'den on-demand detay (TTL cache), geçmiş sipariş/return ilişkileri

### Customers
- Liste: buyer email/phone'dan türetilmiş müşteri profilleri; toplam sipariş/ciro
- Detay: Müşteriye ait orders/returns/invoices

### Settings (Admin)
- BL Accounts: token ekle/sil, test et, tenant bağla; maskeleme ile kısmi göster
- Ownership Rules: kural listesi; sürükle-sıra; koşul builder (field/op/value); test aracı; yayınla
- Unassigned: varlık listesi; bulk assign; audit kaydı
- Policies: modül/aksiyon/alan/PII/allowedStatuses|Sources/warehouses toggles; tenant ve rol bazlı override
- Users & Roles: kullanıcı CRUD; rol atama; customer_scope; MFA zorunluluğu; oturumları kapatma
- Branding: logo, renkler, tarih/para formatları; email şablon logosu

## 20) E-Posta Sistemi (Self‑Hosted)

### SMTP ve Teslimat
- Prod: Postfix (send-only) + DKIM/DMARC/SPF konfigürasyonları; PTR kaydı
- Dev/Staging: MailHog (docker) ile yakalama
- DKIM anahtar üretimi ve DNS kayıt örnekleri eklenir

### Şablon Motoru
- MJML → HTML derleme (build time) + Handlebars değişkenleri
- Çok dilli şablon desteği (tr, en), tenant temalı logo/renk

### Şablonlar (Örnek)
- InviteUser: {inviteLink, tenantName}
- PasswordReset: {resetLink, expiresAt}
- TwoFASetup: {otpUri, qrcodeEmbedded}
- WeeklyDigest: {periodStart, periodEnd, ordersCount, revenue}
- SLAAlert: {orderId, ageHours, link}
- ExportReady: {exportName, downloadLink}
- LabelReady: {shipmentId, downloadLink}

Şablon Örneği (Handlebars)
```html
<table role="presentation" width="100%" style="font-family:Arial">
  <tr><td><img src="{{logoUrl}}" alt="{{tenantName}}" height="32"/></td></tr>
  <tr><td><h1>Hesabına Davet</h1></td></tr>
  <tr><td>{{userName}}, aşağıdaki bağlantıdan daveti kabul edebilirsiniz.</td></tr>
  <tr><td><a href="{{inviteLink}}" style="background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Davetimi Kabul Et</a></td></tr>
  <tr><td style="color:#6b7280;font-size:12px">Bu e-postayı beklemiyorsanız, yok sayabilirsiniz.</td></tr>
</table>
```

### E-Posta Kuyruğu
- email_templates(id, key, locale, subject, html, active)
- email_queue(id, to[], cc[], bcc[], subject, html, status=PENDING|PROCESSING|SENT|FAILED, attempts, last_error, scheduled_for)
- Gönderim backoff: 1m, 5m, 15m; maksimum 5 deneme
- Test gönderimi: ayar ekranından test email butonu

### Günlükler ve Geri Dönüşler
- /var/log/mail.log izleme; bounce tespiti (temel)
- Haftalık teslim raporu (başarılı/başarısız sayıları)

## 21) Otomasyonlar

### Tetikleyiciler
- Cron tabanlı: hourly, daily, weekly işleri (BullMQ scheduler)
- Olay tabanlı: sync sonrası yeni kayıtlar; SLA eşikleri

### Koşul → Aksiyon Kuralları
- Örnekler:
  - If order.confirmed_at > 48h and status != SHIPPED → Email SLAAlert to STAFF
  - WeeklyDigest: tenant bazında haftalık özet e-postası (orders, revenue)
  - Export: kullanıcı export talebi → job üret, hazır olunca e-posta gönder

### Yapılandırma
- automation_rules(id, tenant_id, trigger, conditions_json, actions_json, active, priority)
- UI: Rule Builder (Ownership Rules'e benzer)

## 22) Arama Söz Dizimi ve Kaydedilmiş Görünümler

### Global Arama
- Önekler:
  - ord:123456, inv:KMF..., track:RF12345, email:john@doe.com, phone:+33..., sku:ABC123

### Filtre Söz Dizimi (Gelişmiş)
- status:SHIPPED, source:amazon|shop, amount:>100, date:2025-01-01..2025-01-31
- Birleşimler: status:SHIPPED AND source:amazon NOT amount:<50

### Kaydedilmiş Görünümler (Saved Views)
- views(id, tenant_id, user_id?, scope=GLOBAL|TENANT|USER, name, query_json, columns_json, default)

## 23) Export (CSV) ve İndirme Merkezi
- Export türleri: Orders, Shipments, Returns, Invoices, Products
- İstek → job_queue → hazır olunca Download Center'da görünür, e-posta ile link gider
- Dosya saklama: MinIO (TTL 7 gün), imzalı URL
- Sütun haritaları ve PII maske kuralları export'a da uygulanır

## 24) Audit ve Günlükler (UI + Şema)
- audit_log(id, tenant_id, actor_user_id, action, details_json, created_at)
- Aksiyon örnekleri: login, rules.update, policies.update, unassigned.assign, export.create, file.download
- UI: filtrelenebilir audit listesi; detay modal (önce/sonra diff)

## 25) Onboarding Akışları
- Tenant oluşturma sihirbazı: ad, logo, zaman dilimi, para birimi
- BL hesap bağlama sihirbazı: token test, hesap adı, varsayılan tenant
- İlk Senkron İzleyici: progress bar, tahmini süre, son 7 gün öncelikli
- Önerilen Kurallar: BL verisinden otomatik kural önerileri (order_source/tag dağılımına göre)

## 26) Tasarım Sistemi

### Design Tokens (JSON örneği)
```json
{
  "color": {
    "primary": "#0ea5e9",
    "primaryDark": "#0284c7",
    "bg": "#0b1220",
    "card": "#0f172a",
    "text": "#e2e8f0",
    "muted": "#94a3b8"
  },
  "radius": {"sm": 6, "md": 10, "lg": 14},
  "shadow": {"sm": "0 1px 2px rgba(0,0,0,.1)", "md": "0 3px 6px rgba(0,0,0,.15)"},
  "space": {"1": 4, "2": 8, "3": 12, "4": 16}
}
```

### Tipografi
- Başlık: Inter/Manrope 600; Metin: Inter 400; Kod: Menlo

### Bileşenler
- Button, Input, Select, DataTable, Badge, Tabs, Drawer/Modal, Tooltip, Toast/Toaster, Timeline, StatusPill, EmptyState

### Erişilebilirlik
- WCAG 2.1 AA; kontrast 4.5:1; focus ring; skip-to-content
- Klavye erişimi; ARIA landmark ve rol tanımları

### Çok Dillilik (i18n)
- tr-TR ve en-US; tarih/sayı yerelleştirme; kullanıcı tercihi + tenant varsayılanı
- Statü adları mapped_state için yerelleştirilmiş label'lar

## 27) Operasyon Runbook'u
- Olay: BL API 429 fazlalaştı → Worker concurrency düşür, batch aralığı artır; rate-limit counterları izle
- Olay: Sync lag > 30dk → fast-queue önceliklerini yeniden ayarla; sorunlu hesapları geçici devre dışı bırak
- Olay: Postgres disk doluyor → eski export dosyalarını temizle; VACUUM/REINDEX; MinIO retention kontrolü
- Olay: SMTP bounces artıyor → DKIM/SPF/DMARC kontrol; throttling artır; problemli domainleri karalisteye ekle

## 28) SLO/SLI ve Performans Bütçeleri
- API cached list p95 < 300ms; detail p95 < 800ms; TTFB (web) < 500ms
- Sync lag ort. < 5dk (orders), < 10dk (returns/invoices), shipments track < 10dk
- Frontend TTI < 2s (kabul edilebilir), LCP < 2.5s

## 29) Güvenlik ve Uyumluluk (Ek)
- Şifre politikası; parola hash (argon2id veya bcrypt cost 12+)
- JWT süreleri: access 15m, refresh 7d; IP/UA bağlam kaydı
- CSRF: yalnızca GET/HEAD; mutasyon yok (read-only), yine de güvenli form örüntüleri
- Gizlilik: PII maskeleme; loglarda PII yok; IP/ülke kayıtları opsiyonel

## 30) Sürümleme, Yayın ve Geri Alma
- Git akışı: main + release tags; SemVer minor/patch
- CI: lint/test/build; Docker image tag; SBOM (syft/grype opsiyonel)
- CD: staging → prod onayı; DB migration safe; canary 1/1 → 1/N
- Rollback: önceki imaj + migration down (uygunsa) veya backward-compatible migration stratejisi

## 31) Requests & Approvals (Customer Submissions)

Amaç
- Müşteriler panelden talepler (ör. stok düzeltme, yeni ürün ekleme, sipariş notu/döküman, genel talep) oluşturur.
- Bu talepler BL'ye gitmez; yalnızca iç sistemde kuyruğa alınır. Onaylanınca iç veri güncellenir; istenirse daha sonra manuel/otomatik BL ile uyarlanabilir (opsiyonel).

Kapsam ve Türler
- STOCK_ADJUSTMENT: SKU bazlı artı/eksi stok düzeltme (yalnızca iç sistem)
- NEW_PRODUCT: Yeni ürün önerisi (SKU, ad, temel alanlar)
- ORDER_NOTE / DOCUMENT_UPLOAD: Siparişe açıklama/dosya
- OTHER: Serbest metin talepleri (kategori seçilebilir)

Durumlar
- DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED | REJECTED → APPLIED (opsiyonel son durum)

Veri Modeli (özet DDL)
```sql
create table requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id text,
  created_by uuid not null references users(id) on delete restrict,
  type text not null check (type in ('STOCK_ADJUSTMENT','NEW_PRODUCT','ORDER_NOTE','DOCUMENT_UPLOAD','OTHER')),
  status text not null check (status in ('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','APPLIED')) default 'DRAFT',
  payload_json jsonb not null,
  reviewer_user_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_requests_tenant_status on requests(tenant_id, status, created_at desc);

create table request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  author_user_id uuid not null references users(id),
  message text not null,
  created_at timestamptz default now()
);

create table request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  file_url text not null,
  file_name text,
  mime_type text,
  size int,
  created_at timestamptz default now()
);
```

Payload Örnekleri
- STOCK_ADJUSTMENT: `{ "items": [{"sku":"ABC-123","delta":-5,"reason":"damage"}], "note": "rack A1" }`
- NEW_PRODUCT: `{ "sku":"NEW-001","name":"Sample","price":null,"unit":"pcs" }`
- ORDER_NOTE: `{ "orderBlId": "123456", "note": "Gift wrap" }`
- DOCUMENT_UPLOAD: `{ "orderBlId":"123456", "docType":"invoice_copy" }`

İş Akışı
1) Müşteri talep formunu doldurur (DRAFT → SUBMITTED). Zorunlu alan doğrulamaları yapılır.
2) Admin/Staff "Requests" ekranında görür; tür, öncelik ve tenant filtreleriyle triage eder (UNDER_REVIEW).
3) Gerekirse soru/cevap için yorumlar sekmesi (customer ↔ staff) kullanılır.
4) Onay (APPROVED) veya red (REJECTED). Onay durumunda otomasyon:
   - STOCK_ADJUSTMENT: `products`/`inventories` iç değerleri günceller (yalnızca iç sistem). BL'ye push YAPILMAZ.
   - NEW_PRODUCT: `products` tablosuna eklenir (tenant/customer sahibi atanır). BL'ye ekleme opsiyonel, manuel buton.
   - ORDER_NOTE/DOCUMENT_UPLOAD: İç yorum/dosya referansı saklanır; BL'ye yükleme opsiyonel butonla.
5) APPLIED: Uygulama sonrası kapatılır; audit log yazılır; bildirim gönderilir.

UI (Müşteri Portalı)
- Requests: Yeni Talep (tür seçimi) / Liste / Detay
- Formlar: Tür bazlı alanlar (dinamik şema); dosya yükleme (MinIO), açıklama
- Durum Rozetleri: draft/submitted/review/approved/rejected/applied
- İletişim: Yorumlar (mention @staff), talep geçmişi zaman çizelgesi

UI (Admin)
- Requests: Liste (filtre: tür, durum, tenant, tarih; Saved Views)
- Detay: Payload preview (şema tabanlı render), yorumlar, ekler, karar butonları (approve/reject/apply)
- Bulk aksiyonlar: approve/reject (uygun türlerde); export
- Ayarlar: Tür bazlı form şemaları, zorunlu alanlar, validasyon kuralları, otomatik yönlendirme (örn. SKU başlamıyorsa NEW_PRODUCT)

Politikalar ve Yetkiler
- CUSTOMER_USER: Yeni talep ve kendi taleplerini görüntüleme/düzenleme (DRAFT). SUBMITTED sonrası sadece görüntüleme/yorum.
- CUSTOMER_ADMIN: Kendi tenant taleplerini yönetebilir (iptal vb.).
- STAFF/ADMIN: Tam inceleme ve karar verme; otomasyon uygulama yetkisi.

Bildirimler
- E-posta şablonları: RequestSubmitted (staff'a), RequestUpdated (taraflara), RequestApproved/Rejected (müşteriye), RequestApplied (müşteriye)
- Uygulama içi bildirimler ve opsiyonel webhook (gelecek sürüm)

SLA ve Kuyruk
- Tür bazlı hedefler: STOCK_ADJUSTMENT ≤ 24s; NEW_PRODUCT ≤ 72s vb.
- Kuyrukta eskime (aging) grafikleri ve uyarılar (Dashboard)

Raporlama
- Tenant/tür/durum bazlı sayılar; onay oranı; ortalama yanıt süresi; en çok talep edilen SKU'lar

Menu Eklemeleri
- Admin: Settings altına "Request Form Schemas" ve "Request Policies"; üst menüye "Requests"
- Müşteri: "Requests" ana menüsü

---

## 32) Admin için BaseLinker Yazma İşlemleri (Opsiyonel)

Not: Varsayılan mimari read-only'dur. Bu bölüm, yalnızca ADMIN için bilinçli olarak etkinleştirilebilen BL yazma yeteneklerini kapsar.

Kapsam (BL API)
- Orders
  - setOrderStatus (statü güncelleme)
  - addOrderProduct / setOrderProductFields / deleteOrderProduct (kalem değişiklikleri)
  - setOrderPayment (ödeme ekleme), setOrderReceipt (fiş işaretleme)
- Shipments
  - createPackage (kargo oluşturma), deleteCourierPackage
  - getLabel/getProtocol (zaten okuma), runRequestParcelPickup (kurye çağrı)
- Invoices
  - addInvoice, addInvoiceCorrection, addOrderInvoiceFile
- Returns
  - addOrderReturn, setOrderReturnFields, add/delete return product, setOrderReturnStatus, setOrderReturnRefund
- Inventory (Katalog)
  - addInventoryProduct, updateInventoryProductsStock, updateInventoryProductsPrices, addInventoryDocument + setInventoryDocumentStatusConfirmed

Güvenlik ve Kontroller
- Feature flag: "ENABLE_BL_WRITES" (tenant genel veya hesap bazlı)
- Role gate: yalnızca FULEXO_ADMIN (veya açıkça yetkili STAFF rolleri)
- Two-step confirmation: "dry-run" gösterimi (BL değişim önizlemesi) → onay → gerçek çağrı
- Rate-limit aware: yazma çağrıları düşük hız penceresinde, queue üzerinden ve geri basınçla
- Approval flow (opsiyonel): Yazma işlemi önce iç "Change Request" olarak gelir; ikinci onay sonrası BL'ye gönderilir
- Audit: Tüm yazma istek/yanıt gövdesi masked şekilde audit_log'da saklanır
- Rollback stratejisi: Mümkünse karşı-işlem (örn. statü geri alma); değilse manuel yönerge ve işaretleme

UI (Admin)
- Order Detail → Actions menüsü:
  - Change Status (setOrderStatus) → mapped_state seçici + BL status_id eşleme
  - Edit Items (add/update/remove)
  - Add Payment / Mark Receipt
- Shipment Detail → Actions:
  - Create Package (form: carrier alanları, courier fields), Delete Package, Request Pickup
- Invoice Detail → Actions:
  - Issue Invoice/Correction, Attach External PDF
- Return Detail → Actions:
  - Create/Edit Return, Change Return Status, Mark Refund
- Product Detail / Inventory → Actions:
  - Add Product to BL, Update Stock/Prices (batch), Create/Confirm Inventory Document

Dry-Run Ekranı
- Yaptığınız seçimlerden doğacak BL payload'ını ve beklenen etkileri (satır/alan değişiklikleri) gösterir
- "Confirm & Execute" butonu ile kuyrukta BL çağrısı tetiklenir

Hata Yönetimi
- BL hata kodu ve mesajı kullanıcıya sadeleştirilmiş şekilde gösterilir; teknik ayrıntı audit'e yazılır
- Otomatik retry yerine çoğunlukla manuel müdahale (yazma işlemlerinde 3 deneme sınırı)
- Başarısızlıkta öneriler: statü uyuşmazlığı, zorunlu alan, kurye hesabı vs.

İzin Politikaları (Policies)
- Per-module toggle: orders_writes, shipments_writes, invoices_writes, returns_writes, inventory_writes
- Per-account whitelist: Yazma işlemine izinli BL hesapları listesi
- Zorunlu açıklama alanı (why) ve değişim notu

Audit Örnek Kayıt
```json
{
  "action": "bl.write.setOrderStatus",
  "tenantId": "...",
  "actorUserId": "...",
  "request": {"orderId": 12345, "statusId": 678},
  "response": {"status": "SUCCESS"},
  "at": "2025-08-24T11:11:11Z"
}
```

Monitoring
- bl_writes_total{method}, bl_write_failures_total{method}, bl_write_duration_ms
- Son 24s yazma işlemleri zaman çizelgesi ve hata oranı

---

## 33) Admin Inventory Management (BaseLinker Entegrasyonlu)

Kapsam (BL Inventory/Katalog)
- Price Groups: addInventoryPriceGroup, getInventoryPriceGroups, deleteInventoryPriceGroup
- Warehouses: addInventoryWarehouse, getInventoryWarehouses, deleteInventoryWarehouse
- Catalogs: addInventory, getInventories, deleteInventory
- Categories/Tags/Manufacturers: add/delete/get (InventoryCategory/Tags/Manufacturer)
- Products: addInventoryProduct, getInventoryProductsList/Data/Stock, updateInventoryProductsStock, getInventoryProductsPrices, updateInventoryProductsPrices, deleteInventoryProduct
- Documents: addInventoryDocument (taslak), setInventoryDocumentStatusConfirmed, getInventoryDocuments/Items/Series
- Purchase Orders: addInventoryPurchaseOrder, getInventoryPurchaseOrders/Items/Series, setInventoryPurchaseOrderStatus
- Suppliers/Payers: add/get/delete (InventorySupplier/Payer)

UI Akışları (Admin)
- Depolar & Kataloglar
  - Liste: depolar, kataloglar; depo-katalog eşlemesi; varsayılan depo
  - Ekle/Düzenle: depo adı/kod, adres; katalog meta
- Ürünler
  - Liste: SKU, ad, stok (depo bazlı), fiyat grubu; filtre (kategori/tag/manufacturer)
  - Detay: temel alanlar, varyantlar, stok geçmişi, fiyat geçmişi; BL ürün ID gösterimi
  - Aksiyonlar:
    - Create/Update Product (BL addInventoryProduct)
    - Update Stock (bulk/tekil) (updateInventoryProductsStock)
    - Update Prices (bulk/tekil) (updateInventoryProductsPrices)
    - Category/Tag/Manufacturer atama
    - Delete Product (dikkat gerektirir)
- Bulk İşlemler
  - CSV/Excel import (SKU, qty, price, category/tag)
  - İş kuyruğunda parça parça BL push; dry-run önizleme tablosu
- Dökümanlar (Stock Movements)
  - Yeni Belge: giriş/çıkış (IN/OUT), kalemler; taslak oluştur (addInventoryDocument)
  - Onay: setInventoryDocumentStatusConfirmed; stok etkisi
  - Liste: tarih/depo/seri filtre; belge kalemleri
- Satınalma (PO)
  - Oluştur: tedarikçi, kalemler, planlanan tarih (addInventoryPurchaseOrder)
  - Durum: setInventoryPurchaseOrderStatus; kalemleri görüntüle
- Tedarikçiler/Payers
  - CRUD, adres/iletişim; PO'larda seçim

Güvenlik ve Kontroller
- Feature flags: inventory_writes, document_confirms, price_updates
- Role gate: sadece ADMIN veya yetkili STAFF
- Dry-run önizleme ve iki adımlı onay butonu
- Rate-limit aware: bulk işlemler job queue'da parçalanarak; failure'lar için per-item rapor
- Audit: ürün, stok, fiyat, belge/PO işlemlerinin tamamı audit log'a yazılır (öncesi/sonrası alanlarıyla)

Raporlama
- Stok özetleri depo/kategori/tag bazlı; düşük stok uyarıları; fiyat listesi dökümleri

Monitoring
- inventory_writes_total, inventory_write_failures_total, inventory_job_duration_ms

---

## 34) BaseLinker API Kapsam Haritası ve Uygulama Notları

Kimlik Doğrulama ve İstek Formatı
- URL: https://api.baselinker.com/connector.php
- Header: X-BLToken: <token>
- Body (x-www-form-urlencoded):
  - method=<methodName>
  - parameters=<JSON string>
- Response: JSON; `status: SUCCESS|ERROR`, `error_message` varsa başarısızlık; HTTP 200 olsa bile `status` kontrol edilmelidir.

Kodlama ve Dosyalar
- UTF-8 kullanılır.
- Bazı uçlar base64 içerik bekler; `+` karakteri `%2B` ile URL-encode edilmelidir.

Oran Sınırı ve Boyut Kısıtları
- Limit: 100 istek/dk (token başına). Uygulamada Redis token-bucket ve iş kuyruğu kullanılır.
- Toplu işlemler: ürün stok/fiyat güncelleme max 1000 öğe; kargo durum geçmişi max 100 paket/istek.

Sayfalama ve Artımlı Senkron
- getOrders: max 100 sipariş; yalnızca `confirmed` siparişleri çekmek önerilir (`get_unconfirmed_orders=false`).
- Artımlı çekim önerisi:
  1) `date_confirmed_from` başlangıç verilir
  2) 100 sonuç gelirse son siparişin `date_confirmed` + 1 saniye ile devam edilir
  3) 100'den az sonuç gelene dek tekrarlanır
  4) Checkpoint olarak son işlenen `date_confirmed` saklanır
- Benzer artımlı strateji: getOrderReturns, getInvoices.
- Journals (getJournalList, getOrderReturnJournalList): hesap bazlı aktif ettirilirse 3 günlük olay listesi, tetikleyici amaçlı kullanılabilir.

Siparişler (Orders)
- getOrders: filtreler (date_add, date_confirmed_from/to, order_status_id, source vb.).
- getOrderStatusList: BL statüleri; iç `mapped_state` ile eşlenir.
- setOrderStatus / setOrderStatuses: tekil/çoklu statü değişimi.
- addOrder / cloneOrder: sipariş oluşturma/klonlama (read-only mimaride sadece admin-opsiyonel).
- Ürün kalemleri: addOrderProduct, setOrderProductFields, deleteOrderProduct.
- Ödeme/Fış: setOrderPayment, getNewReceipts/getReceipt, setOrderReceipt.
- Fatura: addInvoice, addInvoiceCorrection, getInvoices, getSeries, addOrderInvoiceFile, getInvoiceFile.

Kargo (Courier Shipments)
- createPackage: kurye sisteminde gönderi oluşturma.
- getOrderPackages: siparişe ait paketleri getirir.
- getLabel / getProtocol / getCourierDocument: etiket/protokol/doküman indirir.
- getCourierPackagesStatusHistory: kargo durum geçmişi (max 100 paket/istek).
- deleteCourierPackage: kurye kaydını siler.
- getCouriersList / getCourierFields / getCourierServices / getCourierAccounts: kurye konfigürasyon verileri.
- runRequestParcelPickup / getRequestParcelPickupFields: kurye çağrı planlama.

Ürün Kataloğu / Envanter (Inventory)
- Price Groups: add/get/deleteInventoryPriceGroup.
- Warehouses: add/get/deleteInventoryWarehouse.
- Catalogs: add/get/deleteInventory.
- Categories/Tags/Manufacturers: add/get/deleteInventoryCategory|Tags|Manufacturer.
- Products: addInventoryProduct, getInventoryProductsList/Data/Stock, updateInventoryProductsStock (max 1000), getInventoryProductsPrices, updateInventoryProductsPrices (max 1000), deleteInventoryProduct.
- Documents: addInventoryDocument (taslak), setInventoryDocumentStatusConfirmed (stok etkisi), getInventoryDocuments, getInventoryDocumentItems, getInventoryDocumentSeries.
- Purchase Orders: addInventoryPurchaseOrder (+Items), setInventoryPurchaseOrderStatus, getInventoryPurchaseOrders/Items/Series.
- Suppliers/Payers: add/get/deleteInventorySupplier|Payer.

Dış Depolar (External Storages)
- getExternalStoragesList / getExternalStorageCategories.
- getExternalStorageProductsList/Data/Quantity/Prices.
- updateExternalStorageProductsQuantity (max 1000), updateExternalStorageProductsPrices.

İadeler (Order Returns)
- getOrderReturns, getOrderReturnStatusList, getOrderReturnReasonsList.
- addOrderReturn, setOrderReturnFields, addOrderReturnProduct, setOrderReturnProductFields, deleteOrderReturnProduct.
- setOrderReturnStatuses, setOrderReturnStatus, setOrderReturnRefund.

BaseLinker Connect
- getConnectIntegrations, getConnectIntegrationContractors, getConnectContractorCreditHistory, addConnectContractorCredit.

Uygulama En İyi Pratikleri
- Idempotency: Yazma operasyonlarında uygulama tarafı `idempotencyKey` türetip audit ile eşlemek (yinelenen çağrılara karşı).
- Dry-run: Yazma öncesi payload önizleme ve etki tablosu göstermek.
- Backoff: BL hata/429 durumlarında artan bekleme (1s→5s→30s→2dk→10dk).
- Boyutlandırma: Toplu işlemleri 1000 (stok/fiyat) / 100 (kargo) sınırına göre dilimleyip sıraya almak.
- Veritabanı aynası: Listeler/filtre/analitik için mirror; detayda kısa TTL canlı tazeleme.

Kritik Notlar
- Status alanı her uçta aynı semantiğe sahip değildir; eşleme tablosu (BL status_id ↔ internal mapped_state) zorunlu.
- Tarih alanları epoch (saniye) olabilir; doğru timezone ve +1s artış mantığı uygulanmalı.
- Dosya indirme uçları büyük boyutlu olabilir; MinIO/FS cache ve imzalı URL ile servis ediniz.

Blueprint ile Kapsam Uyum Kontrolü
- Orders/Shipments/Returns/Invoices/Inventory/External/Connect başlıklarının tamamı modüllerimizde karşılandı (bkz. ilgili bölümler 4, 6, 7, 32, 33).
- Rate-limit, sayfalama ve artımlı çekim stratejisi senkron/worker bölümlerinde uygulanmaktadır.
- Yazma işlemleri yalnızca admin ve feature-flag ile; dry-run/onay/audit ile korunmaktadır.

---

## 35) Environments ve CI/CD

- Ortamlar: dev, staging, prod. Her biri için ayrı domainler ve izole kaynaklar.
- CI (örn. GitHub Actions): lint → test → build → SBOM/tarama → docker image push → staging deploy.
- CD: staging onayı sonrası prod; migration adımı deploy pipeline'ında otomatik çalıştırılır.
- Versiyonlama: SemVer tag'leri; image tags: app:vX.Y.Z, web:vX.Y.Z.

## 36) Secrets Yönetimi

- Production: Docker/K8s secrets veya SOPS ile şifreli dosyalar; diskte düz metin yok.
- Uygulama: BL token'ları AES‑GCM envelope encryption; key rotation + key_version alanı.
- CI: Secrets sadece ihtiyaç duyan job/ortamda açılır; masked logs.

## 37) Initial Backfill Stratejisi

- Tetik: Yeni BL hesabı eklendiğinde veya yeniden indeksleme gerektiğinde.
- Kuyruk: `backfill:orders|returns|invoices|products` job'ları; büyük tarih aralıklarını dilimleme.
- Checkpoint: `sync_state` tablosunda per‑account per‑entity son işlenen timestamp/id tutulur.
- Backoff: BL 429/hata durumlarında artan bekleme; kaldığı yerden devam.

## 38) Silinen Kayıtlar için Reconciliation

- Gecelik job: BL ve internal mirror farklarını karşılaştır, artık yoksa `archived_at` doldur veya soft delete.
- Politika: Kritik varlıklarda (orders) hard delete yok; arşiv + görünürlükten kaldırma.

## 39) Alerting Strategy (Observability)

- Alertmanager kuralları:
  - api_http_5xx_rate > 1% (5m)
  - api_request_p95_ms > 1000 (5m)
  - worker_job_fail_total increase(5m) > 0
  - sync_lag_seconds > 1800 (orders)
  - bl_429_rate > threshold
  - postgres_disk_usage > 85%
- Escalation: Slack/email; prod'da sessiz gece pencere politikası yok (kritikler hariç).

## 40) RLS ve Tenant İzolasyonu

- PostgreSQL Row Level Security etkin:
  - `ALTER TABLE <multi-tenant tablolar> ENABLE ROW LEVEL SECURITY;`
  - Politika: `USING (tenant_id = current_setting('app.tenant_id')::uuid)`
- Uygulama: Her request başında `SET app.tenant_id = :tenantId` (DB connection scope).
- Test: RLS ihlal denemeleri için E2E senaryoları.

## 41) API Sözleşmesi (OpenAPI) ve Hata Modeli

- NestJS Swagger/OpenAPI v1: tüm endpoint/DTO'lar belgelendirilsin.
- Error sözlüğü: `code`, `message`, `details` alanları; rate‑limit ve BL hataları için standart mapping.
- CORS ve rate‑limit header'ları: `Retry-After` desteklensin.
- Not: API `GET /docs` altında Swagger UI sunar; JSON spec `GET /docs-json` ile erişilebilir.

## 42) Rate‑Limit Uygulama Ayrıntıları (Redis+Lua)

- Dağıtık token bucket: `EVAL` ile atomik `take`/`refill` işlemleri.
- Anahtar: `bl:ratelimit:{token}`; kapasite 100/dk; burst kontrolü; adil paylaşım.
- Ölçüm: `bl_requests_total`, `rate_limit_hits_total` metrikleri.

## 43) Veri Şeması Ekleri ve İndeksleme

- Customers tablosu (özet DDL):
```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email citext,
  email_normalized citext,
  phone_e164 text,
  name text,
  created_at timestamptz default now()
);
create unique index uq_customers_tenant_email on customers(tenant_id, email_normalized) where email_normalized is not null;
```
- JSONB alanlar için GIN (`jsonb_path_ops`) indeksleri (rules/payloads).
- Sık sorgular için birleşik indeksler: orders(tenant_id,status,confirmed_at desc), shipments(tracking_no).

## 44) Monorepo Araçları

- Turborepo veya Nx ile cache'li build, paylaşılmış paketler, hedefe yönelik build.
- CI'da değişen proje tespiti ile kısmi derleme ve test.

## 45) Nginx Güvenlik Başlıkları ve Dosya Servisi

- Başlıklar: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`.
- Büyük dosya: `proxy_read_timeout`, `proxy_send_timeout`, `proxy_buffering on`, imzalı URL'lerle MinIO.
- Gzip/Brotli: metin içerikler için açık; PDF/ikili dosyalarda uygun ayarlar.

Örnek server block (API)
```nginx
server {
  listen 443 ssl http2;
  server_name api.example.com;
  ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

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
```