-- Indexes to speed up pipeline gating/polling and debugging.

create index if not exists product_ingestions_ingest_callback_at_idx
  on public.product_ingestions (ingest_callback_at);

create index if not exists product_ingestions_ingest_engine_status_idx
  on public.product_ingestions (ingest_engine_status);

create index if not exists product_ingestions_ingest_callback_request_id_idx
  on public.product_ingestions (ingest_callback_request_id);
