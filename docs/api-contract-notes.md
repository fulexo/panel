# API Contract Notes

Bu doküman frontend refaktörü sırasında temas ettiğimiz endpointlerin sözleşmelerini, beklenen veri alanlarını ve UI tarafındaki kullanım notlarını özetler. Backend ile yapılacak değişikliklerde bu dosya güncellenmelidir.

## Dashboard
- **Endpoint:** `GET /api/dashboard`
- **Query:** `storeId` opsiyonel. Admin kullanıcılar tüm istatistikleri alır, storeId verildiğinde mağaza bazlı sonuç döner.
- **Response (DashboardStats):**
  - `totalOrders: number`
  - `totalProducts: number`
  - `totalCustomers: number`
  - `totalRevenue: number`
  - `recentOrders: Array<{ id, orderNumber, status, total, createdAt }>`
  - `lowStockProducts: Array<{ id, name, stockQuantity }>`
- **UI Beklentileri:**
  - `recentOrders` en fazla 5 kayıt gösterilir.
  - `lowStockProducts` 10’dan az stok için sarı, 0 stok için kırmızı rozet gösterir (StatusPill).
  - Hata mesajları `ApiError` üzerinden kullanıcıya gösterilir; token hatası durumunda yeniden giriş CTA’sı sağlanır.

## Orders
- **Endpoint:** `GET /api/orders`
- **Query:** `page`, `limit`, `search`, `status`, `storeId`.
- **Response:**
  - `data: Array<{ id, orderNumber, status, total, createdAt, customerEmail, billingInfo?: { first_name; last_name } }>`
  - `pagination: { page, limit, total, pages }`
- **Mutations:**
  - `PATCH /api/orders/:id/status` – Body `{ status: "pending"|"processing"|"completed"|"cancelled" }`
  - `PATCH /api/orders/:id/shipping` – Body `{ carrier: string; trackingNumber: string }`
- **UI Beklentileri:**
  - Admin kullanıcılar store filtresi görebilir; son kullanıcı kendi mağazasının siparişlerini görür.
  - Durum güncellemeleri yaptıktan sonra React Query `orders` ve `order` cache’leri invalid edilir.
  - Pagination 10’luk sayfa boyutuna göre hesaplanır, `pagination.total` görünür metriklerde kullanılır.

## Products
- **List Endpoint:** `GET /api/products`
  - Query: `page`, `limit`, `search`, `category`, `storeId`.
  - Response: `data: Array<{ id, name, sku, status, price, salePrice, stockQuantity, category, images: string[], store?: { id, name } }>, pagination`.
- **Detail Endpoint:** `GET /api/products/:id`
  - Response: temel ürün alanları + `description`, `createdAt`, `updatedAt`.
- **Mutations:**
  - `POST /api/products` – Body UI formu ile aynı alanları (name, sku, price, salePrice?, stockQuantity, status, description, category, images?) içerir.
  - `PUT /api/products/:id` – Aynı alanlar, UI `Edit Product` modalından gönderilir.
  - `DELETE /api/products/:id`
- **UI Beklentileri:**
  - `status` alanı `active|draft|archived|inactive`; `StatusPill` ton eşlemesi: active→success, draft→warning, archived/inactive→muted.
  - Görsel listesi boşsa placeholder kartı gösterilir. Phase 2’de `ImagePlaceholder` bileşeni kullanılacak.
  - CSV export butonu backend’den `/api/products/export?format=csv` endpointini tetikleyecek şekilde güncellenecek (TODO).

## Stores
- **Endpoint:** `GET /api/stores`
- **Response:** `data: Array<{ id, name, status, url, lastSyncedAt, connectionStatus }>`
- **Mutations:** create/update/delete/sync/test için `apiClient` methotları hazır. UI revizyonu sırasında `StatusPill` tonları: active→success, paused→warning, archived→muted.

## Shared Error Sözleşmesi
- Tüm endpointler hata durumunda `{ statusCode, message, error? }` şeklinde JSON döndürür.
- `ApiError` sınıfı bu alanları parse eder; UI bileşenleri `error.message` ile kullanıcıya özet sağlar.
- Yetkisiz isteklerde 401 döner, UI `ProtectedRoute` üzerinden login ekranına yönlendirme yapar.

## Inventory Management
- **List Endpoint:** `GET /api/inventory`
  - Query: `page`, `limit`, `search`, `storeId`, `lowStock`.
  - Response: `data: Array<{ id, productId, productName, sku, currentStock, minStock, maxStock, status, lastUpdated }>, pagination`.
- **Request Endpoint:** `GET /api/inventory-requests`
  - Query: `page`, `limit`, `storeId`, `status`.
  - Response: `data: Array<{ id, productId, productName, requestedQuantity, currentStock, reason, status, createdAt, updatedAt }>, pagination`.
