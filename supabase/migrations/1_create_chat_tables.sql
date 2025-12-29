-- Migration: Create chat tables for in-app support console
-- Idempotent + compatible with older partial schemas.
--
-- Canonical schema (this repo):
-- - public.chat_threads: tenant-scoped support threads
-- - public.chat_participants: users in threads
-- - public.chat_messages: messages per thread
-- - public.chat_files: file metadata per thread (messages reference via file_id)
-- - public.chat_read_receipts: per (thread,user) last read message pointer
--
-- Notes:
-- - Uses pgcrypto + gen_random_uuid() (Supabase standard)
-- - Uses tenant_id UUID (matches your app)
-- - Guards legacy "created_by" index if an older schema used that column

create extension if not exists "pgcrypto";

-- ===============================
-- TABLES (create if missing)
-- ===============================

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  created_by_user_id uuid not null,
  assigned_agent_id uuid,
  subject text,
  status text not null default 'open', -- 'open' | 'pending' | 'closed'
  priority text default 'normal',      -- 'low' | 'normal' | 'high'
  last_message_at timestamptz default now(),
  last_sender_role text,              -- 'end_user' | 'agent' | 'system'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.chat_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null,
  role text not null,                 -- 'end_user' | 'agent'
  created_at timestamptz default now(),
  unique (thread_id, user_id)
);

create table if not exists public.chat_files (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  uploaded_by_user_id uuid not null,
  storage_path text not null,        -- e.g. 'tenant-123/thread-456/file-789.pdf'
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_user_id uuid not null,
  sender_role text not null,          -- 'end_user' | 'agent' | 'system'
  message_type text not null default 'text', -- 'text' | 'file' | 'event'
  content text,                       -- nullable if purely file/event
  file_id uuid references public.chat_files(id),
  created_at timestamptz default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.chat_read_receipts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null,
  last_read_message_id uuid not null references public.chat_messages(id),
  last_read_at timestamptz default now(),
  unique (thread_id, user_id)
);

-- ===============================
-- COMPATIBILITY SHIMS (avoid failures on existing remote schemas)
-- ===============================

-- chat_threads
alter table public.chat_threads add column if not exists tenant_id uuid;
alter table public.chat_threads add column if not exists created_by_user_id uuid;
alter table public.chat_threads add column if not exists assigned_agent_id uuid;
alter table public.chat_threads add column if not exists subject text;
alter table public.chat_threads add column if not exists status text;
alter table public.chat_threads add column if not exists priority text;
alter table public.chat_threads add column if not exists last_message_at timestamptz;
alter table public.chat_threads add column if not exists last_sender_role text;
alter table public.chat_threads add column if not exists created_at timestamptz;
alter table public.chat_threads add column if not exists updated_at timestamptz;

alter table public.chat_threads alter column status set default 'open';
alter table public.chat_threads alter column priority set default 'normal';
alter table public.chat_threads alter column last_message_at set default now();
alter table public.chat_threads alter column created_at set default now();
alter table public.chat_threads alter column updated_at set default now();

-- chat_participants
alter table public.chat_participants add column if not exists thread_id uuid;
alter table public.chat_participants add column if not exists user_id uuid;
alter table public.chat_participants add column if not exists role text;
alter table public.chat_participants add column if not exists created_at timestamptz;

-- chat_files
alter table public.chat_files add column if not exists thread_id uuid;
alter table public.chat_files add column if not exists uploaded_by_user_id uuid;
alter table public.chat_files add column if not exists storage_path text;
alter table public.chat_files add column if not exists file_name text;
alter table public.chat_files add column if not exists mime_type text;
alter table public.chat_files add column if not exists size_bytes bigint;
alter table public.chat_files add column if not exists created_at timestamptz;

-- chat_messages
alter table public.chat_messages add column if not exists thread_id uuid;
alter table public.chat_messages add column if not exists sender_user_id uuid;
alter table public.chat_messages add column if not exists sender_role text;
alter table public.chat_messages add column if not exists message_type text;
alter table public.chat_messages add column if not exists content text;
alter table public.chat_messages add column if not exists file_id uuid;
alter table public.chat_messages add column if not exists created_at timestamptz;
alter table public.chat_messages add column if not exists edited_at timestamptz;
alter table public.chat_messages add column if not exists deleted_at timestamptz;

alter table public.chat_messages alter column message_type set default 'text';
alter table public.chat_messages alter column created_at set default now();

-- chat_read_receipts
alter table public.chat_read_receipts add column if not exists thread_id uuid;
alter table public.chat_read_receipts add column if not exists user_id uuid;
alter table public.chat_read_receipts add column if not exists last_read_message_id uuid;
alter table public.chat_read_receipts add column if not exists last_read_at timestamptz;
alter table public.chat_read_receipts alter column last_read_at set default now();

-- ===============================
-- INDEXES (safe + guarded)
-- ===============================

create index if not exists idx_chat_messages_thread_id_created_at
  on public.chat_messages (thread_id, created_at desc);

create index if not exists idx_chat_threads_tenant_id_last_message_at
  on public.chat_threads (tenant_id, last_message_at desc);

create index if not exists idx_chat_participants_thread_id
  on public.chat_participants (thread_id);

create index if not exists idx_chat_participants_user_id
  on public.chat_participants (user_id);

create index if not exists idx_chat_files_thread_id
  on public.chat_files (thread_id);

-- Legacy index for older schemas that used chat_threads.created_by
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chat_threads'
      and column_name = 'created_by'
  ) then
    execute 'create index if not exists idx_chat_threads_created_by on public.chat_threads(created_by)';
  end if;
end $$;

-- ===============================
-- TRIGGERS (update thread metadata on new message)
-- ===============================

create or replace function public.chat_update_thread_last_message()
returns trigger as $$
begin
  update public.chat_threads
  set
    last_message_at = new.created_at,
    last_sender_role = new.sender_role,
    updated_at = now()
  where id = new.thread_id;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_chat_update_thread_last_message on public.chat_messages;

create trigger trg_chat_update_thread_last_message
after insert on public.chat_messages
for each row execute function public.chat_update_thread_last_message();
