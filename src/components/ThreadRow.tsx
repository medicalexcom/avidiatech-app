"use client";

import React from "react";

export default function ThreadRow({ thread, onClick }: { thread: any; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left p-2 rounded hover:bg-slate-900/60 flex items-start gap-2">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium truncate">{thread.subject || "No subject"}</div>
          <div className="text-xs text-slate-400">{thread.priority}</div>
        </div>
        <div className="text-xs text-slate-400 mt-1 truncate">{thread.tenant_id}</div>
      </div>
    </button>
  );
}