- **Approval Endpoint:** `PATCH /api/inventory-requests/:id/approve`
  - Body: `{ approved: boolean, notes?: string }`
- **Mutations:**
  - `POST /api/inventory-requests` – Body: `{ productId, requestedQuantity, reason }`
  - `PATCH /api/inventory/:id` – Body: `{ currentStock, minStock, maxStock }`

## Fulfillment Services
- **List Endpoint:** `GET /api/fulfillment-services`
  - Query: `includeInactive`.
  - Response: `data: Array<{ id, name, description, isActive, pricing, capabilities }>`.
- **Billing Endpoint:** `GET /api/fulfillment-billing-items`
  - Query: `page`, `limit`, `serviceId`, `dateFrom`, `dateTo`.
  - Response: `data: Array<{ id, serviceId, orderId, amount, currency, status, createdAt }>, pagination`.

## Shipping Management
- **Zones Endpoint:** `GET /api/shipping/zones`
  - Query: `includeInactive`.
  - Response: `data: Array<{ id, name, countries, isActive, createdAt }>`.
- **Prices Endpoint:** `GET /api/shipping/prices`
  - Query: `zoneId`.
  - Response: `data: Array<{ id, zoneId, carrier, service, price, currency, minWeight, maxWeight }>`.
- **Options Endpoint:** `GET /api/shipping/options`
  - Query: `customerId`.
  - Response: `data: Array<{ carrier, service, price, estimatedDays, trackingAvailable }>`.

## Returns Management
- **List Endpoint:** `GET /api/returns`
  - Query: `page`, `limit`, `search`, `status`, `storeId`.
  - Response: `data: Array<{ id, orderId, orderNumber, customerEmail, reason, status, requestedAt, processedAt }>, pagination`.
- **Detail Endpoint:** `GET /api/returns/:id`
  - Response: temel return alanları + `items`, `refundAmount`, `notes`.
- **Mutations:**
  - `POST /api/returns` – Body: `{ orderId, reason, items: Array<{ productId, quantity, reason }> }`
  - `PATCH /api/returns/:id/status` – Body: `{ status: "pending"|"approved"|"rejected"|"completed" }`

## Support Tickets
- **List Endpoint:** `GET /api/support-tickets`
  - Query: `page`, `limit`, `status`, `priority`, `assigneeId`.
  - Response: `data: Array<{ id, subject, status, priority, assigneeId, createdAt, updatedAt }>, pagination`.
- **Detail Endpoint:** `GET /api/support-tickets/:id`
  - Response: ticket detayları + `messages`.
- **Messages Endpoint:** `GET /api/support-tickets/:id/messages`
  - Response: `data: Array<{ id, content, authorId, authorName, createdAt, isInternal }>`.
- **Mutations:**
  - `POST /api/support-tickets` – Body: `{ subject, description, priority }`
  - `POST /api/support-tickets/:id/messages` – Body: `{ content, isInternal }`
  - `PATCH /api/support-tickets/:id` – Body: `{ status, priority, assigneeId }`

## Cart Management
- **Get Endpoint:** `GET /api/cart/:storeId`
  - Response: `{ items: Array<{ productId, quantity, price, total }>, total, itemCount }`.
- **Add Endpoint:** `POST /api/cart/:storeId/items`
  - Body: `{ productId, quantity }`.
- **Update Endpoint:** `PATCH /api/cart/:storeId/items/:productId`
  - Body: `{ quantity }`.
- **Remove Endpoint:** `DELETE /api/cart/:storeId/items/:productId`
- **Clear Endpoint:** `DELETE /api/cart/:storeId`

## Error Handling & Loading States

### Standard Error Response
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### Loading States
- **Query Loading:** `isLoading: boolean`
- **Mutation Loading:** `isPending: boolean`
- **Error State:** `error: ApiError | null`
- **Empty State:** `data: null | []`

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (token expired/invalid)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (business logic error)
- `500` - Internal Server Error

## Açık Aksiyonlar
1. Products CSV export ve Quick Action butonlarının backend endpointlerine bağlanması (unique ticket).
2. Orders shipping update modalı Phase 2'de yeniden yazılacak, `PATCH /api/orders/:id/shipping` ile entegre edilecek.
3. Store sync ve connection test aksiyonları yeni SectionShell düzenine taşınırken `apiClient` hataları toplanıp kullanıcıya gösterilecek.
4. Support tickets ve returns modüllerinin Phase 3'te backend entegrasyonu.
5. Cart management'in Phase 2'de backend entegrasyonu.

Bu doküman Backend ile yapılacak haftalık senkronlarda güncellenecek; değişiklik olduğunda commit mesajına `docs: update api contract notes` etiketi eklenmelidir.
