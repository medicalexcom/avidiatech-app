"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function IntegrationDropdownLink() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/v1/integrations?active=true", { credentials: "same-origin" });
        const json = await res.json();
        const arr = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : json?.data ?? [];
        if (mounted) setCount(arr.length);
      } catch {
        if (mounted) setCount(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <Link href="/integrations" className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 rounded" role="menuitem" aria-label="Manage integrations">
        <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M7 7h10v10H7z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 3l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Integrations</span>
        {typeof count === "number" && <span className="ml-auto text-xs text-slate-500">{count}</span>}
      </Link>
    </div>
  );
}
