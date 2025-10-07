# Frontend Alignment & Modernization Plan

Bu çalışma mevcut paneldeki tüm sayfaları backend sözleşmeleriyle daha sıkı hizalamak, UX tutarlılığını artırmak ve koyu/açık temada erişilebilir kontrast seviyelerini korumak amacıyla yürütülecek kapsamlı bir modernizasyon projesidir. Aşağıdaki fazlar ile ilerleyeceğiz. Her faz tamamlama kriterleri ve çıktıları netleşmeden ilerlenmeyecek.

## Program Özeti ve Yol Haritası

| Faz | Tahmini Süre | Kadro | Kritik Başlangıç Miladı | Başlıca Çıktı |
| --- | --- | --- | --- | --- |
| Phase 0 | 1 sprint | FE Core Squad + Design Systems | API sözleşmesi mock'ları onaylandı | Standart seti ve kod haritası |
| Phase 1 | 2 sprint | FE Core Squad + QA | Pilot sayfa bileşen seti freeze edildi | Dashboard/Orders/Products revizyonu |
| Phase 2 | 3 sprint | FE Ops Squad + Backend | Currency provider prototipi devreye alındı | Operasyon modüllerinde ortak UX |
| Phase 3 | 2 sprint | FE Ops Squad + Support | Mesajlaşma komponentleri Storybook'ta yayınlandı | Destek/bildirim akışlarında performans artışı |
| Phase 4 | 1 sprint | FE Core + QA Automation | Görsel regresyon pipeline'ı hazır | E2E+a11y doğrulamaları |
| Phase 5 | 1 sprint (paralel) | FE Enablement + DX | Eğitim materyalleri taslağı hazır | Yaygınlaştırma ve eğitim dökümantasyonu |

**Notlar:** Phase 4 ve Phase 5, önceki fazların stabilize edildiği sprintin sonuna eklemlenerek yürütülecek. Phase 2 ve Phase 3 için backend tarafında kalan kontrat güncellemeleri kritik bağımlılık olarak takipte tutulacak.

## Phase 0 – Keşif ve Standartların Netleştirilmesi
- **Kod Haritası:** Sayfa bazında mevcut veri akışları, kullanılan hook'lar, modallar, formlar ve görsel bileşenlerin envai listesini çıkar.
- **Design System Temelleri:** Tailwind tokenları, renk paleti, spacing ve tipografi için erişilebilir kontrast eşikleri (WCAG AA) belirlenir.
- **API Sözleşmesi Doğrulaması:** Backend ekibiyle JSON şemaları, hata durumları ve loading/empty state beklentilerini kodda anotasyonlayacak referans doküman oluşturulur.
- **Çıktı:** paylaşılacak `docs/frontend-standards.md` & `docs/api-contract-notes.md` taslakları.
- **Tamamlama Kriterleri:** Tüm ekranların veri akışı haritası Miro/Whimsical üzerinde yayınlandı, design token seti Figma/Zeroheight'ta onaylandı, iki doküman PR sürecinden geçip ana branche alındı.
- **Başarı Metrikleri:** Kritik sayfa envanterinin %100'ünün belgelenmesi, a11y kontrast kontrolünde ≥ AA (`4.5:1`) uyum, backend kontratlarının en az %90'ının JSON örnekleriyle eşleştirilmesi.
- **Bağımlılıklar:** Swagger / OpenAPI çıktıları, tasarım ekibinden güncel palette, ürün yönetiminden kri̇tik senaryo listesi.
- **Paydaşlar:** FE Core Squad (owner), Backend API ekibi, Design Systems ekibi, Product Ops.

## Phase 1 – Pilot Sayfa Revizyonu
- **Hedef Sayfalar:** `dashboard`, `orders`, `products` ana sayfaları ve bunlara bağlı kritik modallar.
- **Bileşen Ayrıştırma:** Kart, tablo, filtre çubuğu, durum rozetleri gibi tekrar eden parçalar `/components/patterns` altında yeniden kullanılır hâle getirilir.
- **Form Şablonu:** Rehber niteliğinde `FormLayout` ve `FormField` bileşenleri oluşturulur. React Hook Form / Zod (veya mevcut custom hook) ile validasyon merkezi hâle getirilir.
- **Tema & Kontrast:** Açık ve koyu tema için yeni tokenların uygulanması, rol tabanlı renklerin kontrast denetimi (ör. rozet tonları ≥ 4.5:1).
- **Çıktı:** pilot sayfalarda tutarlı görünüm, dokümante edilmiş yeni bileşenler, kontrast testi raporu (`reports/theme-contrast-phase1.md`).
- **Tamamlama Kriterleri:** Pilot sayfaların production parity ile staging'de çalışması, tüm formlar `FormLayout` üstünden gitmesi, yeni pattern'lerin Storybook öykülerinin oluşturulması, kontrast raporunun QA tarafından imzalanması.
- **Başarı Metrikleri:** Core Web Vitals'ta LCP ≤ 2.5s, a11y denetiminde kritik hata sayısının 0 olması, yeni pattern bileşenlerinin reuse oranının ≥ %70 (pilot sayfalardaki bileşenler içinde).
- **Bağımlılıklar:** Phase 0 design tokenları, QA için Playwright senaryoları, backend'de değişen endpoint olmadığı onayı.
- **Paydaşlar:** FE Core Squad (owner), QA Automation, Design Systems, Product Marketing (pilot duyurusu).

