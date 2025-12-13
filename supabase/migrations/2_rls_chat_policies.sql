-- Migration: Row Level Security (RLS) policies for chat tables
-- Updated to match the repo schema:
-- - chat_threads.created_by_user_id (NOT created_by)
-- - tenant_id is UUID
--
-- IMPORTANT:
-- These policies assume you are using Supabase Auth (auth.uid()) for end-user access.
-- If your application uses Clerk without Supabase JWT integration, your client queries
-- should use the service role (server-side) or you must configure Supabase JWT auth.

-- Helper: check if user is support agent
-- Replace this logic with your real role model if needed.
create or replace function public.is_support_agent(user_id uuid)
returns boolean as $$
begin
  -- Placeholder: default false
  return false;
end;
$$ language plpgsql security definer;

-- Helper: check if user is a participant in a thread
create or replace function public.is_thread_participant(user_id uuid, thread_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.chat_participants p
    where p.user_id = $1 and p.thread_id = $2
  );
end;
$$ language plpgsql security definer;

-- ====================
-- ENABLE RLS
-- ====================
alter table public.chat_threads enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_files enable row level security;
alter table public.chat_read_receipts enable row level security;

-- ====================
-- CHAT_THREADS POLICIES
-- ====================

drop policy if exists "Users can view own threads" on public.chat_threads;
create policy "Users can view own threads"
on public.chat_threads
for select
using (
  auth.uid() is not null
  and (
    created_by_user_id = auth.uid()
    or public.is_thread_participant(auth.uid(), chat_threads.id)
    or public.is_support_agent(auth.uid())
  )
);

drop policy if exists "Users can create threads" on public.chat_threads;
create policy "Users can create threads"
on public.chat_threads
for insert
with check (
  auth.uid() is not null
  and created_by_user_id = auth.uid()
);

drop policy if exists "Users can update own threads" on public.chat_threads;
create policy "Users can update own threads"
on public.chat_threads
for update
using (
  auth.uid() is not null
  and (
    created_by_user_id = auth.uid()
    or public.is_support_agent(auth.uid())
  )
)
with check (
  auth.uid() is not null
  and (
    created_by_user_id = auth.uid()
    or public.is_support_agent(auth.uid())
  )
);

-- ====================
-- CHAT_PARTICIPANTS POLICIES
-- ====================

drop policy if exists "Users can view participants for accessible threads" on public.chat_participants;
create policy "Users can view participants for accessible threads"
on public.chat_participants
for select
using (
  auth.uid() is not null
  and (
    public.is_thread_participant(auth.uid(), chat_participants.thread_id)
    or public.is_support_agent(auth.uid())
    or exists (
      select 1 from public.chat_threads t
      where t.id = chat_participants.thread_id
        and t.created_by_user_id = auth.uid()
    )
  )
);

drop policy if exists "Thread owner or agent can add participants" on public.chat_participants;
create policy "Thread owner or agent can add participants"
on public.chat_participants
for insert
with check (
  auth.uid() is not null
  and (
    public.is_support_agent(auth.uid())
    or exists (
      select 1 from public.chat_threads t
      where t.id = chat_participants.thread_id
        and t.created_by_user_id = auth.uid()
    )
  )
);

-- ====================
-- CHAT_MESSAGES POLICIES
-- ====================

drop policy if exists "Users can view messages for accessible threads" on public.chat_messages;
create policy "Users can view messages for accessible threads"
on public.chat_messages
for select
using (
  auth.uid() is not null
  and (
    public.is_thread_participant(auth.uid(), chat_messages.thread_id)
    or public.is_support_agent(auth.uid())
    or exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id
        and t.created_by_user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can insert messages for accessible threads" on public.chat_messages;
create policy "Users can insert messages for accessible threads"
on public.chat_messages
for insert
with check (
  auth.uid() is not null
  and sender_user_id = auth.uid()
  and (
    public.is_thread_participant(auth.uid(), chat_messages.thread_id)
    or public.is_support_agent(auth.uid())
    or exists (
      select 1 from public.chat_threads t
      where t.id = chat_messages.thread_id
        and t.created_by_user_id = auth.uid()
    )
  )
);

-- ====================
-- CHAT_FILES POLICIES
-- ====================

drop policy if exists "Users can view files for accessible threads" on public.chat_files;
create policy "Users can view files for accessible threads"
on public.chat_files
for select
using (
  auth.uid() is not null
  and (
    public.is_thread_participant(auth.uid(), chat_files.thread_id)
    or public.is_support_agent(auth.uid())
    or exists (
      select 1 from public.chat_threads t
      where t.id = chat_files.thread_id
        and t.created_by_user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can insert files for accessible threads" on public.chat_files;
create policy "Users can insert files for accessible threads"
on public.chat_files
for insert
with check (
  auth.uid() is not null
  and uploaded_by_user_id = auth.uid()
  and (
    public.is_thread_participant(auth.uid(), chat_files.thread_id)
    or public.is_support_agent(auth.uid())
    or exists (
      select 1 from public.chat_threads t
      where t.id = chat_files.thread_id
        and t.created_by_user_id = auth.uid()
    )
  )
);

-- ====================
-- CHAT_READ_RECEIPTS POLICIES
-- ====================

drop policy if exists "Users can view own read receipts" on public.chat_read_receipts;
create policy "Users can view own read receipts"
on public.chat_read_receipts
for select
using (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.is_support_agent(auth.uid())
  )
);

drop policy if exists "Users can upsert own read receipts" on public.chat_read_receipts;
create policy "Users can upsert own read receipts"
on public.chat_read_receipts
for insert
with check (
  auth.uid() is not null
  and user_id = auth.uid()
);

drop policy if exists "Users can update own read receipts" on public.chat_read_receipts;
create policy "Users can update own read receipts"
on public.chat_read_receipts
for update
using (
  auth.uid() is not null
  and user_id = auth.uid()
)
with check (
  auth.uid() is not null
  and user_id = auth.uid()
);
