## Fulexo Platform - Kod İnceleme ve Denetim Raporu (2025-08-28)

### Genel Özet
- Monorepo yapı: `apps/api` (NestJS), `apps/web` (Next.js 14), `apps/worker` (BullMQ), `compose/` (Docker Compose + Nginx/Prometheus/Loki/Grafana/Jaeger/UptimeKuma), `apps/api/prisma` (Prisma/PostgreSQL).
- API ve Web başarıyla derlendi. Worker, Prisma Client üretilmediği için başlatılamadı. Compose/env ve bazı güvenlik alanlarında iyileştirme ihtiyaçları var.

### En Önemli Bulgular (Önceliklendirilmiş)
- [Kritik] AES-256-GCM zarf şifreleme IV kullanımı hatalı: `apps/api/src/crypto.ts` içinde data-key zarf şifrelemesi sabit sıfır IV (`Buffer.alloc(12, 0)`) ile yapılıyor. GCM için IV tekilliği kritik; sabit IV anahtar sızıntısı ve bütünlük ihlali riskine yol açar. Her şifreleme için rastgele IV saklanmalı.
- [Kritik] RLS policy sütun adları şema ile uyumsuz: `apps/api/prisma/rls.sql` politikalar `tenant_id` sütununa referans veriyor; Prisma şeması `tenantId` kullanıyor. Bu, politikaların uygulanamamasına veya hata vermesine neden olur.
- [Kritik] Kayıt (register) uç noktası herkese açık: `apps/api/src/auth/auth.controller.ts` → `@Public()` ile `POST /auth/register` herkes tarafından çağrılabilir. Üretimde bu kapatılmalı veya sadece admin için kısıtlanmalı.
- [Yüksek] Worker çalışmıyor: `apps/worker` Prisma Client bulunamadığı için başlatılamıyor. Worker içinde `@prisma/client` jenerasyonu yapılmıyor ve Dockerfile’da ilgili adım yok.
- [Yüksek] Compose için `.env.example` eksik: README `compose/.env.example` dosyasına atıf yapıyor fakat repo içinde mevcut değil.
- [Yüksek] Varsayılan/zayıf gizli anahtarlar ve fallback’ler: `ENCRYPTION_KEY`, `JWT_SECRET`, `SHARE_TOKEN_SECRET` için repo içinde zayıf varsayılanlar veya rasgele/fallback değerler kullanılıyor. Üretimde deterministik, güçlü ve döndürülen anahtarlar şart.
- [Yüksek] Nginx konfigünde ModSecurity etkin ama imajda modül yok: `compose/nginx/conf.d/app.conf` içinde `modsecurity on;` var; kullanılan `nginx:1.25` imajında modül ve kurallar yok → Nginx runtime hatasına yol açabilir.
- [Orta] Token’lar `localStorage`’da tutuluyor: XSS durumunda token sızıntısı riski. HttpOnly Secure cookie’lere geçiş önerilir.
- [Orta] Swagger prod’da açık: `apps/api/src/main.ts` → `/docs` herkese açık. Prod’da kapatılmalı veya IP/Basic Auth/rol bazlı erişimle korunmalı.
- [Orta] Rate limit ihlalinde 401 dönülüyor: `RateLimitGuard` 429 yerine 401 döndürüyor. Doğrusu 429 Too Many Requests.
- [Orta] CORS kökenleri: Prod için `origin` listesinde domain stringleri kullanılıyor (`DOMAIN_APP`, `DOMAIN_API`). Şema ile tam origin (`https://app.example.com`) kullanımı ve wildcard kaçınılmalı.
- [Orta] Sipariş numarası üretilmesi yarış durumu riski: `orders.service.ts` max(orderNo)+1 yaklaşımı paralelde yarışa açık. Sekans/lock mekanizması önerilir.
- [Orta] Redis cache invalidation `KEYS` komutu kullanıyor: Büyük ölçeklerde bloklayıcı. Yerine `SCAN` ile tarama yapılmalı.
- [Orta] 2FA sırları düz metin: `twofaSecret` DB’de şifrelenmeden saklanıyor. En azından AES-GCM ile (doğru IV kullanımıyla) şifrelenmeli.
- [Düşük] Web Docker imajı optimize değil: Final stage tüm build içeriğini kopyalıyor ve `npx next start` çalıştırıyor. Daha küçük üretim imajları için yalnızca `.next`, `node_modules` (prod), `package.json`, `next.config.js`, `public` kopyalanmalı.
- [Düşük] Jaeger var ama uygulamada tracing yok: OpenTelemetry enstrümantasyonu eklenmemiş. Ya kaldırın ya da ekleyin.
- [Düşük] Grafana admin parolası compose’ta sabit (`grafana_admin_pass`). `.env` üzerinden yönetilmeli.