### Phase 1 – Güncel Durum Notları (WIP)
- Dashboard sayfası yeni `MetricCard` ve `SectionShell` pattern'lerini kullanıyor; hızlı aksiyonlar admin RBAC ile filtreleniyor ve kontrast/focus state'leri yeniden düzenlendi.
- Orders sayfasında filtreler, özet kartları ve tablo alanı aynı pattern setine taşındı; `StatusPill` ile durum renkleri backend statüleriyle eşleştirildi.
- Products sayfası filtre, özet kartları ve tablo için pattern'lere geçirildi; `StatusPill`, `MetricCard` ve yeni `handleExport`/`quickActions` akışı koyu/açık temada tutarlılığı sağlıyor.
- `FormLayout` bileşeni tanımlandı ve Products oluşturma modali bu şablonu, mevcut form alanı bileşenlerini (FormField/FormSelect/FormTextarea) kullanacak şekilde yeniden düzenlendi.
- Pattern kütüphanesine `StatusPill` eklendi; tablo ve kartların koyu/açık tema kontrast değerleri WCAG AA hedefiyle güncellendi.
- Orders create sayfası `FormLayout` ve yeni pattern bileşenleriyle yeniden kurgulandı; validasyon akışı merkezi state üzerinden yönetiliyor, koyu/açık tema kontrastı iyileştirildi.
- Görsel/placeholder standardizasyonu için `ImagePlaceholder` bileşeni eklendi ve orders/products ekranlarına uygulandı.
- Para formatlama yardımcıları `@/lib/formatters` altına taşındı; dashboard, orders ve products sayfaları ortak helper'ı kullanıyor.
- `formatCurrency` varsayılanı Euro'ya çekilerek panel genelinde para birimi tabanı EUR oldu; orders tablosu, shipment rate modalları ve store istatistikleri dahil olmak üzere tüm finansal ekranlar formatter üzerinden çalışıyor.
- Products listesinde görseller için tutarlı `ImagePlaceholder` kullanımı devreye alındı, küçük thumbnail alanlarında label gizleme desteği eklendi.
- Reports, returns ve cart gibi trafik yüksek ekranlar para formatını `@/lib/formatters` aracına taşıdı; EUR bazlı locale/para ayarları tek noktadan yönetiliyor.
- Envanter yaratma formu ve cart görünümünde görsel eksikliği `ImagePlaceholder` ile ele alındı, kullanıcıya boş durumlarda da tutarlı geri bildirim sağlanıyor.
- Shipping yönetimi (zones/calculator) ve fulfillment faturalandırma ekranları paylaşılan `formatCurrency`/`formatNumber` yardımcılarını tüketiyor; EUR tabanlı konfigurasyon ortaklaştırıldı.
- Order detail görünümü fulfillment satırlarıyla birlikte yeni formatter'ları kullanıyor; tüm TRY hesaplamaları aynı yardımcıyı paylaşıyor.
- Order approvals listesi ve sipariş kalemleri ortak formatter'a geçti, onay akışında manuel `toFixed` kullanımına ihtiyaç kalmadı.
- Returns detayındaki ürün kartları `ImagePlaceholder` ile güncellendi; item bazlı görsel yoksa bile tutarlı görsel blok korunuyor.
- Orders tablosu ve CreateShipmentModal fiyat gösterimleri `formatCurrency` üzerinden EUR bazlı çalışıyor; inventory approvals ve store detayları da aynı standarda çekildi.
- Açık: analytics exportları ve invoice PDF/CSV çıktıları henüz gözden geçirilmedi; çoklu para birimi desteği için global ayar katmanı tasarımı Phase 2'de netleşecek.

