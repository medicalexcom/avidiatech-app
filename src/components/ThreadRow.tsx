"use client";

import React from "react";
import UnreadBadge from "./UnreadBadge";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    closed: "bg-slate-100 text-slate-600",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${map[status] ?? "bg-slate-100 text-slate-700"}`}>{status}</span>;
}

function PriorityPill({ priority }: { priority?: string }) {
  const map: Record<string, string> = {
    high: "bg-rose-100 text-rose-800",
    normal: "bg-sky-100 text-sky-800",
    low: "bg-slate-100 text-slate-600",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${map[priority ?? "normal"]}`}>{(priority ?? "normal").toUpperCase()}</span>;
}

export default function ThreadRow({ thread, onClick, focused }: { thread: any; onClick?: () => void; focused?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-start gap-3 ${
        focused ? "ring-2 ring-sky-300" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-sm font-medium">
              {thread.tenant_id ? String(thread.tenant_id).charAt(0).toUpperCase() : "T"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">{thread.subject || "No subject"}</div>
              <div className="text-xs text-slate-500 truncate mt-0.5">{thread.last_message_preview ?? ""}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PriorityPill priority={thread.priority} />
            <StatusPill status={thread.status} />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <div className="truncate">{thread.tenant_id ?? "Unknown tenant"}</div>
          <div className="flex items-center gap-2">
            {typeof thread.unread_count === "number" && <UnreadBadge count={thread.unread_count} />}
            <div>{thread.last_message_at ? new Date(thread.last_message_at).toLocaleString() : ""}</div>
          </div>
        </div>
      </div>
    </button>
  );
}
