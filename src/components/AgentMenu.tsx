"use client";

import React, { useEffect, useState } from "react";

export default function AgentMenu({ name, isAgent }: { name?: string; isAgent?: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string>(() => (typeof window !== "undefined" ? localStorage.getItem("agent_status") || "Online" : "Online"));

  useEffect(() => {
    localStorage.setItem("agent_status", status);
  }, [status]);

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-medium">
        {name ? name.charAt(0).toUpperCase() : "A"}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow p-2 z-50">
          <div className="text-sm font-medium text-slate-800">{name ?? "Agent"}</div>
          <div className="text-xs text-slate-500">Role: {isAgent ? "Support" : "User"}</div>

          <div className="mt-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-600">Status</div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-xs border rounded px-2 py-1">
                <option>Online</option>
                <option>Away</option>
                <option>Offline</option>
              </select>
            </div>
          </div>

          <div className="mt-3">
            <a href="/dashboard" className="block text-sm px-2 py-1 rounded hover:bg-slate-50">Back to dashboard</a>
            <a href="/sign-out" className="block text-sm px-2 py-1 rounded text-rose-600 hover:bg-slate-50">Sign out</a>
          </div>
        </div>
      )}
    </div>
  );
}