## Phase 2 – Operasyonel Modüller
- **Hedef Sayfalar:** `inventory`, `inventory/approvals`, `fulfillment`, `shipping`, `shipping/calculator`, `stores`, `stores/[id]`.
- **Görsel & Placeholder Standardizasyonu:** Ürün/görsel galerilerinde resim olmadığında gösterilecek placeholder seti (SVG tabanlı) uygulanır.
- **Süreç Modalları:** Onay/red/işlem modallarında tutarlı buton sıralaması, odak kapanışları, escape davranışı ve a11y etiketleri.
- **Çıktı:** operasyon sayfalarında birleşik UX, modal bileşen kullanım rehberi, smoke test scriptleri.
- **Çalışma Kalemleri (Sprint Bazlı):**
  - `inventory` & `inventory/approvals`: stok kartlarını `SectionShell` ile hizalama, yeni ürün isteklerinde `ImagePlaceholder` + `formatCurrency` kullanımı için QA checklist’i çıkart.
  - `fulfillment`: faturalandırma tablosu ve modallarını `FormLayout`/`StatusPill` ile yeniden yapılandır; euro bazlı toplamların PDF/ihracat tarafında doğrulanması için backend ile sözleşme ekle.
  - `shipping` & `shipping/calculator`: zone/price CRUD formlarını `FormLayout`a taşı, taşıyıcı kargo ücretlerini `formatCurrency` ile render et; sandbox environment’ta gerçek API cevaplarıyla smoke test planı hazırla.
  - `stores/[id]`: senkronizasyon loglarını `SectionShell` ile bölümlendir, placeholder görselleri (mağaza logosu yokken) için `ImagePlaceholder` varyantı ekle.
  - `common`: `formatCurrency`/`formatNumber` için tek bir `CurrencyProvider` prototipi (EUR varsayılanı) hazırlayıp Phase 3’te çoklu para birimine zemin hazırla.

## Phase 3 – Destek, Bildirim ve Takvim Akışları
- **Hedef Sayfalar:** `support`, `support/[id]`, `notifications`, `calendar`, `returns`, `returns/[id]`, `profile`, `settings`.
- **Mesajlaşma & Listeleme Şablonları:** Konuşma thread'lerini yönetecek komponent (ör. `ConversationPane`), bildirim listeleri için sanal liste optimizasyonu.
- **Tema Senkronizasyonu:** İnteraktif highlight / hover / skeleton tonları koyu temada yeniden dengelenir.
- **Çıktı:** destek ve bildirim akışlarında performans iyileşmesi, thread bileşen dökümantasyonu.
- **Ön Hazırlık:** Euro tabanlı `formatCurrency` kullanımının destek ticket exportları ve iCalendar entegrasyonlarıyla uyumu doğrulanacak; analytics exportları/invoice CSV'leri Phase 3 başlangıcında kontrol listesine eklenecek.

## Phase 4 – Kapsayıcı Test ve Ölçümleme
- **Tasarım Doğrulaması:** Storybook veya benzeri kataloğa yeni bileşenlerin taşınması, görsel regresyon testi (Playwright + Percy/Chromatic alternatifi) eklentisi.
- **Erişilebilirlik Ölçümleri:** Lighthouse + axe-core doğrulaması, kritik sayfalar için keyboard-only walkthrough checklist.
- **Gözden Geçirme:** Backend ile entegrasyon testleri (API sözleşmesi ile snapshotlar) ve QA onayı.
- **Çıktı:** `reports/final-validation.md`, release notu taslağı.

## Phase 5 – Yaygınlaştırma ve Eğitim
- **Kod Paylaşımı:** Bileşen kullanım rehberi, form şablonu best practice dökümanı.
- **Takım Onboarding:** Pair-programming oturumları, Loom/topluluk demoları.
- **Yaygınlaştırma:** Yeni standartların PR template'lerine eklenmesi ve lint kurallarıyla desteklenmesi.

---

### Başlangıç Ön Koşulları
- Backend sözleşmelerinin güncel olduğundan emin olun (API mockları veya Swagger referansları alın).
- Tasarım ekibinden koyu/açık tema palette onayı alın.
- Planlanan bileşenlerin Storybook desteği talep edilirse repo altyapısı hazır hâle getirilsin.

### Takip Yapısı
- Her faz için kanban sütunu açılacak, kararlar `docs/frontend-decisions.md` dosyasında kayda alınacak.
- Faz tamamlandığında QA kontrol listesi ve kontrast ölçümleri raporlanacak.
- **Tamamlananlar:** `inventory/approvals` ekranı SectionShell + FormLayout kullanacak şekilde yenilendi; inceleme modalı FormSelect/FormTextarea bileşenleriyle erişilebilir hâle getirildi.
