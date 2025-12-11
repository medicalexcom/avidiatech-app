"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-safe Supabase client for chat features
 * Uses NEXT_PUBLIC_* environment variables for client-side access
 * 
 * This client is separate from server-side clients to ensure proper
 * authentication context and RLS enforcement.
 */

let supabaseChatClient: SupabaseClient | null = null;

/**
 * Get or create a singleton Supabase client for chat features
 * This client uses the anon key and respects RLS policies
 */
export function getChatSupabaseClient(): SupabaseClient {
  if (supabaseChatClient) {
    return supabaseChatClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  supabaseChatClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseChatClient;
}

/**
 * Helper to set the auth token for the Supabase client
 * Call this after user authentication to enable RLS
 */
export function setChatAuthToken(token: string) {
  const client = getChatSupabaseClient();
  // Note: With Clerk, you may need to set up a custom JWT provider
  // or use Supabase's setAuth method with your auth token
  // This is a placeholder for the actual implementation
  console.log("Set auth token for chat client");
}

/**
 * Helper to clear the auth session
 */
export async function clearChatAuth() {
  const client = getChatSupabaseClient();
  await client.auth.signOut();
}
