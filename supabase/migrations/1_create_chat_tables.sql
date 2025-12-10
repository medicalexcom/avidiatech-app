-- Migration: Create chat support tables
-- This migration creates the core tables for the real-time support chat system
-- 
-- Tables created:
-- - chat_threads: Main conversation threads
-- - chat_participants: Links users to threads
-- - chat_messages: Individual messages in threads
-- - chat_files: File attachments linked to messages
-- - chat_read_receipts: Track which messages users have read
--
-- Prerequisites:
-- This migration assumes the following tables exist:
-- - profiles or users table with an id column (uuid)
-- - workspace_members or team_members table (optional, for tenant filtering)
-- - roles table (optional, for agent role checking)
--
-- Note: Adjust tenant_id references based on your schema. This uses TEXT for flexibility.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Chat Threads Table
-- Represents a support conversation between a user and support agents
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL, -- The tenant/workspace this thread belongs to
  subject TEXT NOT NULL DEFAULT 'Support Request',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  last_message_at TIMESTAMPTZ,
  last_sender_role TEXT, -- 'user' or 'agent' - tracks who sent the last message
  created_by UUID NOT NULL, -- User ID who created the thread (references profiles/users)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_chat_threads_tenant_id ON chat_threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_status ON chat_threads(status);
CREATE INDEX IF NOT EXISTS idx_chat_threads_created_by ON chat_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_threads_last_message_at ON chat_threads(last_message_at DESC);

-- Chat Participants Table
-- Links users to threads (many-to-many relationship)
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- References profiles/users table
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'agent', 'observer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ, -- When this participant last read messages in this thread
  UNIQUE(thread_id, user_id) -- A user can only be a participant once per thread
);

-- Create indexes for participant queries
CREATE INDEX IF NOT EXISTS idx_chat_participants_thread_id ON chat_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- Chat Messages Table
-- Individual messages within a thread
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL, -- User ID who sent the message
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'agent', 'system')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  metadata JSONB DEFAULT '{}', -- Additional message metadata (mentions, reactions, etc.)
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON chat_messages(thread_id, created_at);

-- Chat Files Table
-- File attachments linked to messages
CREATE TABLE IF NOT EXISTS chat_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL, -- User ID who uploaded the file
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- Size in bytes
  file_type TEXT NOT NULL, -- MIME type
  storage_path TEXT NOT NULL, -- Path in Supabase Storage (bucket: chat-uploads)
  metadata JSONB DEFAULT '{}', -- Additional file metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for file queries
CREATE INDEX IF NOT EXISTS idx_chat_files_message_id ON chat_files(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_thread_id ON chat_files(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_files_uploaded_by ON chat_files(uploaded_by);

-- Chat Read Receipts Table
-- Tracks which messages each user has read
CREATE TABLE IF NOT EXISTS chat_read_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- User who read the message
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id) -- Each user can only read a message once
);

-- Create indexes for read receipt queries
CREATE INDEX IF NOT EXISTS idx_chat_read_receipts_thread_user ON chat_read_receipts(thread_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_read_receipts_message_id ON chat_read_receipts(message_id);

-- Function to update thread's last_message_at and last_sender_role
-- This is called automatically via trigger when a new message is inserted
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_threads
  SET 
    last_message_at = NEW.created_at,
    last_sender_role = NEW.sender_role,
    updated_at = NOW()
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update thread metadata when a message is created
CREATE TRIGGER trigger_update_thread_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_last_message();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at timestamps
CREATE TRIGGER trigger_chat_threads_updated_at
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE chat_threads IS 'Support conversation threads between users and agents';
COMMENT ON TABLE chat_participants IS 'Links users to conversation threads';
COMMENT ON TABLE chat_messages IS 'Individual messages within conversation threads';
COMMENT ON TABLE chat_files IS 'File attachments linked to messages';
COMMENT ON TABLE chat_read_receipts IS 'Tracks which messages users have read';

COMMENT ON COLUMN chat_threads.tenant_id IS 'Tenant/workspace identifier - adjust based on your schema';
COMMENT ON COLUMN chat_threads.created_by IS 'References profiles/users table - adjust based on your schema';
COMMENT ON COLUMN chat_messages.sender_role IS 'Role of the sender: user, agent, or system';
COMMENT ON COLUMN chat_files.storage_path IS 'Path in Supabase Storage bucket "chat-uploads"';
