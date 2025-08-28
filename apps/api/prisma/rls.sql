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

ALTER TABLE "BLAccount" ENABLE ROW LEVEL SECURITY;
CREATE POLICY bl_select ON "BLAccount" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY bl_ins ON "BLAccount" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY bl_upd ON "BLAccount" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY bl_del ON "BLAccount" FOR DELETE USING ("tenantId" = app.tenant_id());

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

ALTER TABLE "EntityMap" ENABLE ROW LEVEL SECURITY;
CREATE POLICY em_select ON "EntityMap" FOR SELECT USING ("tenantId" = app.tenant_id());
CREATE POLICY em_ins ON "EntityMap" FOR INSERT WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY em_upd ON "EntityMap" FOR UPDATE USING ("tenantId" = app.tenant_id()) WITH CHECK ("tenantId" = app.tenant_id());
CREATE POLICY em_del ON "EntityMap" FOR DELETE USING ("tenantId" = app.tenant_id());

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

-- Note: Application must set `SET LOCAL app.tenant_id = '<tenant-uuid>'` within each transaction.