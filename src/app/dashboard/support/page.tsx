"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getChatSupabaseClient } from "@/lib/supabase-chat-client";
import type {
  ChatThread,
  ChatMessage,
  CreateThreadResponse,
  GetMessagesResponse,
  CreateMessageResponse,
  PresenceState,
} from "@/lib/chat-types";
import { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Support Chat Page
 * 
 * A real-time support chat interface with:
 * - Thread creation/retrieval
 * - Real-time message updates via Supabase Realtime
 * - File upload support
 * - Presence/typing indicators
 * - Auto-scroll to latest messages
 */
export default function SupportChatPage() {
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize: Create or fetch thread
  useEffect(() => {
    initializeChat();
  }, []);

  // Set up realtime subscription when thread is ready
  useEffect(() => {
    if (thread?.id) {
      subscribeToMessages(thread.id);
      subscribeToPresence(thread.id);
    }

    return () => {
      cleanupSubscriptions();
    };
  }, [thread?.id]);

  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create or fetch existing open thread
      const response = await fetch("/api/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "Support Request",
          forceNew: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create thread");
      }

      const data: CreateThreadResponse = await response.json();
      setThread(data.thread);

      // Load existing messages
      await loadMessages(data.thread.id);
    } catch (err: any) {
      console.error("Chat initialization error:", err);
      setError(err.message || "Failed to initialize chat");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?threadId=${threadId}`);

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      const data: GetMessagesResponse = await response.json();
      setMessages(data.messages);
    } catch (err: any) {
      console.error("Error loading messages:", err);
      setError(err.message || "Failed to load messages");
    }
  };

  const subscribeToMessages = (threadId: string) => {
    const supabase = getChatSupabaseClient();

    // Create a channel for this thread's messages
    const channel = supabase
      .channel(`chat-messages-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload: any) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const subscribeToPresence = (threadId: string) => {
    const supabase = getChatSupabaseClient();

    // Create presence channel for typing indicators
    const presenceChannel = supabase
      .channel(`chat-presence-${threadId}`, {
        config: {
          presence: {
            key: "user-presence",
          },
        },
      })
      .on("presence", { event: "sync" }, () => {
        const state: PresenceState = presenceChannel.presenceState();
        const typing = new Set<string>();

        Object.values(state).forEach((presences) => {
          presences.forEach((presence: any) => {
            if (presence.typing) {
              typing.add(presence.user_id);
            }
          });
        });

        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track this user's presence
          await presenceChannel.track({
            online_at: new Date().toISOString(),
            typing: false,
          });
        }
      });

    presenceChannelRef.current = presenceChannel;
  };

  const cleanupSubscriptions = () => {
    if (channelRef.current) {
      getChatSupabaseClient().removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (presenceChannelRef.current) {
      getChatSupabaseClient().removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim() || !thread || isSending) {
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: thread.id,
          content: messageInput.trim(),
          messageType: "text",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const data: CreateMessageResponse = await response.json();

      // Clear input
      setMessageInput("");

      // Update typing indicator
      updateTypingStatus(false);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !thread) {
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const supabase = getChatSupabaseClient();

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `${thread.id}/${timestamp}-${sanitizedFileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("chat-uploads")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get signed URL for the file
      const { data: urlData } = await supabase.storage
        .from("chat-uploads")
        .createSignedUrl(filePath, 3600 * 24 * 7); // 7 days

      const fileUrl = urlData?.signedUrl || "";

      // Send a message with file attachment info
      const fileMessage = `📎 Uploaded file: ${file.name}\n${fileUrl}`;

      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: thread.id,
          content: fileMessage,
          messageType: "file",
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            storagePath: filePath,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send file message");
      }

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      console.error("Error uploading file:", err);
      setError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const updateTypingStatus = (isTyping: boolean) => {
    if (presenceChannelRef.current) {
      presenceChannelRef.current.track({
        online_at: new Date().toISOString(),
        typing: isTyping,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);

    // Update typing indicator
    updateTypingStatus(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading support chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Support Chat</h1>
        {thread && (
          <p className="text-sm text-gray-600 mt-1">
            {thread.subject} • {thread.status}
          </p>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-600 underline text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isAgent = message.sender_role === "agent";
            const isSystem = message.sender_role === "system";

            return (
              <div
                key={message.id}
                className={`flex ${
                  isAgent || isSystem ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-md rounded-lg px-4 py-2 ${
                    isAgent
                      ? "bg-blue-100 text-blue-900"
                      : isSystem
                      ? "bg-gray-100 text-gray-700"
                      : "bg-green-100 text-green-900"
                  }`}
                >
                  <p className="text-xs font-semibold mb-1">
                    {isAgent ? "Support Agent" : isSystem ? "System" : "You"}
                  </p>
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatTimestamp(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg px-4 py-2">
              <p className="text-sm text-gray-600">Support agent is typing...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !thread}
            className="flex-shrink-0 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file"
          >
            {isUploading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span className="text-xl">📎</span>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          {/* Message Input */}
          <textarea
            value={messageInput}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
            disabled={!thread || isSending}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!messageInput.trim() || !thread || isSending}
            className="flex-shrink-0 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
