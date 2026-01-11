-- Create a minimal public.profiles table expected by the ingest route.
-- Add or remove columns to match your application schema as needed.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  clerk_user_id text,
  clerk_org_id text,
  email text,
  display_name text,
  role text,
  settings jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON public.profiles (clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_org_id ON public.profiles (clerk_org_id);
