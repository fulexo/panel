# Frontend Code Mapping & Component Inventory

Bu doküman paneldeki tüm sayfaların veri akışları, kullanılan hook'lar, modallar, formlar ve görsel bileşenlerin kapsamlı envanterini içerir. Frontend refaktörü sırasında referans olarak kullanılacaktır.

## Sayfa Envanteri

### Ana Sayfalar (Phase 1 - Pilot)
| Sayfa | Dosya Yolu | Durum | Kullanılan Pattern'ler | Hook'lar | Modallar |
|-------|------------|-------|----------------------|----------|----------|
| Dashboard | `/app/dashboard/page.tsx` | ✅ Tamamlandı | MetricCard, SectionShell | useDashboardStats, useOrders, useStores | - |
| Orders | `/app/orders/page.tsx` | ✅ Tamamlandı | StatusPill, MetricCard | useOrders, useUpdateOrderStatus | CreateShipmentModal |
| Products | `/app/products/page.tsx` | ✅ Tamamlandı | StatusPill, MetricCard, ImagePlaceholder | useProducts, useProduct | ProductModal |
| Orders Create | `/app/orders/create/page.tsx` | ✅ Tamamlandı | FormLayout, FormField | useOrders, useProducts | - |
| Orders Detail | `/app/orders/[id]/page.tsx` | ✅ Tamamlandı | StatusPill, ImagePlaceholder | useOrder, useUpdateOrderStatus | - |
| Orders Approvals | `/app/orders/approvals/page.tsx` | ✅ Tamamlandı | StatusPill, SectionShell | useOrders | - |

### Operasyonel Modüller (Phase 2)
| Sayfa | Dosya Yolu | Durum | Kullanılan Pattern'ler | Hook'lar | Modallar |
|-------|------------|-------|----------------------|----------|----------|
| Inventory | `/app/inventory/page.tsx` | 🔄 Kısmen | SectionShell (kısmen) | useInventory, useInventoryRequests | ProductModal |
| Inventory Approvals | `/app/inventory/approvals/page.tsx` | ✅ Tamamlandı | SectionShell, FormLayout | useInventoryApprovals | - |
| Fulfillment | `/app/fulfillment/page.tsx` | 🔄 Kısmen | - | useFulfillmentServices | - |
| Shipping | `/app/shipping/page.tsx` | 🔄 Kısmen | - | useShippingZones | - |
| Shipping Calculator | `/app/shipping/calculator/page.tsx` | 🔄 Kısmen | - | useShippingOptions | - |
| Stores | `/app/stores/page.tsx` | 🔄 Kısmen | - | useStores | - |
| Store Detail | `/app/stores/[id]/page.tsx` | 🔄 Kısmen | - | useStore | - |

### Destek ve Bildirim (Phase 3)
| Sayfa | Dosya Yolu | Durum | Kullanılan Pattern'ler | Hook'lar | Modallar |
|-------|------------|-------|----------------------|----------|----------|
| Customers | `/app/customers/page.tsx` | ❌ Bekliyor | - | useCustomers, useCreateCustomer | CustomerModal |
| Returns | `/app/returns/page.tsx` | ❌ Bekliyor | - | useReturns | - |
| Return Detail | `/app/returns/[id]/page.tsx` | ❌ Bekliyor | - | useReturn | - |
| Reports | `/app/reports/page.tsx` | ✅ Tamamlandı | MetricCard | useDashboardStats | - |
| Settings | `/app/settings/page.tsx` | ❌ Bekliyor | - | useMe | - |
| Cart | `/app/cart/page.tsx` | ✅ Tamamlandı | ImagePlaceholder | useCart | - |

## Bileşen Kataloğu

