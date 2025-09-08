-- Add performance indexes for frequently queried columns

-- Order table indexes
CREATE INDEX IF NOT EXISTS "Order_total_idx" ON "Order"("total");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_updatedAt_idx" ON "Order"("updatedAt");
CREATE INDEX IF NOT EXISTS "Order_tenantId_createdAt_idx" ON "Order"("tenantId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Order_tenantId_total_idx" ON "Order"("tenantId", "total" DESC);

-- Customer table indexes
CREATE INDEX IF NOT EXISTS "Customer_createdAt_idx" ON "Customer"("createdAt");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_name_idx" ON "Customer"("tenantId", "name");

-- Product table indexes
CREATE INDEX IF NOT EXISTS "Product_price_idx" ON "Product"("price");
CREATE INDEX IF NOT EXISTS "Product_stock_idx" ON "Product"("stock");
CREATE INDEX IF NOT EXISTS "Product_tenantId_price_idx" ON "Product"("tenantId", "price");

-- Shipment table indexes
CREATE INDEX IF NOT EXISTS "Shipment_status_idx" ON "Shipment"("status");
CREATE INDEX IF NOT EXISTS "Shipment_shippedAt_idx" ON "Shipment"("shippedAt");
CREATE INDEX IF NOT EXISTS "Shipment_deliveredAt_idx" ON "Shipment"("deliveredAt");

-- Invoice table indexes
CREATE INDEX IF NOT EXISTS "Invoice_total_idx" ON "Invoice"("total");
CREATE INDEX IF NOT EXISTS "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");
CREATE INDEX IF NOT EXISTS "Invoice_paidAt_idx" ON "Invoice"("paidAt");

-- Return table indexes
CREATE INDEX IF NOT EXISTS "Return_status_idx" ON "Return"("status");
CREATE INDEX IF NOT EXISTS "Return_createdAt_idx" ON "Return"("createdAt");

-- Session table indexes (for faster auth checks)
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AuditLog table indexes (for faster log queries)
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_action_createdAt_idx" ON "AuditLog"("tenantId", "action", "createdAt" DESC);

-- WebhookEvent table indexes
CREATE INDEX IF NOT EXISTS "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "WebhookEvent_processedAt_idx" ON "WebhookEvent"("processedAt");

-- Add partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS "Order_tenantId_pending_idx" ON "Order"("tenantId") WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "Order_tenantId_shipped_idx" ON "Order"("tenantId") WHERE "status" = 'shipped';
CREATE INDEX IF NOT EXISTS "Product_tenantId_active_idx" ON "Product"("tenantId") WHERE "active" = true;
CREATE INDEX IF NOT EXISTS "Session_active_idx" ON "Session"("userId") WHERE "expiresAt" > NOW();