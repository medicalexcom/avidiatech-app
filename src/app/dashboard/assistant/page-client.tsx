"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

type Role = "user" | "assistant";
interface Message { id: string; role: Role; content: string; ts: string; }

const SUGGESTIONS = [
  "Why did my last audit fail?",
  "How can I improve my SEO scores?",
  "Explain the pipeline stages",
  "What does the Describe module do?",
  "How do I set up a monitor watch?",
  "What's the best way to bulk-import products?",
];

function genId() { return Math.random().toString(36).slice(2); }
function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "assistant",
    content: "Hi! I'm the AvidiaTech AI Assistant. I can help you troubleshoot audits, improve SEO scores, navigate the pipeline, and answer questions about your catalog. What can I help you with?",
    ts: new Date().toISOString(),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: genId(), role: "user", content: trimmed, ts: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const history = [...messages, userMsg].slice(-12).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.reply || data?.content || data?.message || "Sorry, I couldn't generate a response.";
      setMessages((prev) => [...prev, { id: genId(), role: "assistant", content: reply, ts: new Date().toISOString() }]);
    } catch (err: any) {
      setError(err.message || "Failed to get a response.");
      setMessages((prev) => [...prev, {
        id: genId(),
        role: "assistant",
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        ts: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); send(input); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const clearChat = () => {
    setMessages([{ id: "welcome", role: "assistant", content: "Chat cleared. How can I help you?", ts: new Date().toISOString() }]);
    setError(null);
  };

  return (
    <div className="relative flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Ambient: indigo-violet wash for AI assistant identity */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[3px] w-full" style={{ backgroundImage: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 60%,transparent 100%)" }} />
        <div className="absolute left-0 top-[3px] h-[60%] w-full dark:hidden" style={{ backgroundImage: "linear-gradient(180deg,rgba(99,102,241,0.07) 0%,rgba(139,92,246,0.03) 38%,transparent 68%)" }} />
        <div className="absolute left-0 top-[3px] h-[60%] w-full hidden dark:block" style={{ backgroundImage: "linear-gradient(180deg,rgba(99,102,241,0.18) 0%,rgba(139,92,246,0.07) 34%,transparent 62%)" }} />
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-indigo-300/15 blur-3xl dark:bg-indigo-500/12" />
        <div className="absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-violet-300/12 blur-3xl dark:bg-violet-500/10" />
      </div>
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">AI</div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">AI Assistant</h1>
            <p className="text-xs text-slate-500">Context-aware help for your catalog</p>
          </div>
        </div>
        <button onClick={clearChat} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          Clear chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`flex-none h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              msg.role === "user"
                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                : "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
            }`}>
              {msg.role === "user" ? "You" : "AI"}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-indigo-600 text-white rounded-tr-sm"
                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-sm shadow-sm"
            }`}>
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p className={`text-[12px] mt-1.5 ${msg.role === "user" ? "text-indigo-200" : "text-slate-400"}`}>{fmtTime(msg.ts)}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex-none h-8 w-8 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300 flex items-center justify-center text-xs font-semibold">AI</div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-5 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && !loading && (
        <div className="flex-none px-4 pb-3">
          <p className="text-xs text-slate-500 mb-2 px-1">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex-none mx-4 mb-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="flex-none px-4 pb-4 pt-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your catalog, pipeline, or settings… (Enter to send)"
            rows={2}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:opacity-50 transition-colors"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="flex-none h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shadow-sm"
            aria-label="Send message">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22 11 13 2 9l20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
        <p className="text-[12px] text-slate-400 mt-1.5 px-1">Shift+Enter for new line · responses are AI-generated</p>
      </div>
    </div>
  );
}
