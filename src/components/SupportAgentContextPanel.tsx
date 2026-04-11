"use client";

import React, { useEffect, useState } from "react";

/**
 * Right column context panel (tenant and user info)
 */
export default function SupportAgentContextPanel({ threadId }: { threadId: string | null }) {
  const [thread, setThread] = useState<any>(null);

  useEffect(() => {
    if (!threadId) return setThread(null);
    fetch(`/api/support/admin/threads?limit=1`)
      .then((r) => r.json())
      .then((d) => {
        const t = (d.threads || []).find((x: any) => x.id === threadId);
        setThread(t || null);
      })
      .catch((e) => console.error("failed to load thread context", e));
  }, [threadId]);

  if (!thread) return <div className="p-4 text-slate-400">Select a thread to see tenant & user context</div>;

  return (
    <div className="p-4 space-y-4">
      <div className="p-3 bg-slate-900 rounded">
        <div className="text-xs text-slate-400">Tenant</div>
        <div className="mt-1 font-medium">{thread.tenant_id}</div>
      </div>

      <div className="p-3 bg-slate-900 rounded">
        <div className="text-xs text-slate-400">Status</div>
        <div className="mt-1">{thread.status}</div>
      </div>
    </div>
  );
}
