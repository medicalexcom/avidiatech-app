alter table public.product_ingestions
  add column if not exists engine_payload_ref text,
  add column if not exists engine_payload_sha256 text;

create index if not exists idx_product_ingestions_engine_payload_ref
  on public.product_ingestions (engine_payload_ref);
