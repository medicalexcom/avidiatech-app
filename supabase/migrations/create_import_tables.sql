-- name: 2025-12-14_create_import_tables.sql
-- import_jobs: tracks an import file and overall status
create table if not exists import_jobs (
  id uuid default gen_random_uuid() primary key,
  org_id uuid not null,
  created_by uuid not null,
  file_path text not null,            -- path in Supabase Storage (bucket/path)
  file_name text,
  file_format text,                   -- csv | xlsx
  total_rows int default 0,
  processed_rows int default 0,
  status text not null default 'pending', -- pending|processing|complete|failed
  result_summary jsonb default '{}' , -- { successes: n, failures: n }
  errors jsonb default '[]'::jsonb,   -- array of global errors or messages
  meta jsonb default '{}'::jsonb,     -- user mapping, options, etc
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists import_jobs_org_id_idx on import_jobs (org_id);

-- Optional: store row-level errors (useful for CSV -> show row-level errors)
create table if not exists import_rows (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references import_jobs(id) on delete cascade,
  row_number int,
  data jsonb,
  status text default 'pending', -- pending|success|failed
  errors jsonb default '[]'::jsonb
);
create index if not exists import_rows_job_idx on import_rows (job_id);