### Pattern Bileşenleri (`/components/patterns/`)
| Bileşen | Dosya | Durum | Kullanım Alanı | Tema Desteği |
|---------|-------|-------|----------------|--------------|
| FormLayout | `FormLayout.tsx` | ✅ Tamamlandı | Tüm formlar | ✅ Koyu/Açık |
| MetricCard | `MetricCard.tsx` | ✅ Tamamlandı | Dashboard, özet kartları | ✅ Koyu/Açık |
| SectionShell | `SectionShell.tsx` | ✅ Tamamlandı | Bölüm başlıkları | ✅ Koyu/Açık |
| StatusPill | `StatusPill.tsx` | ✅ Tamamlandı | Durum etiketleri | ✅ Koyu/Açık |
| ImagePlaceholder | `ImagePlaceholder.tsx` | ✅ Tamamlandı | Görsel boş durumları | ✅ Koyu/Açık |

### UI Bileşenleri (`/components/ui/`)
| Bileşen | Dosya | Durum | Kullanım Alanı |
|---------|-------|-------|----------------|
| Button | `button.tsx` | ✅ Tamamlandı | Tüm aksiyon butonları |
| Card | `card.tsx` | ✅ Tamamlandı | Kart düzenleri |
| Dialog | `dialog.tsx` | ✅ Tamamlandı | Modal temel yapısı |
| Input | `input.tsx` | ✅ Tamamlandı | Form alanları |
| Label | `label.tsx` | ✅ Tamamlandı | Form etiketleri |
| Badge | `badge.tsx` | ✅ Tamamlandı | StatusPill temel yapısı |
| Tabs | `tabs.tsx` | ✅ Tamamlandı | Sekme düzenleri |

### Form Bileşenleri (`/components/forms/`)
| Bileşen | Dosya | Durum | Kullanım Alanı |
|---------|-------|-------|----------------|
| FormField | `FormField.tsx` | ✅ Tamamlandı | Input alanları |
| FormSelect | `FormSelect.tsx` | ✅ Tamamlandı | Select alanları |
| FormTextarea | `FormTextarea.tsx` | ✅ Tamamlandı | Textarea alanları |
| FormCheckbox | `FormCheckbox.tsx` | ✅ Tamamlandı | Checkbox alanları |

### Modal Bileşenleri (`/components/modals/`)
| Bileşen | Dosya | Durum | Kullanım Alanı |
|---------|-------|-------|----------------|
| CreateShipmentModal | `CreateShipmentModal.tsx` | ✅ Tamamlandı | Gönderi oluşturma |
| ProductModal | `ProductModal.tsx` | ❌ Bekliyor | Ürün oluşturma/düzenleme |
| CustomerModal | `CustomerModal.tsx` | ❌ Bekliyor | Müşteri oluşturma/düzenleme |

## Hook Envanteri

### API Hook'ları (`/hooks/useApi.ts`)
| Hook | Kullanım Alanı | Durum | Query Key |
|------|----------------|-------|-----------|
| useDashboardStats | Dashboard | ✅ Tamamlandı | `['dashboard-stats', storeId]` |
| useOrders | Sipariş listesi | ✅ Tamamlandı | `['orders', params]` |
| useOrder | Sipariş detayı | ✅ Tamamlandı | `['orders', id]` |
| useProducts | Ürün listesi | ✅ Tamamlandı | `['products', params]` |
| useProduct | Ürün detayı | ✅ Tamamlandı | `['products', id]` |
| useCustomers | Müşteri listesi | ✅ Tamamlandı | `['customers', params]` |
| useStores | Mağaza listesi | ✅ Tamamlandı | `['stores']` |
| useInventory | Stok listesi | ✅ Tamamlandı | `['inventory', params]` |
| useInventoryRequests | Stok talepleri | ✅ Tamamlandı | `['inventory-requests', params]` |
| useInventoryApprovals | Stok onayları | ✅ Tamamlandı | `['inventory-approvals', params]` |
| useFulfillmentServices | Fulfillment servisleri | ✅ Tamamlandı | `['fulfillment-services']` |
| useShippingZones | Kargo bölgeleri | ✅ Tamamlandı | `['shipping', 'zones']` |
| useShippingOptions | Kargo seçenekleri | ✅ Tamamlandı | `['shipping', 'options']` |
| useReturns | İade listesi | ✅ Tamamlandı | `['returns', params]` |
| useSupportTickets | Destek talepleri | ✅ Tamamlandı | `['support-tickets', params]` |
| useCart | Sepet | ✅ Tamamlandı | `['cart', storeId]` |

