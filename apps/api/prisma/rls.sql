-- Enable Row Level Security and tenant policies

-- Helper function to read tenant from session
CREATE SCHEMA IF NOT EXISTS app;
CREATE OR REPLACE FUNCTION app.tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid;
$$;

-- Tables with tenantId column
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    '"Tenant"',
    '"User"',
    '"BLAccount"',
    '"OwnershipRule"',
    '"Customer"',
    '"Order"',
    '"Product"',
    '"Invoice"',
    '"Return"',
    '"Policy"',
    '"EntityMap"',
    '"Request"',
    '"AuditLog"'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', tbl);
    -- Select policy
    EXECUTE format('CREATE POLICY IF NOT EXISTS %I_select ON %s FOR SELECT USING (tenant_id = app.tenant_id());', replace(tbl,'"','')::text, tbl);
    -- Insert policy
    EXECUTE format('CREATE POLICY IF NOT EXISTS %I_insert ON %s FOR INSERT WITH CHECK (tenant_id = app.tenant_id());', replace(tbl,'"','')::text, tbl);
    -- Update policy
    EXECUTE format('CREATE POLICY IF NOT EXISTS %I_update ON %s FOR UPDATE USING (tenant_id = app.tenant_id()) WITH CHECK (tenant_id = app.tenant_id());', replace(tbl,'"','')::text, tbl);
    -- Delete policy
    EXECUTE format('CREATE POLICY IF NOT EXISTS %I_delete ON %s FOR DELETE USING (tenant_id = app.tenant_id());', replace(tbl,'"','')::text, tbl);
  END LOOP;
END $$;

-- Additional non-tenant tables (sessions) — example restrict by user ownership if desired
-- ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY session_select ON "Session" FOR SELECT USING (user_id = current_setting(''app.user_id'', true)::uuid);

-- Note: Application must set `SET LOCAL app.tenant_id = '<tenant-uuid>'` within each transaction.