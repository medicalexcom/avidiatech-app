"use client";
import React, { useEffect, useState } from "react";
import IntegrationRow from "@/components/connectors/IntegrationRow";

type Connection = {
  id: string;
  name?: string;
  provider?: string;
  platform?: string;
  status?: string;
  config?: any;
};

export default function IntegrationList({
  compact = true,
  onDeleted,
  onSynced,
}: {
  compact?: boolean;
  onDeleted?: (id: string) => void;
  onSynced?: (id: string) => void;
}) {
  const [rows, setRows] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/v1/integrations?active=true", { credentials: "same-origin" });
      const json = await r.json();
      // support either { data: [...] } or direct array
      const data = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : json?.data ?? [];
      setRows(data);
    } catch (e) {
      console.error("failed load integrations", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = rows.filter((row) => {
    if (!q) return true;
    const name = (row.name ?? row.provider ?? row.platform ?? "").toLowerCase();
    return name.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Connected stores & integrations</h3>
          <span className="text-sm text-slate-500">{rows.length} connected</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="search"
            aria-label="Search connections"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search stores or providers"
            className="px-3 py-1 border rounded bg-white text-sm"
          />
          <button onClick={load} className="px-3 py-1 rounded border text-sm hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      <div>
        {loading ? (
          <div className="py-6 text-center text-sm text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">No connected stores or integrations</div>
        ) : compact ? (
          <div className="space-y-1">
            {filtered.map((i) => (
              <IntegrationRow
                key={i.id}
                integration={{
                  id: i.id,
                  name: i.name ?? i.provider ?? i.platform,
                  provider: i.provider ?? i.platform,
                  platform: i.platform,
                }}
                onDeleted={(id) => {
                  setRows((s) => s.filter((r) => r.id !== id));
                  onDeleted?.(id);
                }}
                onSynced={(id) => {
                  onSynced?.(id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((i) => (
              <div key={i.id} className="p-4 border rounded-lg bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{i.name ?? i.provider ?? i.platform}</div>
                    <div className="text-sm text-slate-500">{i.provider}</div>
                    <div className="mt-2 text-xs">
                      <span className={`px-2 py-0.5 rounded text-xs ${i.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {i.status ?? "unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => window.location.assign(`/integrations/${i.id}`)} className="px-3 py-1 rounded border text-sm">
                      Details
                    </button>
                    <button onClick={() => {}} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">
                      Sync
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
