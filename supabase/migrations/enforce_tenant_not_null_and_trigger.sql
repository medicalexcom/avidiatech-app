-- db/migrations/2026-01-10_enforce_tenant_not_null_and_trigger.sql

-- 1) Create trigger function to enforce tenant presence (uses session setting for controlled bypass)
CREATE OR REPLACE FUNCTION enforce_product_ingestion_tenant() RETURNS trigger AS $$
BEGIN
  -- If tenant_id is null and bypass session setting is not enabled, abort.
  -- current_setting(..., true) returns NULL when not set.
  IF (NEW.tenant_id IS NULL) AND (current_setting('avidiatech.allow_null_ingestion', true) IS NULL) THEN
    RAISE EXCEPTION 'product_ingestions.tenant_id cannot be null (enforced by trigger)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Create trigger (before insert or update)
DROP TRIGGER IF EXISTS trg_enforce_product_ingestion_tenant ON product_ingestions;
CREATE TRIGGER trg_enforce_product_ingestion_tenant
BEFORE INSERT OR UPDATE ON product_ingestions
FOR EACH ROW EXECUTE FUNCTION enforce_product_ingestion_tenant();

-- 3) Finally, set NOT NULL constraints (now that backfill completed)
ALTER TABLE product_ingestions
  ALTER COLUMN tenant_id SET NOT NULL,
  ALTER COLUMN org_id SET NOT NULL;
