"use client";

import React, { useEffect, useState } from "react";

export default function SupportAgentThreadView({ threadId, onAction }: { threadId: string | null; onAction?: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!threadId) return setMessages([]);
    fetch(`/api/support/admin/threads/${threadId}/messages`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch((e) => console.error("Failed to fetch admin messages", e));
  }, [threadId]);

  async function send() {
    if (!threadId || !content.trim()) return;
    const res = await fetch(`/api/support/admin/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, messageType: "text", internal: false }),
    });
    if (res.ok) {
      setContent("");
      onAction?.();
      // optimistic: append message or re-fetch
      const data = await res.json();
      setMessages((m) => [...m, data.message]);
    } else {
      const err = await res.json();
      console.error("send failed", err);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <div className="text-sm font-semibold">{threadId ? `Thread ${threadId}` : "No thread selected"}</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m: any) => (
          <div key={m.id} className={`p-2 rounded ${m.sender_role === "agent" ? "bg-slate-800 self-end" : "bg-slate-700 self-start"}`}>
            <div className="text-xs text-slate-300">{m.sender_role}</div>
            <div className="mt-1 text-sm">{m.content}</div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-800">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full p-2 rounded bg-slate-900 text-slate-200" rows={3} placeholder="Type a message or internal note..." />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-2">
            <button className="text-xs bg-slate-800 px-2 py-1 rounded">Attach</button>
            <button className="text-xs bg-slate-800 px-2 py-1 rounded">Macro</button>
            <button className="text-xs bg-slate-800 px-2 py-1 rounded">AI Draft</button>
          </div>
          <button onClick={send} className="bg-sky-600 px-3 py-1 rounded text-white">Send</button>
        </div>
      </div>
    </div>
  );
}
