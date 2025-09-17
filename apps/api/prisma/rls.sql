-- Enable Row Level Security and tenant policies

-- Helper function to read tenant from session
CREATE SCHEMA IF NOT EXISTS app;
CREATE OR REPLACE FUNCTION app.tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid;
$$;

-- Simplified explicit policies per-table; child tables covered below
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_select ON "Tenant" FOR SELECT USING ("id" = app.tenant_id());
CREATE POLICY tenant_update ON "Tenant" FOR UPDATE USING ("id" = app.tenant_id()) WITH CHECK ("id" = app.tenant_id());

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_select ON "User" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY user_ins ON "User" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY user_upd ON "User" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY user_del ON "User" FOR DELETE USING ("tenantId" = app.tenant_id());

-- BLAccount removed

ALTER TABLE "OwnershipRule" ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_select ON "OwnershipRule" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY own_ins ON "OwnershipRule" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY own_upd ON "OwnershipRule" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY own_del ON "OwnershipRule" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY cust_select ON "Customer" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY cust_ins ON "Customer" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY cust_upd ON "Customer" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY cust_del ON "Customer" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
CREATE POLICY ord_select ON "Order" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY ord_ins ON "Order" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY ord_upd ON "Order" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY ord_del ON "Order" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
CREATE POLICY prod_select ON "Product" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY prod_ins ON "Product" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY prod_upd ON "Product" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY prod_del ON "Product" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "Policy" ENABLE ROW LEVEL SECURITY;
CREATE POLICY pol_select ON "Policy" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY pol_ins ON "Policy" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY pol_upd ON "Policy" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY pol_del ON "Policy" FOR DELETE USING ("tenantId" = app.tenant_id());

-- EntityMap removed

ALTER TABLE "Request" ENABLE ROW LEVEL SECURITY;
CREATE POLICY req_select ON "Request" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY req_ins ON "Request" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY req_upd ON "Request" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY req_del ON "Request" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_select ON "AuditLog" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY audit_ins ON "AuditLog" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY audit_del ON "AuditLog" FOR DELETE USING ("tenantId" = app.tenant_id());

-- Additional non-tenant tables (sessions) — example restrict by user ownership if desired
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
CREATE POLICY session_select ON "Session" FOR SELECT USING ("userId" = NULLIF(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY session_ins ON "Session" FOR INSERT WITH CHECK ("userId" = NULLIF(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY session_del ON "Session" FOR DELETE USING ("userId" = NULLIF(current_setting('app.user_id', true), '')::uuid);

-- Additional tenant-specific tables
ALTER TABLE "WooStore" ENABLE ROW LEVEL SECURITY;
CREATE POLICY woo_select ON "WooStore" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY woo_ins ON "WooStore" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY woo_upd ON "WooStore" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY woo_del ON "WooStore" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "Settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_select ON "Settings" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY settings_ins ON "Settings" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY settings_upd ON "Settings" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY settings_del ON "Settings" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "BillingBatch" ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_select ON "BillingBatch" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY billing_ins ON "BillingBatch" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY billing_upd ON "BillingBatch" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY billing_del ON "BillingBatch" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "InboundShipment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbound_select ON "InboundShipment" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY inbound_ins ON "InboundShipment" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY inbound_upd ON "InboundShipment" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY inbound_del ON "InboundShipment" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "CalendarEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY calendar_select ON "CalendarEvent" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY calendar_ins ON "CalendarEvent" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY calendar_upd ON "CalendarEvent" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY calendar_del ON "CalendarEvent" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "Holiday" ENABLE ROW LEVEL SECURITY;
CREATE POLICY holiday_select ON "Holiday" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY holiday_ins ON "Holiday" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY holiday_upd ON "Holiday" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY holiday_del ON "Holiday" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "BusinessHours" ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_select ON "BusinessHours" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY business_ins ON "BusinessHours" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY business_upd ON "BusinessHours" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY business_del ON "BusinessHours" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "OAuthCredential" ENABLE ROW LEVEL SECURITY;
CREATE POLICY oauth_select ON "OAuthCredential" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY oauth_ins ON "OAuthCredential" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY oauth_upd ON "OAuthCredential" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY oauth_del ON "OAuthCredential" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_select ON "WebhookEvent" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY webhook_ins ON "WebhookEvent" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY webhook_upd ON "WebhookEvent" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY webhook_del ON "WebhookEvent" FOR DELETE USING ("tenantId" = app.tenant_id());

-- OrderNoSeq table
ALTER TABLE "_OrderNoSeq" ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_no_seq_select ON "_OrderNoSeq" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY order_no_seq_ins ON "_OrderNoSeq" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY order_no_seq_upd ON "_OrderNoSeq" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY order_no_seq_del ON "_OrderNoSeq" FOR DELETE USING ("tenantId" = app.tenant_id());

-- Additional tables that need RLS policies
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_item_select ON "OrderItem" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "OrderItem"."orderId" AND "Order"."tenantId" = app.tenant_id())
);
CREATE POLICY order_item_ins ON "OrderItem" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "OrderItem"."orderId" AND "Order"."tenantId" = app.tenant_id())
);
CREATE POLICY order_item_upd ON "OrderItem" FOR UPDATE USING (
  EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "OrderItem"."orderId" AND "Order"."tenantId" = app.tenant_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "OrderItem"."orderId" AND "Order"."tenantId" = app.tenant_id())
);
CREATE POLICY order_item_del ON "OrderItem" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "OrderItem"."orderId" AND "Order"."tenantId" = app.tenant_id())
);

ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY shipment_select ON "Shipment" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY shipment_ins ON "Shipment" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY shipment_upd ON "Shipment" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY shipment_del ON "Shipment" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_select ON "Invoice" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY invoice_ins ON "Invoice" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY invoice_upd ON "Invoice" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY invoice_del ON "Invoice" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_select ON "Payment" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY payment_ins ON "Payment" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY payment_upd ON "Payment" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY payment_del ON "Payment" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "Return" ENABLE ROW LEVEL SECURITY;
CREATE POLICY return_select ON "Return" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY return_ins ON "Return" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY return_upd ON "Return" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY return_del ON "Return" FOR DELETE USING ("tenantId" = app.tenant_id());

