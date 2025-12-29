"use client";

import React, { useEffect, useState } from "react";

type Props = {
  open: boolean;
  runId: string;
  moduleIndex: number;
  onClose: () => void;
};

export default function ModuleLogsModal({ open, runId, moduleIndex, onClose }: Props) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!runId) {
      setError("pipelineRunId required");
      return;
    }

    setLoading(true);
    setError(null);

    // FIX: ensure runId is included in URL
    const url = `/api/v1/pipeline/run/${encodeURIComponent(runId)}/module/${encodeURIComponent(
      String(moduleIndex)
    )}/logs`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (!json?.ok) throw new Error(json?.error ?? "Failed to load logs");
        setLogs(json.logs ?? []);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [open, runId, moduleIndex]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded bg-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Module logs — run {runId ? runId.slice(0, 8) : "?"}… module {moduleIndex}
          </h3>
          <button onClick={onClose} className="px-2 py-1">
            Close
          </button>
        </div>

        <div className="mt-3">
          {loading && <div>Loading logs…</div>}
          {error && <div className="text-rose-600">{error}</div>}
          {!loading && !error && (
            <pre className="max-h-[60vh] overflow-auto rounded border bg-black p-3 text-[12px] text-white">
              {logs.length
                ? logs
                    .map((l, i) => (typeof l === "string" ? `${i + 1}: ${l}\n` : JSON.stringify(l, null, 2) + "\n"))
                    .join("")
                : "No logs available."}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
