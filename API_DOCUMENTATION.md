# API Documentation

**Last Updated:** October 13, 2025  
**API Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api` (development)

## 📚 Overview

The Fulexo API is a RESTful service built with NestJS that provides comprehensive endpoints for managing multi-tenant fulfillment operations.

**Interactive Documentation:** http://localhost:3000/docs (Swagger UI)

## 🔐 Authentication

All API endpoints (except public auth routes) require authentication via JWT tokens.

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "CUSTOMER",
    "tenantId": "tenant-uuid"
  }
}
```

### Using Tokens

Include the access token in the Authorization header:

```http
GET /api/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Two-Factor Authentication

If 2FA is enabled:

1. Login returns `{ "requiresTwoFactor": true, "tempToken": "..." }`
2. Verify with TOTP code:

```http
POST /api/auth/2fa/verify
Content-Type: application/json

{
  "tempToken": "temporary-token",
  "code": "123456"
}
```

---

## 📦 Core Endpoints

### Stores

#### List Stores
```http
GET /api/stores?page=1&limit=20&search=keyword
Authorization: Bearer {token}
```

#### Create Store
```http
POST /api/stores
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My WooCommerce Store",
  "url": "https://mystore.com",
  "consumerKey": "ck_...",
  "consumerSecret": "cs_...",
  "customerId": "customer-uuid"
}
```

#### Sync Store
```http
POST /api/stores/{storeId}/sync
Authorization: Bearer {token}
```

#### Test Connection
```http
POST /api/stores/test-connection
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://mystore.com",
  "consumerKey": "ck_...",
  "consumerSecret": "cs_..."
}
```

---

### Orders

#### List Orders
```http
GET /api/orders?page=1&limit=20&status=pending&storeId={storeId}
Authorization: Bearer {token}
```

#### Get Order Details
```http
GET /api/orders/{orderId}
Authorization: Bearer {token}
```

#### Update Order Status
```http
PATCH /api/orders/{orderId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "processing",
  "notes": "Order is being processed"
}
```

---

### Products

#### List Products
```http
GET /api/products?page=1&limit=50&search=keyword&status=active
Authorization: Bearer {token}
```

#### Get Product
```http
GET /api/products/{productId}
Authorization: Bearer {token}
```

#### Create Product
```http
POST /api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "storeId": "store-uuid",
  "sku": "PROD-001",
  "name": "Product Name",
  "price": 99.99,
  "stock": 100,
  "active": true
}
```

#### Update Product
```http
PUT /api/products/{productId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Product Name",
  "price": 89.99,
  "stock": 150
}
```

#### Delete Product
```http
DELETE /api/products/{productId}
Authorization: Bearer {token}
```

---

### Shipments

#### Get Shipping Rates
```http
POST /api/shipments/{orderId}/rates
Authorization: Bearer {token}
Content-Type: application/json

{
  "parcels": [
    {
      "weight": 2.5,
      "length": 30,
      "width": 20,
      "height": 15,
      "weight_unit": "kg",
      "dimension_unit": "cm"
    }
  ]
}
```

#### Create Shipment
```http
POST /api/shipments/{orderId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "rateId": "rate-uuid",
  "carrier": "ups",
  "service": "ground",
  "parcels": [...]
}
```

#### Track Shipment
```http
GET /api/shipments/track/{carrier}/{trackingNumber}
Authorization: Bearer {token}
x-tenant-id: {tenantId}
```

---

### Customers

#### List Customers
```http
GET /api/customers?page=1&limit=20&role=CUSTOMER
Authorization: Bearer {token}
```

#### Create Customer
```http
POST /api/customers
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "customer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER",
  "password": "secure_password"
}
```

---

### Inventory

#### List Inventory Requests
```http
GET /api/inventory/requests?status=pending&type=stock_adjustment
Authorization: Bearer {token}
```

#### Create Inventory Request
```http
POST /api/inventory/requests
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "stock_adjustment",
  "storeId": "store-uuid",
  "productId": "product-uuid",
  "title": "Stock adjustment request",
  "description": "Need to adjust stock levels",
  "requestedQuantity": 100
}
```

#### Approve/Reject Request
```http
PATCH /api/inventory/requests/{requestId}/review
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "approved",
  "reviewNotes": "Approved for processing"
}
```

---

### Reports

#### Get Dashboard Stats
```http
GET /api/reports/dashboard?storeId={storeId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "totalOrders": 150,
  "totalProducts": 500,
  "totalCustomers": 75,
  "totalRevenue": 45000,
  "lowStockProducts": 12
}
```

#### Get Sales Report
```http
GET /api/reports/sales?storeId={storeId}
Authorization: Bearer {token}
```

#### Get Product Report
```http
GET /api/reports/products?storeId={storeId}
Authorization: Bearer {token}
```

#### Get Customer Report
```http
GET /api/reports/customers?storeId={storeId}
Authorization: Bearer {token}
```

---

### Calendar

#### List Events
```http
GET /api/calendar/events?startDate=2025-10-01&endDate=2025-10-31
Authorization: Bearer {token}
```

#### Create Event
```http
POST /api/calendar/events
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Warehouse Closed",
  "description": "Public holiday",
  "startTime": "2025-10-13T00:00:00Z",
  "endTime": "2025-10-13T23:59:59Z",
  "type": "holiday"
}
```

---

## 🔧 Utility Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-13T10:00:00.000Z",
  "uptime": 3600,
  "service": "api",
  "version": "1.0.0",
  "checks": {
    "database": true,
    "redis": true
  }
}
```