ALTER TABLE "ReturnPhoto" ENABLE ROW LEVEL SECURITY;
CREATE POLICY return_photo_select ON "ReturnPhoto" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Return" WHERE "Return"."id" = "ReturnPhoto"."returnId" AND "Return"."tenantId" = app.tenant_id())
);
CREATE POLICY return_photo_ins ON "ReturnPhoto" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Return" WHERE "Return"."id" = "ReturnPhoto"."returnId" AND "Return"."tenantId" = app.tenant_id())
);
CREATE POLICY return_photo_upd ON "ReturnPhoto" FOR UPDATE USING (
  EXISTS (SELECT 1 FROM "Return" WHERE "Return"."id" = "ReturnPhoto"."returnId" AND "Return"."tenantId" = app.tenant_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM "Return" WHERE "Return"."id" = "ReturnPhoto"."returnId" AND "Return"."tenantId" = app.tenant_id())
);
CREATE POLICY return_photo_del ON "ReturnPhoto" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "Return" WHERE "Return"."id" = "ReturnPhoto"."returnId" AND "Return"."tenantId" = app.tenant_id())
);

ALTER TABLE "ReturnNotification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY return_notification_select ON "ReturnNotification" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Return" WHERE "Return"."id" = "ReturnNotification"."returnId" AND "Return"."tenantId" = app.tenant_id())
);
CREATE POLICY return_notification_ins ON "ReturnNotification" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Return" WHERE "Return"."id" = "ReturnNotification"."returnId" AND "Return"."tenantId" = app.tenant_id())
);
CREATE POLICY return_notification_upd ON "ReturnNotification" FOR UPDATE USING (
  EXISTS (SELECT 1 FROM "Return" WHERE "Return"."id" = "ReturnNotification"."returnId" AND "Return"."tenantId" = app.tenant_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM "Return" WHERE "Return"."id" = "ReturnNotification"."returnId" AND "Return"."tenantId" = app.tenant_id())
);
CREATE POLICY return_notification_del ON "ReturnNotification" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "Return" WHERE "Return"."id" = "ReturnNotification"."returnId" AND "Return"."tenantId" = app.tenant_id())
);

ALTER TABLE "OrderServiceCharge" ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_service_charge_select ON "OrderServiceCharge" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "OrderServiceCharge"."orderId" AND "Order"."tenantId" = app.tenant_id())
);
CREATE POLICY order_service_charge_ins ON "OrderServiceCharge" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "OrderServiceCharge"."orderId" AND "Order"."tenantId" = app.tenant_id())
);
CREATE POLICY order_service_charge_upd ON "OrderServiceCharge" FOR UPDATE USING (
  EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "OrderServiceCharge"."orderId" AND "Order"."tenantId" = app.tenant_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "OrderServiceCharge"."orderId" AND "Order"."tenantId" = app.tenant_id())
);
CREATE POLICY order_service_charge_del ON "OrderServiceCharge" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "Order" WHERE "Order"."id" = "OrderServiceCharge"."orderId" AND "Order"."tenantId" = app.tenant_id())
);