---

### Detaylı İnceleme

#### Backend (NestJS API) – `apps/api`
- Başlatma: `main.ts` global `ValidationPipe` (whitelist/transform) etkin. CORS prod ortamında whitelist ile, dev’de `true`.
- Dokümantasyon: Swagger `/docs` aktif. Prod’da kısıtlama önerilir.
- Kimlik Doğrulama:
  - JWT: Dev’de HS256, prod’da RS256. RS256 anahtarları DB’de saklanıyor (`JwtKey`), JWKS endpoint sağlanıyor.
  - Oturumlar: `Session` tablosunda token SHA256 hash’i saklanıyor; doğrulama guard içinde yapılıyor. İyi.
  - 2FA: `speakeasy` ile TOTP, QR üretimi var. Sırlar şifrelenmeden saklanıyor.
  - `POST /auth/register` herkese açık. Üretimde kapatın veya rol kontrolü ekleyin.
- Oran Sınırlama: Redis tabanlı Lua script ile sağlam. `UnauthorizedException` yerine 429 dönmeli.
- Cache: `ioredis` ile basit JSON cache; invalidation’da `KEYS` kullanımı ölçek riskli.
- RLS: `prisma/rls.sql` mevcut fakat sütun adları yanlış (`tenant_id`). Prisma şemanız `tenantId` kullanıyor. Politikalar uygulanamaz durumda.
- Veri Modelleri: Prisma şema kapsamlı; uygun index’ler var. `Order` numaralandırması yarışa açık (bkz. performans).
- Güvenlik: `crypto.ts` zarf şifrelemesinde GCM için sabit IV kullanımı kritik hatalı.

Öneriler (Backend):
- `crypto.ts`: Zarf şifrelemede IV’yi rastgele üretin ve EDK ile birlikte saklayın. Örn. `iv2` için `randomBytes(12)` ve `encrypted_data_key_iv` alanı ekleyin.
- RLS: `rls.sql`’i Prisma tablo ve sütun adlarıyla hizalayın (örn. `"Order"."tenantId" = app.tenant_id()`). Politika isimleri ve tabloları gözden geçirin; migrasyonla uygulayın.
- `RateLimitGuard`: 429 TooManyRequests döndürün; `Retry-After` başlığı ekleyin.
- `orders.service.ts`: `orderNo` üretimi için per-tenant sequence tablosu veya `INSERT ... RETURNING` ile advisory lock/sequence kullanın.
- `CacheService.flush`: `SCAN` ile pattern taraması yapın; büyük anahtar uzayında bloklamayı önleyin.
- 2FA sırlarını şifreleyin (AES-GCM doğru IV ile) veya bir KMS kullanın.
- Swagger’ı prod’da kapatın veya BasicAuth/IP allowlist ile koruyun.
- CORS’ta prod origin’lerini tam URL ile tanımlayın (`https://app.example.com`).

#### Frontend (Next.js 14) – `apps/web`
- Sayfaların çoğu `"use client"` ile istemci tarafına deopt edilmiş. Build uyarıları: `/order-info`, `/search` tamamen istemci render’ı.
- Auth: Token’lar `localStorage`’da; sayfalarda client-side redirect ile koruma var → FOUC/yanıp sönme olur.
- Güvenlik: CSP Nginx’te sıkı (`script-src 'self'`), Next.js runtime ek gereksinim duyabilir (nonce veya `unsafe-inline/eval` eklemek gerekebilir). Uygulama özel CSP üretilmeli.