### Utility Hook'ları
| Hook | Dosya | Kullanım Alanı | Durum |
|------|-------|----------------|-------|
| useAuth | `AuthProvider.tsx` | Kimlik doğrulama | ✅ Tamamlandı |
| useRBAC | `useRBAC.ts` | Yetki kontrolü | ✅ Tamamlandı |
| useApp | `AppContext.tsx` | Uygulama durumu | ✅ Tamamlandı |

## Veri Akışı Haritası

### Dashboard Veri Akışı
```
useDashboardStats → MetricCard → Dashboard UI
useOrders → RecentOrders → Dashboard UI
useStores → StoreFilter → Dashboard UI
```

### Orders Veri Akışı
```
useOrders → OrdersTable → StatusPill
useUpdateOrderStatus → Mutation → Cache Invalidation
CreateShipmentModal → useCreateShipment → Order Update
```

### Products Veri Akışı
```
useProducts → ProductsTable → StatusPill + ImagePlaceholder
useProduct → ProductDetail → FormLayout
ProductModal → useCreateProduct/useUpdateProduct → Cache Invalidation
```

## Tema ve Stil Durumu

### Tailwind Konfigürasyonu
- ✅ Temel renk paleti tanımlı
- ✅ Koyu/açık tema desteği
- ✅ Spacing ve typography tokenları
- ❌ WCAG AA kontrast doğrulaması eksik

### Renk Tokenları
- ✅ `primary`, `accent`, `foreground`, `muted-foreground`
- ✅ `border`, `card`, `background`
- ✅ `destructive`, `warning`, `success`, `info`
- ❌ Kontrast oranları doğrulanmamış

## Eksik Bileşenler

### Phase 2 için Gerekli
- [ ] CurrencyProvider (EUR varsayılan)
- [ ] ConversationPane (destek mesajlaşması)
- [ ] VirtualList (bildirim listesi)

### Phase 3 için Gerekli
- [ ] NotificationList
- [ ] CalendarWidget (gelişmiş)
- [ ] SupportTicketModal

### Phase 4 için Gerekli
- [ ] Storybook konfigürasyonu
- [ ] Visual regression test setup
- [ ] Accessibility test utilities

## API Sözleşmesi Durumu

### Tamamlanan Endpoint'ler
- ✅ Dashboard stats
- ✅ Orders CRUD
- ✅ Products CRUD
- ✅ Customers CRUD
- ✅ Stores CRUD
- ✅ Inventory management
- ✅ Shipping zones/prices

### Eksik Endpoint'ler
- ❌ Support tickets
- ❌ Returns management
- ❌ Notifications
- ❌ Calendar events

## Performans Metrikleri

### Mevcut Durum
- ✅ React Query cache yönetimi
- ✅ Lazy loading (kısmen)
- ❌ Bundle size analizi
- ❌ Core Web Vitals ölçümü

### Hedef Metrikler (Phase 1)
- LCP ≤ 2.5s
- FID ≤ 100ms
- CLS ≤ 0.1
- A11y skoru ≥ 95

## Sonraki Adımlar

1. **Phase 0 Tamamlama**: Kontrast doğrulaması ve API sözleşmesi güncellemeleri
2. **Phase 1 Devam**: Eksik pattern bileşenlerinin tamamlanması
3. **Phase 2 Başlangıç**: Operasyonel modüllerin refaktörü
4. **Phase 3 Hazırlık**: Destek ve bildirim bileşenlerinin tasarımı

---

*Son güncelleme: 2024-12-19*
*Güncelleyen: Frontend Refactor Team*
