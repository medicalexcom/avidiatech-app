import React, { useEffect, useState } from "react";

type Run = { id: string; status: string; duration_ms?: number; created_at?: string };

export function RecentRunsPanel({ ingestionId }: { ingestionId?: string }) {
  const [runs, setRuns] = useState<Run[]>([]);
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/pipeline/runs");
        const json = await res.json();
        if (json.ok) setRuns(json.runs ?? []);
      } catch (e) {
        // ignore
      }
    }
    load();
  }, [ingestionId]);

  return (
    <div>
      <h4 className="text-sm font-medium">Recent runs</h4>
      <ul className="mt-2 space-y-2">
        {runs.slice(0, 5).map((r) => (
          <li key={r.id} className="p-2 border rounded flex justify-between items-center">
            <div>
              <div className="text-sm font-medium">Run {r.id}</div>
              <div className="text-xs text-gray-500">{r.status} • {r.duration_ms ? `${Math.round(r.duration_ms)} ms` : r.created_at}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.open(`/pipeline/run/${r.id}`, "_blank")} className="px-2 py-1 bg-gray-100 rounded">View</button>
              <button onClick={async () => {
                if (!confirm("Retry this run?")) return;
                const res = await fetch(`/api/v1/pipeline/run/${r.id}/retry`, { method: "POST" });
                const j = await res.json();
                if (j.ok) alert("Retry queued");
                else alert("Retry failed: " + j.error);
              }} className="px-2 py-1 bg-blue-600 text-white rounded">Retry</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
