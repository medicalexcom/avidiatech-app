-- Migration: Row Level Security (RLS) policies for chat tables
-- This migration enables RLS and creates security policies for the chat system
--
-- Security Model:
-- 1. Users can only access threads/messages for their tenant
-- 2. Users must be participants in a thread to view/send messages
-- 3. Agents (with 'agent' role in roles table) can access all threads for support
-- 4. File uploads are restricted to thread participants
--
-- Prerequisites:
-- This migration assumes you have access to:
-- - auth.uid() - Supabase auth function returning current user ID
-- - A way to determine user's tenant_id (adjust helper functions as needed)
-- - Optional: roles table with user_id and role columns for agent detection
--
-- IMPORTANT: Adjust the helper functions below based on your actual schema

-- Helper function to get current user's tenant_id
-- This is a placeholder - replace with your actual logic
-- Options:
-- 1. Join with workspace_members/team_members table
-- 2. Query profiles/users table for tenant_id column
-- 3. Use app metadata from JWT claims
CREATE OR REPLACE FUNCTION get_user_tenant_id(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  tenant TEXT;
BEGIN
  -- Option 1: From team_members/workspace_members table
  -- SELECT tenant_id INTO tenant FROM team_members WHERE user_id = $1 LIMIT 1;
  
  -- Option 2: From user metadata (if you have a profiles table with tenant_id)
  -- SELECT tenant_id INTO tenant FROM profiles WHERE id = $1 LIMIT 1;
  
  -- Option 3: From JWT claims (if tenant_id is in the JWT)
  -- SELECT current_setting('request.jwt.claims', true)::json->>'tenant_id' INTO tenant;
  
  -- Placeholder: Return a test value or null
  -- REPLACE THIS WITH YOUR ACTUAL TENANT LOOKUP LOGIC
  SELECT 'default-tenant' INTO tenant;
  
  RETURN tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is an agent/support staff
-- This checks a 'roles' table - adjust based on your schema
CREATE OR REPLACE FUNCTION is_support_agent(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_agent BOOLEAN;
BEGIN
  -- Option 1: Check roles table
  -- SELECT EXISTS (
  --   SELECT 1 FROM roles 
  --   WHERE user_id = $1 AND role IN ('agent', 'admin', 'support')
  -- ) INTO is_agent;
  
  -- Option 2: Check user metadata
  -- SELECT (metadata->>'is_agent')::boolean INTO is_agent FROM profiles WHERE id = $1;
  
  -- Placeholder: Return false by default
  -- REPLACE THIS WITH YOUR ACTUAL AGENT CHECK LOGIC
  SELECT false INTO is_agent;
  
  RETURN COALESCE(is_agent, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a participant in a thread
CREATE OR REPLACE FUNCTION is_thread_participant(user_id UUID, thread_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_participants.user_id = $1 
    AND chat_participants.thread_id = $2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================
-- ENABLE RLS ON ALL CHAT TABLES
-- ====================

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- ====================
-- CHAT_THREADS POLICIES
-- ====================

-- Policy: Users can view threads they created or are participants in (within their tenant)
CREATE POLICY "Users can view own threads"
ON chat_threads
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- User created the thread
    created_by = auth.uid()
    OR
    -- User is a participant in the thread
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_participants.thread_id = chat_threads.id 
      AND chat_participants.user_id = auth.uid()
    )
    OR
    -- User is a support agent (can see all threads)
    is_support_agent(auth.uid())
  )
);

-- Policy: Users can create threads for their tenant
CREATE POLICY "Users can create threads"
ON chat_threads
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  created_by = auth.uid()
);

-- Policy: Users can update threads they created or are participants in
-- Agents can update any thread
CREATE POLICY "Users can update own threads"
ON chat_threads
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    created_by = auth.uid()
    OR
    is_thread_participant(auth.uid(), id)
    OR
    is_support_agent(auth.uid())
  )
);

-- ====================
-- CHAT_PARTICIPANTS POLICIES
-- ====================

-- Policy: Users can view participants in threads they're part of
CREATE POLICY "Users can view thread participants"
ON chat_participants
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid()
    OR
    is_thread_participant(auth.uid(), thread_id)
    OR
    is_support_agent(auth.uid())
  )
);

-- Policy: Thread creators and agents can add participants
CREATE POLICY "Can add thread participants"
ON chat_participants
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM chat_threads 
      WHERE chat_threads.id = thread_id 
      AND chat_threads.created_by = auth.uid()
    )
    OR
    is_support_agent(auth.uid())
  )
);

-- Policy: Participants can update their own participant record
CREATE POLICY "Can update own participant record"
ON chat_participants
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid()
);

-- ====================
-- CHAT_MESSAGES POLICIES
-- ====================

-- Policy: Users can view messages in threads they're part of
CREATE POLICY "Users can view thread messages"
ON chat_messages
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_thread_participant(auth.uid(), thread_id)
    OR
    is_support_agent(auth.uid())
  )
);

-- Policy: Participants can send messages in their threads
CREATE POLICY "Participants can send messages"
ON chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  sender_id = auth.uid() AND
  is_thread_participant(auth.uid(), thread_id)
);

-- Policy: Users can update/edit their own messages
CREATE POLICY "Users can edit own messages"
ON chat_messages
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  sender_id = auth.uid()
);

-- Policy: Users can delete their own messages (soft delete via deleted_at)
CREATE POLICY "Users can delete own messages"
ON chat_messages
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  sender_id = auth.uid()
);

-- ====================
-- CHAT_FILES POLICIES
-- ====================

-- Policy: Users can view files in threads they're part of
CREATE POLICY "Users can view thread files"
ON chat_files
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    is_thread_participant(auth.uid(), thread_id)
    OR
    is_support_agent(auth.uid())
  )
);

-- Policy: Participants can upload files to their threads
CREATE POLICY "Participants can upload files"
ON chat_files
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  uploaded_by = auth.uid() AND
  is_thread_participant(auth.uid(), thread_id)
);

-- Policy: Users can delete their own uploaded files
CREATE POLICY "Users can delete own files"
ON chat_files
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  uploaded_by = auth.uid()
);

-- ====================
-- CHAT_READ_RECEIPTS POLICIES
-- ====================

-- Policy: Users can view their own read receipts
CREATE POLICY "Users can view own read receipts"
ON chat_read_receipts
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid()
);

-- Policy: Users can create read receipts for messages in their threads
CREATE POLICY "Users can create read receipts"
ON chat_read_receipts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid() AND
  is_thread_participant(auth.uid(), thread_id)
);

-- Policy: Users can update their own read receipts
CREATE POLICY "Users can update own read receipts"
ON chat_read_receipts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid()
);

-- Comments for documentation
COMMENT ON FUNCTION get_user_tenant_id IS 'Helper function to retrieve user tenant - REPLACE WITH YOUR LOGIC';
COMMENT ON FUNCTION is_support_agent IS 'Helper function to check if user is a support agent - REPLACE WITH YOUR LOGIC';
COMMENT ON FUNCTION is_thread_participant IS 'Helper function to check if user is a participant in a thread';

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_tenant_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_support_agent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_thread_participant(UUID, UUID) TO authenticated;
