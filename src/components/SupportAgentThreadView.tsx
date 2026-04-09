"use client";

import React, { useEffect, useRef, useState } from "react";
import CannedRepliesModal from "./CannedRepliesModal";

function MessageItem({ m }: { m: any }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isAgent = m.sender_role === "agent";
  return (
    <div className={`flex ${isAgent ? "justify-end" : "justify-start"} transition-transform duration-200 ${mounted ? "transform-none opacity-100" : "translate-y-1 opacity-0"}`}>
      <div className={`rounded-lg p-3 max-w-[80%] ${isAgent ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-900"}`}>
        <div className="text-xs opacity-80">{m.sender_role}</div>
        <div className="mt-1 text-sm whitespace-pre-wrap">{m.content}</div>
        {m.chat_files && m.chat_files.length > 0 && (
          <div className="mt-2 space-y-1">
            {m.chat_files.map((f: any) => (
              <a key={f.id} href="#" className="text-xs text-sky-700 underline block">
                {f.file_name ?? "attachment"}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SupportAgentThreadView({ threadId, onAction }: { threadId: string | null; onAction?: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [cannedOpen, setCannedOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!threadId) return setMessages([]);
    fetch(`/api/support/admin/threads/${threadId}/messages`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .catch((e) => console.error("Failed to fetch admin messages", e));
  }, [threadId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  }, [messages]);

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
      const data = await res.json();
      setMessages((m) => [...m, data.message]);
    } else {
      const err = await res.json();
      console.error("send failed", err);
    }
  }

  function insertCanned(text: string) {
    setContent((c) => (c ? c + "\n\n" + text : text));
    setCannedOpen(false);
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">{threadId ? `Thread ${threadId}` : "No thread selected"}</div>
            <div className="text-xs text-slate-500">Conversation details & quick actions</div>
          </div>

          <div className="flex items-center gap-2">
            <button className="text-xs bg-slate-100 px-2 py-1 rounded" onClick={() => setCannedOpen(true)}>
              Canned
            </button>
            <button className="text-xs bg-slate-100 px-2 py-1 rounded">Assign</button>
            <button className="text-xs bg-slate-100 px-2 py-1 rounded">Close</button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.map((m: any) => (
            <MessageItem key={m.id} m={m} />
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="px-6 py-4 border-t bg-white">
        <div className="max-w-3xl mx-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-200"
            rows={3}
            placeholder="Write a reply or internal note..."
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="text-xs px-3 py-1 rounded bg-slate-100">Attach</button>
              <button onClick={() => setCannedOpen(true)} className="text-xs px-3 py-1 rounded bg-slate-100">
                Insert canned reply
              </button>
              <button
                onClick={async () => {
                  if (!threadId) return;
                  const res = await fetch("/api/support/admin/ai/draft", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ threadId }),
                  });
                  if (res.ok) {
                    const d = await res.json();
                    setContent((c) => (c ? c + "\n\n" + d.draft : d.draft));
                  }
                }}
                className="text-xs px-3 py-1 rounded bg-slate-100"
              >
                AI Draft
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-500">Public</label>
              <button onClick={send} className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-md">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <CannedRepliesModal open={cannedOpen} onClose={() => setCannedOpen(false)} onInsert={insertCanned} />
    </div>
  );
}
