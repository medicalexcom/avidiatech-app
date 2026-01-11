# Support Chat Setup Guide

This guide explains how to set up and configure the real-time support chat feature in the Avidiatech app.

## Overview

The support chat system provides a real-time in-app communication channel between users and support agents. It includes:

- Real-time messaging using Supabase Realtime
- File upload support via Supabase Storage
- Typing indicators and presence tracking
- Thread-based conversations
- Row-Level Security (RLS) for data protection

## Prerequisites

1. A Supabase project with the following:
   - Database access
   - Storage enabled
   - Realtime enabled
2. Environment variables configured in your Next.js app
3. User authentication system (currently using Clerk)

## Setup Steps

### 1. Environment Variables

Ensure the following environment variables are set in your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Important:** Keep the `SUPABASE_SERVICE_ROLE_KEY` secret and never expose it to the client.

### 2. Run Database Migrations

The chat system requires database tables and RLS policies. Run the migrations in order:

#### Option A: Using Supabase CLI (Recommended)

```bash
# Initialize Supabase if not already done
supabase init

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

#### Option B: Using Supabase Dashboard

1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Run each migration file in order:
   - First: `supabase/migrations/1_create_chat_tables.sql`
   - Second: `supabase/migrations/2_rls_chat_policies.sql`

**Important Notes on Migrations:**

- **Migration 2 (RLS policies)** includes placeholder helper functions that need to be customized:
  - `get_user_tenant_id(user_id)` - Returns the tenant ID for a user
  - `is_support_agent(user_id)` - Checks if a user is a support agent
  
  These functions have placeholder implementations. Update them based on your schema:
  
  ```sql
  -- Example: Get tenant from team_members table
  CREATE OR REPLACE FUNCTION get_user_tenant_id(user_id UUID)
  RETURNS TEXT AS $$
  DECLARE
    tenant TEXT;
  BEGIN
    SELECT tenant_id INTO tenant 
    FROM team_members 
    WHERE team_members.user_id = $1 
    LIMIT 1;
    RETURN tenant;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- Example: Check if user has agent role
  CREATE OR REPLACE FUNCTION is_support_agent(user_id UUID)
  RETURNS BOOLEAN AS $$
  BEGIN
    RETURN EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.user_id = $1 
      AND role IN ('admin', 'agent', 'support')
    );
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```

### 3. Create Supabase Storage Bucket

The chat system requires a storage bucket for file uploads:

1. Navigate to Storage in your Supabase dashboard
2. Create a new bucket:
   - **Name:** `chat-uploads`
   - **Public:** No (keep private)
   - **File size limit:** Set according to your needs (e.g., 50MB)
   - **Allowed MIME types:** Configure based on requirements

3. Set up storage policies:

   ```sql
   -- Allow authenticated users to upload files
   CREATE POLICY "Users can upload chat files"
   ON storage.objects
   FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'chat-uploads' AND
     (storage.foldername(name))[1] IN (
       SELECT id::text FROM chat_threads 
       WHERE is_thread_participant(auth.uid(), id)
     )
   );
   
   -- Allow participants to download files from their threads
   CREATE POLICY "Users can download chat files"
   ON storage.objects
   FOR SELECT
   TO authenticated
   USING (
     bucket_id = 'chat-uploads' AND
     (storage.foldername(name))[1] IN (
       SELECT id::text FROM chat_threads 
       WHERE is_thread_participant(auth.uid(), id)
     )
   );
   ```

4. Configure CORS if needed:
   - Add your app domain to allowed origins
   - Allow methods: GET, POST, PUT, DELETE

### 4. Configure Realtime

Enable Realtime for the chat tables:

1. Go to Database → Replication in your Supabase dashboard
2. Enable replication for these tables:
   - `chat_messages`
   - `chat_threads`
   - `chat_participants`
   - `chat_read_receipts`

### 5. Add Navigation Link

To make the support chat accessible to users, add a link in your navigation/sidebar:

#### Option A: Add to Sidebar Component

Edit `src/components/Sidebar.tsx` (or your main navigation component):

```tsx
// Add to your navigation links
<Link 
  href="/dashboard/support"
  className="nav-link-class"
>
  Support Chat
</Link>
```

#### Option B: Add as a Floating Button

Create a floating support button that opens the chat:

```tsx
"use client";

import Link from "next/link";

export function SupportButton() {
  return (
    <Link
      href="/dashboard/support"
      className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
      title="Get Support"
    >
      💬
    </Link>
  );
}
```

Then add it to your layout:

```tsx
// In src/app/dashboard/layout.tsx or src/app/layout.tsx
import { SupportButton } from "@/components/SupportButton";

