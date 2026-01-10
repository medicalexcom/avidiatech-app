"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import SupportAgentQueue from "@/components/SupportAgentQueue";
import SupportAgentThreadView from "@/components/SupportAgentThreadView";
import SupportAgentContextPanel from "@/components/SupportAgentContextPanel";
import AgentMenu from "@/components/AgentMenu";

/**
 * /internal/support - main staff console page (light mode, anchored layout)
 */
export default function AdminSupportPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [agentInfo, setAgentInfo] = useState<any>(null);
  const [loadingAgent, setLoadingAgent] = useState(true);

  useEffect(() => {
    // fetch agent info (checks server-side is_support_agent)
    (async () => {
      try {
        const res = await fetch("/api/support/admin/me");
        if (res.ok) {
          const d = await res.json();
          setAgentInfo(d);
        } else {
          setAgentInfo({ isAgent: false });
        }
      } catch (e) {
        console.error("failed to fetch agent info", e);
        setAgentInfo({ isAgent: false });
      } finally {
        setLoadingAgent(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!agentInfo || !agentInfo.isAgent) return;
    fetch("/api/support/admin/threads")
      .then((r) => r.json())
      .then((d) => setThreads(d.threads || []))
      .catch((e) => console.error("Failed to load admin threads", e));
  }, [refreshKey, agentInfo]);

  // If not agent, show a helpful message (or you can redirect)
  if (!loadingAgent && (!agentInfo || !agentInfo.isAgent)) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow p-6 text-center">
          <h2 className="text-lg font-semibold">Access restricted</h2>
          <p className="mt-2 text-slate-600">This area is for support staff and owners only.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/dashboard" className="px-4 py-2 bg-sky-600 text-white rounded">Back to dashboard</Link>
            <Link href="/sign-in?redirect_url=/internal/support" className="px-4 py-2 border rounded">Sign in</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Topbar */}
      <div className="px-4 py-3 border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900">
            <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to dashboard
          </Link>

          <div className="flex-1 flex items-center gap-3">
            <h1 className="text-lg font-semibold">AvidiaTech Support Console</h1>

            <div className="ml-4 flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              Production
            </div>

            <div className="ml-auto max-w-md w-full">
              <label className="relative block">
                <input aria-label="Search threads, tenants, users" placeholder="Search threads, tenant, user email..." className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.5"/></svg>
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-700">{agentInfo?.name ?? "Agent"}</div>
              <AgentMenu name={agentInfo?.name} isAgent={agentInfo?.isAgent} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex max-w-7xl mx-auto">
          {/* Left: Queue */}
          <aside className="w-80 border-r border-slate-100 bg-slate-50 overflow-y-auto">
            <SupportAgentQueue
              threads={threads}
              onSelect={(id: string) => setSelectedThreadId(id)}
            />
          </aside>

          {/* Center: Conversation (single white panel fills the center height) */}
          <main className="flex-1 overflow-auto bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow h-[calc(100vh-160px)] flex flex-col overflow-hidden">
              <SupportAgentThreadView threadId={selectedThreadId} onAction={() => setRefreshKey((k) => k + 1)} />
            </div>
          </main>

          {/* Right: Context */}
          <aside className="w-96 border-l border-slate-100 bg-slate-50 overflow-y-auto p-4">
            <SupportAgentContextPanel threadId={selectedThreadId} />
            <div className="mt-6">
              <Link href="/dashboard" className="block w-full text-center rounded-md px-3 py-2 bg-sky-600 text-white font-medium hover:bg-sky-700">
                Open tenant in Dashboard
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
