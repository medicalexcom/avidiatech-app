import { safeFetch } from "@/lib/utils/safeFetch";
import { MatchInput } from "./types";

/**
 * callRenderMatch
 * - Calls external ingest / match engine (INGEST_ENGINE_URL). In scaffold mode, throws a clear error if unset.
 */
export async function callRenderMatch(args: {
  tenantId: string;
  items: MatchInput[];
  maxCandidates?: number;
  verify?: boolean;
  timeoutMs?: number;
}) {
  const base = process.env.INGEST_ENGINE_URL;
  if (!base) {
    throw new Error("INGEST_ENGINE_URL not configured — Render match cannot be called in this environment");
  }
  const url = `${base.replace(/\/+$/, "")}/match`;
  const res = await safeFetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      tenantId: args.tenantId,
      items: args.items,
      maxCandidates: args.maxCandidates ?? 2,
      verify: args.verify ?? true,
      timeoutMs: args.timeoutMs ?? parseInt(process.env.MATCH_VERIFY_TIMEOUT_MS || "6500")
    }),
    timeoutMs: (args.timeoutMs ?? 6500) + 1500
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Render /match failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<any>;
}