Öneriler (Frontend):
- Auth’u HttpOnly cookie’lere taşıyın; Next Middleware ile route koruması (server-side) ekleyin. SSR/Server Components ile veri alımı yapın.
- Client-only sayfaları azaltın; uygun yerlerde Server Components kullanın.
- Global error/loading states, `useAuth` benzeri ortak yardımcılar ve merkezi API istemcisi ekleyin.
- CSP: Next 14 için nonce tabanlı CSP veya `next-safe` benzeri yaklaşım entegre edin.

#### Worker – `apps/worker`
- BullMQ Worker, Prometheus metrikleri ve basit planlayıcı mevcut. `@prisma/client` kullanıyor ancak Prisma Client jenerasyonu yapılmadığı için runtime hata veriyor.

Öneriler (Worker):
- Worker `package.json`’a `prisma` devDependency ekleyin ve Dockerfile’da `npx prisma generate` çalıştırın (tekil şema kaynağı olacak şekilde). Alternatif: API’nın ürettiği client’ı paylaşmak için kök monorepo’da ortak Prisma client üretimi (pnpm/yarn workspaces) kullanın.
- Dockerfile’a `HEALTHCHECK` ve graceful shutdown sinyalleri zaten var; Redis bağlantı/geri bağlanma stratejisini netleştirin.

#### Docker/Compose & Nginx – `compose/`
- Nginx konfigünde ModSecurity açık; imajda modül ve kurallar yok. Çalışma zamanı hatası olası.
- Grafana admin parolası sabit (`GF_SECURITY_ADMIN_PASSWORD`). `.env`’e alınmalı.
- Prometheus, Loki, Promtail, Jaeger, Uptime Kuma tanımlı. Prometheus `api:3000` ve `worker:3001` scrape ediyor.
- Web servisi final imajı optimize değil.

Öneriler (Ops):
- Nginx için ya modsecurity modüllü bir imaj kullanın ve kuralları mount edin ya da direktifleri kaldırın.
- `compose/.env.example` ekleyin ve tüm gizlileri .env ile besleyin.
- API/Worker Dockerfile’larına `HEALTHCHECK` ekleyin. API imajında `npx prisma generate` ve (isteğe bağlı) migration adımları ekleyin.
- Web imajını prod için küçültün (yalnızca gerekli artefaktlar).

#### CI/CD – `.github/workflows/ci.yml`
- Yalnızca build yapıyor; test yok, Docker build yok. Prisma client/migration süreçleri kapsanmıyor.

Öneriler (CI/CD):
- API/Web test aşaması (unit/e2e) ekleyin. Cache’leme (actions/setup-node cache) kullanın.
- Docker build ve trivy benzeri güvenlik taramaları ekleyin.
- Prisma şema değişikliklerinde `prisma generate` ve (gerekliyse) migration doğrulaması ekleyin.

#### Gözlemlenebilirlik
- Prometheus metrikleri (API `/metrics`, Worker `:3001/metrics`) mevcut. Alertmanager konfig boş.
- Jaeger var ancak uygulama tracing enstrümantasyonu yok.

Öneriler (Observability):
- OpenTelemetry SDK ile API/Worker’a tracing ekleyin; Jaeger’e yönlendirin.
- Temel alert’ler: yüksek hata oranı, 5xx artışı, p99 gecikme, job failure oranı, DB bağlantı hatası.

---

### Build/Test Sonuçları (bu çalışma ortamında)
- API: `npm ci && npm run build` → Başarılı.
- Web: `npm ci && npm run build` → Başarılı; bazı sayfalar client-side render’a deopt uyarısı verdi.
- Worker: Başarısız. Hata: Prisma Client üretilmedi. Örn. `@prisma/client did not initialize yet. Please run "prisma generate"...`.

