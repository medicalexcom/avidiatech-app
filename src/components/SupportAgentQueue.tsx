"use client";

import React from "react";
import ThreadRow from "./ThreadRow";

export default function SupportAgentQueue({ threads, onSelect }: { threads: any[]; onSelect: (id: string) => void }) {
  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">Conversation Queue</h3>
        <button className="text-xs bg-slate-800 px-2 py-1 rounded">Filters</button>
      </div>

      <ul className="space-y-2">
        {threads.map((t: any) => (
          <li key={t.id}>
            <ThreadRow thread={t} onClick={() => onSelect(t.id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
