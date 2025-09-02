### Fulexo Yönetim Platformu — Üst Düzey Özet (WooCommerce Tabanlı)

Amaç
- WooCommerce mağazalarından sipariş, kargo, iade, fatura ve ürün verilerini tek panelde toplar, hızlı arama/filtre sunar.
- Müşteriler (tenant’lar) için kişiselleştirilmiş görünüm ve izinler sağlar. Tüm kontrol bizde.
- Tamamen kendi sunucumuzda, dış ücretli hizmet olmadan çalışır.

Menüler (Yönetim)
- Dashboard: Toplam sipariş, ciro, iade oranı, kargo SLA; senkron/iş kuyruk durumu.
- Orders: Liste/arama, sipariş detay ve zaman çizelgesi.
- Shipments: Kargo paketleri, takip geçmişi, etiket/protokol indirme.
- Returns: İade listesi ve detayları.
- Invoices: Fatura listesi ve PDF indirme.
- Products: Ürün listesi ve detay.
- Customers: Alıcı bazlı konsolide görünüm.
- Requests: (Yeni) Müşteri talepleri için onay kuyrukları (stok düzeltme vb.).
- Analytics: Trendler, dağılımlar, performans göstergeleri.
- Logs: Senkron ve sistem günlükleri.
- Settings: Mağaza bağlantıları (Woo), sahiplik kuralları, unassigned, görünürlük politikaları, kullanıcı/roller, tema.

Menüler (Müşteri)
- Dashboard: Kendi KPI’ları.
- Orders / Shipments / Returns / Invoices / Products: Kendi verileri.
- Requests: Yeni talep oluşturma ve durum takibi.
- Settings: Profil ve tercihleri.

Sahiplik ve Görünürlük
- Sahiplik: Dış kayıtlar kurallarla doğru müşteriye atanır (order_source/tag/e-posta vb.).
- Görünürlük: Modül/aksiyon/alan/PII ve veri kapsamı (statü, kaynak) müşteri bazlı yönetilir.

Requests & Approvals (Örnek Kullanım)
- Müşteri stok düzeltme veya yeni ürün talebi açar.
- Operasyon inceleyip onaylar veya reddeder. Onay sonrası iç sistemde uygulanır; BL’ye otomatik gitmez.

Ek Özellik (Admin Yazma İzinleri - Opsiyonel)
- Admin kullanıcılar panel üzerinden mağazalara güncelleme gönderebilir (statü, kargo, fatura, iade, envanter) — güvenlik/onarım akışları ve onay ile.
- Yazma işlemleri oran sınırlaması ve "dry-run" önizleme ile yapılır; tüm değişiklikler audit’lenir.

Envanter (Admin)
- Depolar, ürünler/varyantlar, stok ve fiyat güncellemeleri, envanter belgeleri (giriş/çıkış), satınalma siparişleri ve tedarikçi yönetimi panelden yapılabilir (güvenlik/dry‑run/onay ve audit ile).

Teknik (Özet)
- FE: Next.js; BE: NestJS; Worker: BullMQ; DB: PostgreSQL + PgBouncer; Cache/Kuyruk: Valkey/Redis (cluster optional); Dosya: MinIO; Proxy: Nginx; İzleme: Prometheus+Grafana, Loki, Jaeger.
- WooCommerce API limite/performansına uygun; multi-tenant fair-share rate limiting ile ölçeklenebilir.
- Security: AES-256-GCM token şifreleme, RS256 JWT (prod) / HS256 (dev), PostgreSQL RLS ile tenant izolasyonu, Nginx + ModSecurity (OWASP CRS) + CrowdSec ile self‑host WAF/rate-limit ve DDoS azaltımı.

Değer Önerisi
- Tüm operasyonun tek panelde yönetimi; müşteri başına net görünürlük; esnek onay akışları.
- Düşük maliyet: kendi sunucumuzda, dış ücret yok; kontrol bizde.

Zaman Çizelgesi (Özet)
- 6 haftada MVP: 1) Senkron + Orders, 2) Shipments, 3) Returns/Invoices, 4) Products, 5) Requests & Approvals, 6) Güvenlik/raporlar/markalama.

Ek Uygulama İlkeleri (kritik)
- Prisma migrations ile versiyonlu şema; initdb yerine migrate.
- PostgreSQL RLS ile tenant izolasyonu; uygulama `app.tenant_id` bağlamı.
- Connection pooling: PgBouncer transaction mode, 25 connection/pool.
- Secrets yönetimi: prod'da Docker/K8s secrets/SOPS; Woo credentials AES‑256‑GCM envelope encryption + 90 gün rotasyon.
- Multi-tenant rate limiting: Fair-share token allocation, priority queues, circuit breaker.
- Cache strategy: 3-layer (memory/Redis/CDN), cache warming, stampede protection.
- Initial backfill ve gecelik reconciliation işleri; checkpoint ve arşivleme.
- Gözlemlenebilirlik: `/metrics`, alerting kuralları (latency, 5xx, sync lag, 429, token exhaustion).
- Security: OWASP Top 10 korumaları, CSP/HSTS headers, audit logging, GDPR compliance.
- CI/CD: lint/test/build → SBOM/security scan → image → staging/prod deploy; SemVer tag'li yayınlar.