ALTER TABLE "BillingBatchItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_batch_item_select ON "BillingBatchItem" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "BillingBatch" WHERE "BillingBatch"."id" = "BillingBatchItem"."batchId" AND "BillingBatch"."tenantId" = app.tenant_id())
);
CREATE POLICY billing_batch_item_ins ON "BillingBatchItem" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "BillingBatch" WHERE "BillingBatch"."id" = "BillingBatchItem"."batchId" AND "BillingBatch"."tenantId" = app.tenant_id())
);
CREATE POLICY billing_batch_item_upd ON "BillingBatchItem" FOR UPDATE USING (
  EXISTS (SELECT 1 FROM "BillingBatch" WHERE "BillingBatch"."id" = "BillingBatchItem"."batchId" AND "BillingBatch"."tenantId" = app.tenant_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM "BillingBatch" WHERE "BillingBatch"."id" = "BillingBatchItem"."batchId" AND "BillingBatch"."tenantId" = app.tenant_id())
);
CREATE POLICY billing_batch_item_del ON "BillingBatchItem" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "BillingBatch" WHERE "BillingBatch"."id" = "BillingBatchItem"."batchId" AND "BillingBatch"."tenantId" = app.tenant_id())
);

ALTER TABLE "InboundItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY inbound_item_select ON "InboundItem" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "InboundShipment" WHERE "InboundShipment"."id" = "InboundItem"."inboundId" AND "InboundShipment"."tenantId" = app.tenant_id())
);
CREATE POLICY inbound_item_ins ON "InboundItem" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "InboundShipment" WHERE "InboundShipment"."id" = "InboundItem"."inboundId" AND "InboundShipment"."tenantId" = app.tenant_id())
);
CREATE POLICY inbound_item_upd ON "InboundItem" FOR UPDATE USING (
  EXISTS (SELECT 1 FROM "InboundShipment" WHERE "InboundShipment"."id" = "InboundItem"."inboundId" AND "InboundShipment"."tenantId" = app.tenant_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM "InboundShipment" WHERE "InboundShipment"."id" = "InboundItem"."inboundId" AND "InboundShipment"."tenantId" = app.tenant_id())
);
CREATE POLICY inbound_item_del ON "InboundItem" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "InboundShipment" WHERE "InboundShipment"."id" = "InboundItem"."inboundId" AND "InboundShipment"."tenantId" = app.tenant_id())
);

ALTER TABLE "StockMovement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_movement_select ON "StockMovement" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Product" WHERE "Product"."id" = "StockMovement"."productId" AND "Product"."tenantId" = app.tenant_id())
);
CREATE POLICY stock_movement_ins ON "StockMovement" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Product" WHERE "Product"."id" = "StockMovement"."productId" AND "Product"."tenantId" = app.tenant_id())
);
CREATE POLICY stock_movement_upd ON "StockMovement" FOR UPDATE USING (
  EXISTS (SELECT 1 FROM "Product" WHERE "Product"."id" = "StockMovement"."productId" AND "Product"."tenantId" = app.tenant_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM "Product" WHERE "Product"."id" = "StockMovement"."productId" AND "Product"."tenantId" = app.tenant_id())
);
CREATE POLICY stock_movement_del ON "StockMovement" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "Product" WHERE "Product"."id" = "StockMovement"."productId" AND "Product"."tenantId" = app.tenant_id())
);

ALTER TABLE "RequestComment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY request_comment_select ON "RequestComment" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Request" WHERE "Request"."id" = "RequestComment"."requestId" AND "Request"."tenantId" = app.tenant_id())
);
CREATE POLICY request_comment_ins ON "RequestComment" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Request" WHERE "Request"."id" = "RequestComment"."requestId" AND "Request"."tenantId" = app.tenant_id())
);
CREATE POLICY request_comment_upd ON "RequestComment" FOR UPDATE USING (
  EXISTS (SELECT 1 FROM "Request" WHERE "Request"."id" = "RequestComment"."requestId" AND "Request"."tenantId" = app.tenant_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM "Request" WHERE "Request"."id" = "RequestComment"."requestId" AND "Request"."tenantId" = app.tenant_id())
);
CREATE POLICY request_comment_del ON "RequestComment" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "Request" WHERE "Request"."id" = "RequestComment"."requestId" AND "Request"."tenantId" = app.tenant_id())
);

ALTER TABLE "RequestAttachment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY request_attachment_select ON "RequestAttachment" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Request" WHERE "Request"."id" = "RequestAttachment"."requestId" AND "Request"."tenantId" = app.tenant_id())
);
CREATE POLICY request_attachment_ins ON "RequestAttachment" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Request" WHERE "Request"."id" = "RequestAttachment"."requestId" AND "Request"."tenantId" = app.tenant_id())
);
CREATE POLICY request_attachment_upd ON "RequestAttachment" FOR UPDATE USING (
  EXISTS (SELECT 1 FROM "Request" WHERE "Request"."id" = "RequestAttachment"."requestId" AND "Request"."tenantId" = app.tenant_id())
) WITH CHECK (
  EXISTS (SELECT 1 FROM "Request" WHERE "Request"."id" = "RequestAttachment"."requestId" AND "Request"."tenantId" = app.tenant_id())
);
CREATE POLICY request_attachment_del ON "RequestAttachment" FOR DELETE USING (
  EXISTS (SELECT 1 FROM "Request" WHERE "Request"."id" = "RequestAttachment"."requestId" AND "Request"."tenantId" = app.tenant_id())
);

-- Note: Application must set `SET LOCAL app.tenant_id = '<tenant-uuid>'` within each transaction.