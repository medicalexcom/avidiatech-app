"use client";

import React, { useEffect, useState } from "react";
import SupportAgentQueue from "@/components/SupportAgentQueue";
import SupportAgentThreadView from "@/components/SupportAgentThreadView";
import SupportAgentContextPanel from "@/components/SupportAgentContextPanel";

/**
 * /internal/support - main staff console page
 * Client-side shell that loads threads for agents and renders three-column layout.
 */
export default function AdminSupportPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/support/admin/threads")
      .then((r) => r.json())
      .then((d) => setThreads(d.threads || []))
      .catch((e) => console.error("Failed to load admin threads", e));
  }, [refreshKey]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold">AvidiaTech Support Console</div>
          <div className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300">Production</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm">Agent Name</div>
          <div className="h-8 w-8 rounded-full bg-slate-700" />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r border-slate-800 overflow-y-auto">
          <SupportAgentQueue threads={threads} onSelect={(id: string) => setSelectedThreadId(id)} />
        </div>

        <div className="flex-1 overflow-y-auto">
          <SupportAgentThreadView threadId={selectedThreadId} onAction={() => setRefreshKey((k) => k + 1)} />
        </div>

        <div className="w-96 border-l border-slate-800 bg-slate-900">
          <SupportAgentContextPanel threadId={selectedThreadId} />
        </div>
      </div>
    </div>
  );
}
