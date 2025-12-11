 url=https://github.com/medicalexcom/avidiatech-app/blob/main/src/app/internal/support/[threadId]/page.tsx
// simple server shell that renders the client components (routing consistency)
import React from "react";

export default function ThreadPage({ params }: { params: { threadId: string } }) {
  const threadId = params.threadId;
  return (
    <div className="min-h-screen">
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-950 text-slate-50">
        <h2 className="text-lg">Thread {threadId}</h2>
      </div>

      <div className="p-4">
        <div id="agent-thread-view">
          {/* Reuse the client SupportAgentThreadView but mounted in page route - keep the client component for interactivity */}
          {/* The client-side component will read the current threadId and render the conversation */}
          <div>Open thread in client view (see SupportAgentThreadView component)</div>
        </div>
      </div>
    </div>
  );
}