export default function Layout({ children }) {
  return (
    <>
      {children}
      <SupportButton />
    </>
  );
}
```

### 6. Authentication Integration

The chat system uses Clerk authentication by default. If you're using a different auth provider:

1. Update the API routes to use your auth provider:
   - Modify `src/app/api/chat/threads/route.ts`
   - Modify `src/app/api/chat/messages/route.ts`

2. Update the Supabase client to use your auth tokens:
   - Edit `src/lib/supabase-chat-client.ts`
   - Implement `setChatAuthToken()` for your auth provider

Example for custom auth:

```typescript
// In your auth provider setup
export function setChatAuthToken(token: string) {
  const client = getChatSupabaseClient();
  client.auth.setAuth(token);
}
```

## Usage

Once configured, users can:

1. Navigate to `/dashboard/support`
2. Start a new conversation or continue an existing one
3. Send messages in real-time
4. Upload files (images, PDFs, documents)
5. See when support agents are typing
6. View conversation history

## Customization

### Styling

The chat UI uses Tailwind CSS classes. Customize the appearance by editing:
- `src/app/dashboard/support/page.tsx`

### Message Types

Add custom message types by:
1. Updating the `ChatMessageType` in `src/lib/chat-types.ts`
2. Updating the CHECK constraint in `1_create_chat_tables.sql`
3. Handling the new type in the UI component

### File Upload Restrictions

Modify file upload restrictions in `src/app/dashboard/support/page.tsx`:

```typescript
// Change accepted file types
<input
  type="file"
  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
  // ...
/>
```

Also update the storage bucket settings in Supabase dashboard.

## Troubleshooting

### Messages not appearing in real-time

1. Check that Realtime is enabled for `chat_messages` table
2. Verify WebSocket connections in browser DevTools
3. Check Supabase logs for connection errors

### File uploads failing

1. Verify the `chat-uploads` bucket exists and is private
2. Check storage policies allow uploads
3. Ensure file size is within bucket limits
4. Check browser console for specific error messages

### Authentication errors

1. Verify environment variables are set correctly
2. Check that user is authenticated (Clerk session exists)
3. Review RLS policies to ensure they match your schema
4. Test auth token generation for Supabase client

### RLS policy errors

1. Update helper functions in `2_rls_chat_policies.sql` to match your schema
2. Ensure `team_members` or equivalent table exists
3. Test policies with different user roles
4. Check Supabase logs for policy violations

## Security Considerations

1. **Never expose service role key** - Keep it server-side only
2. **Review RLS policies** - Ensure they match your security requirements
3. **Validate file uploads** - Check file types and sizes
4. **Sanitize messages** - Prevent XSS attacks in message content
5. **Rate limiting** - Consider adding rate limits to API routes
6. **Storage access** - Use signed URLs with expiration for file downloads

## Monitoring

Monitor your chat system:

1. **Supabase Dashboard:**
   - Check Database → Logs for query errors
   - Monitor Storage usage
   - Review Realtime connections

2. **Application Logs:**
   - Check server logs for API route errors
   - Monitor client console for WebSocket issues

3. **User Feedback:**
   - Track failed message sends
   - Monitor file upload success rates

## Support Agent Setup

To enable support agents to respond:

1. Assign agent roles to support staff in your database
2. Update `is_support_agent()` function to recognize these roles
3. Agents can access all threads when logged in
4. Consider building a separate agent dashboard at `/dashboard/support-admin`

## Next Steps

- Build an admin dashboard for support agents
- Add message search functionality
- Implement message reactions/emojis
- Add conversation tagging and categorization
- Set up automated welcome messages
- Integrate with notification system
- Add canned responses for agents
- Implement conversation analytics

## API Reference

### POST /api/chat/threads

Create or retrieve a support thread.

**Request:**
```json
{
  "subject": "Support Request",
  "tenantId": "optional-tenant-id",
  "forceNew": false
}
```

**Response:**
```json
{
  "thread": { "id": "...", "status": "open", ... },
  "isNew": true
}
```

### POST /api/chat/messages

Send a message in a thread.

**Request:**
```json
{
  "threadId": "uuid",
  "content": "Message text",
  "messageType": "text",
  "metadata": {}
}
```

**Response:**
```json
{
  "message": { "id": "...", "content": "...", ... }
}
```

### GET /api/chat/messages

Retrieve messages for a thread.

**Query Parameters:**
- `threadId` (required): UUID of the thread
- `limit` (optional): Number of messages (default: 100)
- `before` (optional): ISO timestamp for pagination

**Response:**
```json
{
  "messages": [...],
  "hasMore": false
}
```

## License

This feature is part of the Avidiatech application.
