"use client";
import { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type IngestRow = {
  id: string;
  status: string;
  created_at?: string;
  completed_at?: string | null;
  normalized_payload?: any | null;
  error?: string | null;
};

let supabaseClient: SupabaseClient | null = null;
function getClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
}

/**
 * Hook: subscribe to product_ingestions row updates for jobId via Supabase realtime
 * Returns the latest row or null while loading.
 */
export function useIngestRealtime(jobId: string | null) {
  const [row, setRow] = useState<IngestRow | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const sb = getClient();

    // initial fetch
    (async () => {
      try {
        const r = await fetch(`/api/v1/ingest/${encodeURIComponent(jobId)}`);
        if (r.ok) {
          const j = await r.json();
          setRow(j);
        }
      } catch (err) {
        // ignore
      }
    })();

    const channel = sb
      .channel(`public:product_ingestions:id=eq.${jobId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "product_ingestions", filter: `id=eq.${jobId}` },
        (payload: any) => {
          setRow(payload.new as IngestRow);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [jobId]);

  return { row };
}
