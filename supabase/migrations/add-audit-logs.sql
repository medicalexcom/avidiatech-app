-- db/migrations/2025-12-15-add-audit-logs.sql
-- Audit logs table for RBAC/audit trail
BEGIN;

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  user_id uuid,
  action text NOT NULL,
  resource text,
  resource_id uuid,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

COMMIT;