### Ortam Değişkenleri (toplanan gereksinimler)
- Uygulama: `NODE_ENV`, `PORT`, `DOMAIN_API`, `DOMAIN_APP`
- DB/Cache: `DATABASE_URL`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `REDIS_URL`
- JWT/Şifreleme: `JWT_SECRET` (dev/HS256), RS256 için DB’de `JwtKey` yönetimi; `ENCRYPTION_KEY` (hex, 32 byte), `MASTER_KEY_HEX` (OAuth sırları için)
- Paylaşım bağlantıları: `SHARE_TOKEN_SECRET`, `SHARE_BASE_URL`
- S3/MinIO: `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
- Grafana: `GF_SECURITY_ADMIN_PASSWORD`

Örnek `compose/.env.example` iskeleti (güçlü değerler doldurun):
```env
NODE_ENV=production
DOMAIN_API=api.example.com
DOMAIN_APP=app.example.com

POSTGRES_DB=fulexo
POSTGRES_USER=fulexo
POSTGRES_PASSWORD=CHANGE_ME_STRONG
DATABASE_URL=postgresql://fulexo:CHANGE_ME_STRONG@postgres:5432/fulexo

REDIS_URL=redis://valkey:6379/0

S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=CHANGE_ME_STRONG
S3_BUCKET=fulexo-cache

JWT_SECRET=CHANGE_ME_64_HEX_FOR_DEV_ONLY
ENCRYPTION_KEY=64_HEX_BYTES_CHANGE_ME
MASTER_KEY_HEX=64_HEX_BYTES_CHANGE_ME
SHARE_TOKEN_SECRET=CHANGE_ME_STRONG
SHARE_BASE_URL=https://app.example.com

GF_SECURITY_ADMIN_PASSWORD=CHANGE_ME_STRONG
```

---

### Önerilen Aksiyon Planı
1) Kritik Güvenlik Düzeltmeleri (hemen)
- `crypto.ts` IV kullanımını düzeltin; zarf şifrelemede rastgele IV’yi saklayın.
- `rls.sql` sütun adlarını Prisma ile hizalayın ve politikaları uygulayın.
- `POST /auth/register` uç noktasını prod’da kapatın veya yalnızca admin/staff’a kısıtlayın.

2) Çalıştırılabilirlik ve DevOps
- Worker için Prisma Client jenerasyonunu (ve Dockerfile adımını) ekleyin.
- API Dockerfile’a `npx prisma generate` ekleyin; isteğe bağlı migration.
- `compose/.env.example` dosyasını ekleyin, gizlileri .env’den yönetin.
- Nginx modsecurity direktiflerini imajla uyumlu hale getirin veya kaldırın.

3) Uygulama Güvenliği
- Token’ları HttpOnly cookie’lere taşıyın; Next Middleware ile koruma yapın.
- Swagger’ı prod’da kısıtlayın. Rate limit ihlalinde 429 döndürün.
- 2FA sırlarını şifreleyin. Varsayılan/fallback gizli anahtarları kaldırın.

4) Performans ve Kod Kalitesi
- `orderNo` için sequence/lock çözümü. Redis `KEYS` yerine `SCAN`.
- Web tarafında Server Components/SSR’a kaydırma, ortak auth yardımcıları.
- Test altyapısı (unit/e2e), ESLint/Prettier ve CI genişletmesi.

---

### Referans Dosyalar
- API giriş: `apps/api/src/main.ts`
- JWT Servisi: `apps/api/src/jwt.ts`
- Şifreleme: `apps/api/src/crypto.ts`
- RLS Politikaları: `apps/api/prisma/rls.sql`
- Order servisi: `apps/api/src/orders/orders.service.ts`
- Rate Limit: `apps/api/src/rate-limit.guard.ts`, `apps/api/src/ratelimit.ts`
- Worker: `apps/worker/index.js`, `apps/worker/Dockerfile`
- Web: `apps/web/app/**`, `apps/web/Dockerfile`
- Nginx: `compose/nginx/conf.d/app.conf`
- Compose: `compose/docker-compose.yml`