### Metrics (Prometheus)

```http
GET /metrics
```

Returns Prometheus-formatted metrics for monitoring.

### API Documentation (Swagger)

```http
GET /docs
```

Interactive Swagger UI for exploring all endpoints.

### JWKS Endpoint

```http
GET /auth/.well-known/jwks.json
```

Public key set for JWT verification.

---

## 📝 Request/Response Formats

### Pagination

All list endpoints support pagination:

**Request:**
```http
GET /api/orders?page=2&limit=50
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 500,
    "totalPages": 10
  }
}
```

### Error Responses

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service down |

---

## 🔑 Authorization & Permissions

### Roles

- **ADMIN**: Full access to all resources across all tenants
- **CUSTOMER**: Access to own stores and related resources

### Permission System

Permissions follow the format: `resource.action`

Examples:
- `stores.view` - View stores
- `stores.manage` - Create, update, delete stores
- `orders.view` - View orders
- `orders.manage` - Manage orders
- `inventory.approve` - Approve inventory requests

### Tenant Isolation

All API calls are automatically scoped to the authenticated user's tenant. Admin users can access all tenants.

---

## 🚀 Rate Limiting

Default rate limits:
- **Global**: 100 requests per minute per IP
- **Auth endpoints**: 20 requests per minute per IP
- **File uploads**: 10 requests per minute per user

Rate limit headers:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1697200000
```

---

## 🌐 CORS Configuration

Allowed origins (development):
- http://localhost:3000
- http://localhost:3001
- http://127.0.0.1:3000
- http://127.0.0.1:3001

For production, configure via environment variables:
- `DOMAIN_APP`
- `NEXT_PUBLIC_APP_URL`
- `SHARE_BASE_URL`

---

## 📊 Monitoring & Observability

### Metrics Endpoint

```http
GET /metrics
Authorization: Bearer {token}
```

Available metrics:
- `http_request_duration_seconds` - Request latency
- `http_requests_total` - Total requests
- `process_cpu_usage` - CPU usage
- `process_memory_usage` - Memory usage
- Custom business metrics

### Health Checks

```bash
# API Health
curl http://localhost:3000/health

# Worker Health  
curl http://localhost:3002/health

# Database Health
docker compose exec postgres pg_isready
```

---

## 🔄 Webhooks

### WooCommerce Webhooks

Configure webhook URL in WooCommerce:
```
https://api.yourdomain.com/api/woo/webhook
```

Supported events:
- `order.created`
- `order.updated`
- `product.created`
- `product.updated`

---

## 📖 Additional Resources

- **Swagger UI**: http://localhost:3000/docs
- **Postman Collection**: Available in `/postman` directory
- **GraphQL Playground**: (if enabled) http://localhost:3000/graphql
- **API Contract**: See [docs/api-contract-notes.md](./docs/api-contract-notes.md)

---

## 🐛 Debugging

### Enable Debug Logging

```bash
# Set environment variable
LOG_LEVEL=debug

# Restart API
docker compose restart api
```

### View API Logs

```bash
# All logs
docker compose logs -f api

# Error logs only
docker compose logs api 2>&1 | grep ERROR

# Specific endpoint
docker compose logs api 2>&1 | grep "/api/orders"
```

### Common Issues

1. **401 Unauthorized**
   - Check token expiration
   - Verify JWT_SECRET matches between environments
   - Ensure cookies are being sent

2. **403 Forbidden**
   - Check user permissions
   - Verify tenant access
   - Review RBAC configuration

3. **429 Rate Limited**
   - Implement request throttling on client
   - Contact admin to increase limits

---

## 💡 Best Practices

### Making API Calls

```typescript
// ✅ Good: Proper error handling
try {
  const response = await apiClient.getOrders();
  return response.data;
} catch (error) {
  if (error.status === 401) {
    // Handle authentication error
    router.push('/login');
  } else {
    // Handle other errors
    showError(error.message);
  }
}

// ❌ Bad: No error handling
const response = await apiClient.getOrders();
return response.data;
```

### Pagination

```typescript
// Always use pagination for large datasets
const { data, pagination } = await apiClient.getProducts({
  page: 1,
  limit: 50
});

console.log(`Showing ${data.length} of ${pagination.total} products`);
```

### Caching

```typescript
// Use React Query for automatic caching
const { data, isLoading } = useQuery({
  queryKey: ['products', storeId],
  queryFn: () => apiClient.getProducts({ storeId }),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

## 🔄 Versioning

The API follows semantic versioning. Breaking changes will increment the major version.

Current version: **v1.0.0**

Version header:
```http
X-API-Version: 1.0.0
```

---

## 📞 Support

For API-related issues:
1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review Swagger documentation: http://localhost:3000/docs
3. Check API logs: `docker compose logs api`
4. Create GitHub issue with API endpoint and error details

---

**For complete endpoint documentation, visit the Swagger UI at http://localhost:3000/docs**
