-- Migration: Row Level Security (RLS) policies for chat tables
-- This migration enables RLS and creates security policies for the chat system
--
-- Updated to match the repo's chat schema (migration 1):
-- - chat_threads.created_by_user_id (NOT created_by)
-- - chat_messages.sender_user_id (NOT sender_id)
-- - chat_files.uploaded_by_user_id (NOT uploaded_by)
-- - tenant_id is UUID (not TEXT)
-- - read receipts are per (thread_id, user_id) with last_read_message_id pointer
--
-- IMPORTANT:
-- These rules use auth.uid() and only work for direct client access if you are using
-- Supabase Auth JWTs. If your app uses Clerk without Supabase JWT integration,
-- access should happen via server routes using the service role key (bypasses RLS),
-- OR you must implement JWT integration for RLS to be meaningful.

-- Helper function to get current user's tenant_id
-- Placeholder: replace with your actual logic if you enforce tenant filtering in RLS
create or replace function public.get_user_tenant_id(user_id uuid)
returns uuid as $$
declare
  tenant uuid;
begin
  -- Option 1: From team_members table
  -- select tenant_id into tenant from public.team_members where user_id = $1 limit 1;

  -- Option 2: From JWT claims (if tenant_id is in the JWT)
  -- select (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid into tenant;

  -- Placeholder: return NULL (disables tenant enforcement unless you wire it in)
  tenant := null;
  return tenant;
end;
$$ language plpgsql security definer;

-- Helper function to check if user is an agent/support staff
create or replace function public.is_support_agent(user_id uuid)
returns boolean as $$
declare
  is_agent boolean;
begin
  -- Option 1: Check roles table
  -- select exists (
  --   select 1 from public.roles
  --   where roles.user_id = $1 and roles.role in ('agent','admin','support')
  -- ) into is_agent;

  -- Placeholder: Return false by default
  is_agent := false;
  return coalesce(is_agent, false);
end;
$$ language plpgsql security definer;

-- Helper function to check if user is a participant in a thread
create or replace function public.is_thread_participant(user_id uuid, thread_id uuid)
returns boolean as $$
begin
  return exists (
    select 1
    from public.chat_participants
    where chat_participants.user_id = $1
      and chat_participants.thread_id = $2
  );
end;
$$ language plpgsql security definer;

-- ====================
-- ENABLE RLS ON ALL CHAT TABLES
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
    -- User created the thread
    created_by_user_id = auth.uid()
    or
    -- User is a participant in the thread
    exists (
      select 1 from public.chat_participants
      where chat_participants.thread_id = chat_threads.id
        and chat_participants.user_id = auth.uid()
    )
    or
    -- User is a support agent (can see all threads)
    public.is_support_agent(auth.uid())
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
    or public.is_thread_participant(auth.uid(), id)
    or public.is_support_agent(auth.uid())
  )
)
with check (
  auth.uid() is not null
  and (
    created_by_user_id = auth.uid()
    or public.is_thread_participant(auth.uid(), id)
    or public.is_support_agent(auth.uid())
  )
);

-- ====================
-- CHAT_PARTICIPANTS POLICIES
-- ====================

drop policy if exists "Users can view thread participants" on public.chat_participants;
create policy "Users can view thread participants"
on public.chat_participants
for select
using (
  auth.uid() is not null
  and (
    user_id = auth.uid()
    or public.is_thread_participant(auth.uid(), thread_id)
    or public.is_support_agent(auth.uid())
  )
);

drop policy if exists "Can add thread participants" on public.chat_participants;
create policy "Can add thread participants"
on public.chat_participants
for insert
with check (
  auth.uid() is not null
  and (
    exists (
      select 1
      from public.chat_threads
      where chat_threads.id = thread_id
        and chat_threads.created_by_user_id = auth.uid()
    )
    or public.is_support_agent(auth.uid())
  )
);

drop policy if exists "Can update own participant record" on public.chat_participants;
create policy "Can update own participant record"
on public.chat_participants
for update
using (
  auth.uid() is not null
  and user_id = auth.uid()
)
with check (
  auth.uid() is not null
  and user_id = auth.uid()
);

-- ====================
-- CHAT_MESSAGES POLICIES
-- ====================

drop policy if exists "Users can view thread messages" on public.chat_messages;
create policy "Users can view thread messages"
on public.chat_messages
for select
using (
  auth.uid() is not null
  and (
    public.is_thread_participant(auth.uid(), thread_id)
    or public.is_support_agent(auth.uid())
  )
);

drop policy if exists "Participants can send messages" on public.chat_messages;
create policy "Participants can send messages"
on public.chat_messages
for insert
with check (
  auth.uid() is not null
  and sender_user_id = auth.uid()
  and public.is_thread_participant(auth.uid(), thread_id)
);

drop policy if exists "Users can edit own messages" on public.chat_messages;
create policy "Users can edit own messages"
on public.chat_messages
for update
using (
  auth.uid() is not null
  and sender_user_id = auth.uid()
)
with check (
  auth.uid() is not null
  and sender_user_id = auth.uid()
);

-- NOTE: Your schema uses "deleted_at" soft delete; DELETE policy optional.
drop policy if exists "Users can delete own messages" on public.chat_messages;
create policy "Users can delete own messages"
on public.chat_messages
for delete
using (
  auth.uid() is not null
  and sender_user_id = auth.uid()
);

-- ====================
-- CHAT_FILES POLICIES
-- ====================

drop policy if exists "Users can view thread files" on public.chat_files;
create policy "Users can view thread files"
on public.chat_files
for select
using (
  auth.uid() is not null
  and (
    public.is_thread_participant(auth.uid(), thread_id)
    or public.is_support_agent(auth.uid())
  )
);

drop policy if exists "Participants can upload files" on public.chat_files;
create policy "Participants can upload files"
on public.chat_files
for insert
with check (
  auth.uid() is not null
  and uploaded_by_user_id = auth.uid()
  and public.is_thread_participant(auth.uid(), thread_id)
);

drop policy if exists "Users can delete own files" on public.chat_files;
create policy "Users can delete own files"
on public.chat_files
for delete
using (
  auth.uid() is not null
  and uploaded_by_user_id = auth.uid()
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

-- Your schema supports an upsert pattern on (thread_id, user_id).
-- Allow insert if belongs to self and user can access the thread.
drop policy if exists "Users can create read receipts" on public.chat_read_receipts;
create policy "Users can create read receipts"
on public.chat_read_receipts
for insert
with check (
  auth.uid() is not null
  and user_id = auth.uid()
  and public.is_thread_participant(auth.uid(), thread_id)
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

-- Comments for documentation
comment on function public.get_user_tenant_id(uuid) is 'Helper function to retrieve user tenant - REPLACE WITH YOUR LOGIC';
comment on function public.is_support_agent(uuid) is 'Helper function to check if user is a support agent - REPLACE WITH YOUR LOGIC';
comment on function public.is_thread_participant(uuid, uuid) is 'Helper function to check if user is a participant in a thread';

-- Grant execute permissions on helper functions to authenticated users
grant execute on function public.get_user_tenant_id(uuid) to authenticated;
grant execute on function public.is_support_agent(uuid) to authenticated;
grant execute on function public.is_thread_participant(uuid, uuid) to authenticated;
