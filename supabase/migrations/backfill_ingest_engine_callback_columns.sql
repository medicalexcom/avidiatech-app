-- Best-effort backfill so existing rows become gateable without re-ingesting.
-- Uses completed_at/error fields that already exist.

update public.product_ingestions
set
  ingest_callback_at = coalesce(ingest_callback_at, completed_at),
  ingest_engine_status = coalesce(
    ingest_engine_status,
    case
      when status in ('completed','error','failed') then status
      when last_error is not null or error is not null then 'error'
      when completed_at is not null then 'completed'
      else null
    end
  )
where ingest_callback_at is null
  and completed_at is not null;
