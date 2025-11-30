import { NextResponse } from "next/server";
import { matchJobSchema } from "@/lib/match/validators";
import { getCurrentTenantId } from "@/lib/auth";
import { assertTenantQuota } from "@/lib/usage/quotas";
import { v4 as uuidv4 } from "uuid";
import { callRenderMatch } from "@/lib/match/bridge";
import { insertMatchRows } from "@/lib/match/db";
import { scoreCandidate } from "@/lib/match/scorer";

export async function POST(req: Request) {
  if (process.env.FEATURE_MATCH !== "true") return NextResponse.json({ error: "feature-disabled" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = matchJobSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload", details: parsed.error.format() }, { status: 400 });

  const tenantId = getCurrentTenantId(req);
  await assertTenantQuota(tenantId, { kind: "match" });

  const jobId = uuidv4();
  const items = parsed.data.items;

  // Call external match service
  let results: any;
  try {
    results = await callRenderMatch({ tenantId, items });
  } catch (err: any) {
    // fallback: persist failed rows
    const failedRows = items.map((it) => ({
      sku: it.sku,
      brand_hint: it.brand ?? null,
      gtin: it.gtin ?? null,
      candidate_url: null,
      domain: null,
      source: "pattern" as const,
      confidence: 0,
      status: "failed" as const,
      verify_checks: { reason: err.message || "render-failed" }
    }));
    const data = await insertMatchRows(tenantId, jobId, failedRows);
    return NextResponse.json({ jobId, items: data, metrics: { submitted: items.length, candidates: 0, failed: items.length, durationMs: 0 } });
  }

  const persisted: any[] = [];
  let candidateCount = 0;
  for (const r of results.results ?? []) {
    const input = r.input;
    const candidates = r.candidates ?? [];
    if (!candidates.length) {
      const rows = [{
        sku: input.sku,
        brand_hint: input.brand ?? null,
        gtin: input.gtin ?? null,
        candidate_url: null,
        domain: null,
        source: "pattern" as const,
        confidence: 0,
        status: "failed" as const,
        verify_checks: { reason: "no-pattern-hit" }
      }];
      const inserted = await insertMatchRows(tenantId, jobId, rows);
      persisted.push(...inserted);
      continue;
    }

    for (const c of candidates) {
      const finalScore = scoreCandidate({
        brandHint: input.brand,
        pageBrand: c.verify?.pageBrand,
        sku: input.sku,
        pageContainsSku: !!c.verify?.skuInBody,
        titleSimilarity: c.verify?.titleSimilarity,
        patternBase: typeof c.confidenceBase === "number" ? c.confidenceBase : 0.6
      });
      candidateCount++;
      const rows = [{
        sku: input.sku,
        brand_hint: input.brand ?? null,
        gtin: input.gtin ?? null,
        candidate_url: c.url,
        domain: c.domain,
        source: c.source ?? "pattern",
        confidence: finalScore,
        status: "candidate" as const,
        verify_checks: c.verify ?? null
      }];
      const inserted = await insertMatchRows(tenantId, jobId, rows);
      persisted.push(...inserted);
    }
  }

  const metrics = { submitted: items.length, candidates: candidateCount, failed: 0, durationMs: results.durationMs ?? 0 };
  return NextResponse.json({ jobId, items: persisted, metrics });
}
