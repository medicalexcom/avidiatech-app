import { useEffect, useState } from "react";

/**
 * Poll GET /api/v1/ingest/:id and return { row, loading, error }.
 * Use this for the Extract dual-pane UI.
 */
export function useIngestRow(jobId: string | null, intervalMs = 1500) {
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setRow(null);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    let timer: number | undefined;

    const fetchRow = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/ingest/${encodeURIComponent(jobId)}`);
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`status fetch failed: ${res.status} ${txt}`);
        }
        const json = await res.json();
        const data = json?.job ? json.job : json;
        if (!mounted) return;
        setRow(data);
        setError(null);
        setLoading(false);
        if (!data.status || data.status === "pending") timer = window.setTimeout(fetchRow, intervalMs);
      } catch (err: any) {
        if (!mounted) return;
        setError(String(err?.message || err));
        setLoading(false);
        timer = window.setTimeout(fetchRow, intervalMs * 2);
      }
    };

    fetchRow();

    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [jobId, intervalMs]);

  return { row, loading, error };
}
