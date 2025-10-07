# Frontend Implementation Standards

Bu doküman paneldeki tüm sayfaları backend sözleşmeleriyle uyumlu, koyu/açık tema dostu ve yeniden kullanılabilir bileşen setiyle yönetilebilir hâle getirmek için uyulması gereken standartları özetler. Her PR bu kurallara göre gözden geçirilecektir.

## 1. Tasarım ve Tema Tutarlılığı
- **Renk Tokenları:** Tailwind konfigürasyonundaki `primary`, `accent`, `foreground`, `muted-foreground`, `border` tonları her temada en az 4.5:1 kontrastı koruyacak şekilde kullanılmalıdır. Manuel hex değerleri yalnızca tasarım ekibi onayıyla eklenebilir.
- **Kart ve Bölüm Düzeni:** Bölüm bazlı içerikler `SectionShell` bileşeniyle; metrik kartları `MetricCard` ile gösterilir. Özel kart ihtiyaçları çıktığında mevcut pattern genişletilir, yeni kart elle yazılmaz.
- **Tema Maaske:** `bg-card`, `bg-background`, `border-border` gibi temaya bağlı sınıflar kullanılmalı; `bg-white` gibi sert tonlar yasaktır.
- **İkon ve Rozetler:** Durum etiketleri `StatusPill`, hızlı aksiyon ikonları `Button` + `buttonVariants` kullanılarak eklenir. Koyu temada okunurluk için ikon arka planları `toneClasses` üzerinden seçilir.

## 2. Formlar ve Validasyon
- **FormLayout:** Her yeni form veya modal formu `FormLayout`/`FormLayout.Section` ile düzenlenmeli; sahaya özel hizalama gerekliyse bile `className` üzerinden genişletilmelidir.
- **Form Field Bileşenleri:** Input, select, textarea, checkbox bileşenleri `FormField`, `FormSelect`, `FormTextarea`, `FormCheckbox` ile sağlanır. Doğrudan `<input>` kullanımından kaçınılır.
- **Hata Mesajları:** Backend doğrulama hataları `setFormErrors` benzeri merkezi state ile yönetilir, hata mesajları Form bileşenlerinin `error` prop’una bağlanır. Arayüzde kırmızı tonun koyu temada da görünür olduğundan emin olmak için `text-destructive` kullanılır.
- **Accessible Labels:** Her form kontrolü label içerir, `aria-*` gereksinimleri (ör. yardımcı açıklamalar) `aria-describedby` ile bağlanır.

## 3. Veri Akışları ve RBAC
- **Hook Kullanımı:** API çağrıları mevcut `useApi`, `useOrders`, `useProduct` vb. hook’lar üzerinden yapılmalı. Yeni hook eklenirken `services` katmanındaki endpoint sözleşmesiyle eşlenmelidir.
- **RBAC:** Sayfa düzeyinde `ProtectedRoute`, parça düzeyinde `ProtectedComponent` kullanılmalıdır. RBAC kontrolleri `isAdmin()` gibi yardımcılarla tek satırda tutulur, UI koşulları `permission` prop’u üzerinden yönetilir.
- **Loading/Empty/Error:** Her sayfa üç durum için (yükleniyor, boş, hata) kullanıcıya geri bildirim verir. Loading durumları skeleton veya spinner, hata durumları `ApiError` mesajlarıyla gösterilir.

## 4. Tutarlı Yardımcılar
- **Para Formatı:** `formatCurrency` yardımcı fonksiyonu (Intl API) her sayfada kopyalanmak yerine `@/lib/formatters` altına taşınacaktır. Geçiş tamamlanana kadar kullanılan fonksiyonlar aynı seçeneklerle çağrılmalıdır.
- **Tarih Formatı:** Tarihler `toLocaleDateString` / `toLocaleString` ile ve kullanıcı diline saygılı parametrelerle gösterilir. ISO string doğrudan UI’da kullanılmaz.
- **Placeholder Görseller:** Ürün, mağaza vb. görseller için ortak placeholder bileşeni (`ImagePlaceholder`) Phase 2’de devreye alınacak; resim eksikse 1:1 oranlı SVG kullanılmalı.

## 5. Bileşen Katalogu
- `/components/patterns`: tekrar eden düzenler (SectionShell, MetricCard, StatusPill, FormLayout).
- `/components/forms`: form alanı kontrolleri.
- `/components/ui`: düşük seviye tasarım sistemi bileşenleri (Button, Card, Badge vb.). Bu katman genişletilirken tasarım sistemi ekibiyle uyumlu kalınmalıdır.

## 6. Kod Kalitesi
- **Dosya Boyutu:** Sayfa bileşenleri 300 satırı geçtiğinde alt bileşenlere bölünür. Büyük refactor yapılırken mevcut feature flag’ler korunur.
- **İçe Aktarmalar:** Yol aliasları `@/` ile başlar, relatif importlar yalnızca aynı klasör içerisindeki yardımcılar için kullanılır.
- **Test & Lint:** PR öncesi `npm run lint` veya ilgili `eslint` komutları çalıştırılır. Kritik form/senaryolar için Playwright testleri Phase 4’te zorunlu olacaktır.

## 7. Dokümantasyon
- Her yeni pattern veya form şablonu `docs/frontend-refactor-plan.md` üzerinden faz notlarına işlenir.
- Backend sözleşmesinde değişiklik olduğunda `docs/api-contract-notes.md` güncellenmeli, ilgili hook’larda tipler eşlenmelidir.

Bu standartlar planın ilerleyen fazlarında güncellenecek ve lint kurallarına taşınacaktır. Uyumsuz PR’lar revize edilmeden merge edilmeyecektir.
