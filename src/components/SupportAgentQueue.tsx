"use client";

import React, { useEffect, useRef, useState } from "react";
import ThreadRow from "./ThreadRow";

export default function SupportAgentQueue({ threads, onSelect }: { threads: any[]; onSelect: (id: string) => void }) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!threads || threads.length === 0) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min((i === -1 ? 0 : i + 1), threads.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max((i === -1 ? 0 : i - 1), 0));
      } else if (e.key === "Enter") {
        if (focusedIndex >= 0 && focusedIndex < threads.length) {
          onSelect(threads[focusedIndex].id);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [threads, focusedIndex, onSelect]);

  useEffect(() => {
    // If focus changes, ensure item is visible
    const el = listRef.current?.children[focusedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIndex]);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Conversation Queue</h3>
        <button className="text-xs px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700">Filters</button>
      </div>

      <div className="text-xs text-slate-500">Tip: use ↑/↓ or j/k to navigate, Enter to open</div>

      <ul ref={listRef} className="mt-3 space-y-2">
        {threads.length === 0 && <li className="text-sm text-slate-500 mt-3">No threads yet</li>}
        {threads.map((t: any, idx: number) => (
          <li key={t.id}>
            <ThreadRow thread={t} onClick={() => onSelect(t.id)} focused={idx === focusedIndex} />
          </li>
        ))}
      </ul>
    </div>
  );
}
