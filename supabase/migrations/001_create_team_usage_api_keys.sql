-- Migration script to add team management, usage counters and API keys

-- Create table for team membership. Each row links a user to a tenant with a role.
create table if not exists team_members (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  invited_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Create table for per‑tenant usage counters. A new row is created for each billing period.
create table if not exists usage_counters (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  period_start date not null,
  ingestion_count integer not null default 0,
  seo_count integer not null default 0,
  variants_count integer not null default 0,
  match_count integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create table for API keys. Raw keys are never stored—only a hash and prefix are saved.
create table if not exists api_keys (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  prefix text not null,
  hashed_key text not null,
  last_used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable Row‑Level Security (RLS) on the new tables. RLS policies will use session variables
-- such as current_setting('app.tenant_id') and current_setting('app.role') to scope access.
alter table team_members enable row level security;
alter table usage_counters enable row level security;
alter table api_keys enable row level security;

-- Policy: allow any authenticated member of a tenant to read their team members.
create policy if not exists select_team_members on team_members
  for select using (tenant_id = current_setting('app.tenant_id')::uuid);

-- Policy: allow owners and admins to insert, update or delete team members.
create policy if not exists modify_team_members on team_members
  for all using (
    tenant_id = current_setting('app.tenant_id')::uuid
    and current_setting('app.role') in ('owner','admin')
  );

-- Policy: allow members of a tenant to read usage counters.
create policy if not exists select_usage_counters on usage_counters
  for select using (tenant_id = current_setting('app.tenant_id')::uuid);

-- Policy: only system service roles should update usage counters. Application code should
-- use stored procedures or service role keys to increment counts.
create policy if not exists no_update_usage_counters on usage_counters
  for update using (false);

-- Policy: owners and admins can list their API keys.
create policy if not exists select_api_keys on api_keys
  for select using (
    tenant_id = current_setting('app.tenant_id')::uuid
    and current_setting('app.role') in ('owner','admin')
  );

-- Policy: only owners can insert, update or delete API keys.
create policy if not exists modify_api_keys on api_keys
  for all using (
    tenant_id = current_setting('app.tenant_id')::uuid
    and current_setting('app.role') = 'owner'
  );
