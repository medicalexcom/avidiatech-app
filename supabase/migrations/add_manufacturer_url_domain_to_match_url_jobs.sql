alter table if exists public.match_url_jobs
  add column if not exists manufacturer_url text null,
  add column if not exists manufacturer_domain text null;

create index if not exists match_url_jobs_manufacturer_domain_idx
  on public.match_url_jobs (manufacturer_domain);
