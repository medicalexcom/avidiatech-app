import { NextResponse } from "next/server";
import { idListSchema } from "@/lib/match/validators";
import { getCurrentTenantId } from "@/lib/auth";
import { getRowsByIds } from "@/lib/match/db";
import { assertTenantQuota } from "@/lib/usage/quotas";
import { safeFetch } from "@/lib/utils/safeFetch";

export async function POST(req: Request) {
  if (process.env.FEATURE_MATCH !== "true") return NextResponse.json({ error: "feature-disabled" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = idListSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const tenantId = getCurrentTenantId(req);
  const rows = await getRowsByIds(tenantId, parsed.data.ids);
  const confirmed = rows.filter((r) => r.status === "confirmed");
  if (!confirmed.length) return NextResponse.json({ ok: false, created: [] });

  const created: any[] = [];
  for (const r of confirmed) {
    await assertTenantQuota(tenantId, { kind: "extract" });
    try {
      const ingestBase = process.env.INGEST_ENGINE_URL;
      if (!ingestBase) throw new Error("INGEST_ENGINE_URL not configured");
      const res = await safeFetch(`${ingestBase.replace(/\/+$/, "")}/extract`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: r.candidate_url, source: "avidiatch-match", matchId: r.id })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        created.push({ matchId: r.id, url: r.candidate_url, error: `ingest-failed: ${res.status} ${text}` });
        continue;
      }
      const json = await res.json().catch(() => ({}));
      created.push({ matchId: r.id, ingestionId: json.ingestionId || null, url: r.candidate_url });
    } catch (err: any) {
      created.push({ matchId: r.id, url: r.candidate_url, error: err.message });
    }
  }

  return NextResponse.json({ ok: true, created, openExtractRoute: created.length === 1 ? `/dashboard/extract/${created[0].ingestionId}` : null });
}
