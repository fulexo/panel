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

-- Note: Application must set `SET LOCAL app.tenant_id = '<tenant-uuid>'` within each transaction.