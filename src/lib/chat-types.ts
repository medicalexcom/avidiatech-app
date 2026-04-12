/**
 * TypeScript types for the support chat system
 * These types match the database schema defined in supabase/migrations/
 */

export type ChatThreadStatus = "open" | "closed" | "archived";
export type ChatThreadPriority = "low" | "normal" | "high" | "urgent";
export type ChatMessageType = "text" | "file" | "system";
export type ChatSenderRole = "user" | "agent" | "system";
export type ChatParticipantRole = "participant" | "agent" | "observer";

export interface ChatThread {
  id: string;
  tenant_id: string;
  subject: string;
  status: ChatThreadStatus;
  priority: ChatThreadPriority;
  last_message_at: string | null;
  last_sender_role: ChatSenderRole | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  id: string;
  thread_id: string;
  user_id: string;
  role: ChatParticipantRole;
  joined_at: string;
  last_read_at: string | null;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_role: ChatSenderRole;
  content: string;
  message_type: ChatMessageType;
  metadata: Record<string, any>;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatFile {
  id: string;
  message_id: string;
  thread_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ChatReadReceipt {
  id: string;
  message_id: string;
  thread_id: string;
  user_id: string;
  read_at: string;
}

// API Response types
export interface CreateThreadResponse {
  thread: ChatThread;
  isNew: boolean;
}

export interface GetThreadsResponse {
  threads: ChatThread[];
  count: number;
}

export interface CreateMessageResponse {
  message: ChatMessage;
}

export interface GetMessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

// Presence tracking types for realtime features
export interface UserPresence {
  user_id: string;
  online_at: string;
  typing?: boolean;
}

export interface PresenceState {
  [key: string]: UserPresence[];
}
