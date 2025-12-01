import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// Use safeGetAuth to avoid Clerk middleware-detection warnings
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { postSeoUrlOnlySchema } from "@/lib/seo/validators";
import { loadCustomGptInstructions } from "@/lib/gpt/loadInstructions";
import { assembleSeoPrompt } from "@/lib/seo/assemblePrompt";
import { autoHeal } from "@/lib/seo/autoHeal";
import { callOpenaiChat } from "@/lib/openai";

const INGEST_ENGINE_URL = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");
const INGEST_CACHE_MINUTES = parseInt(process.env.INGEST_CACHE_MINUTES || "1440", 10);

/* Helper: attempt to extract a JSON object from text (strip fences, extract {...} block) */
function extractJsonFromText(raw: string): any | null {
  if (!raw || typeof raw !== "string") return null;
  // strip markdown code fences with optional language
  let t = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  t = t.replace(/```(?:json)?/gi, "").replace(/```/g, "");
  // find first {...} block
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = t.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // fallthrough
    }
  }
  // try full cleaned text
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/**
 * If we have a tenantId, persist and/or upsert a product_ingestions row and
 * (optionally) call the ingest engine to obtain a normalized preview. If no
 * tenantId is provided we instead call the ingest engine directly (preview-only)
 * and do NOT persist DB rows.
 */
async function upsertIngestionForUrlIfTenant(sb: any, tenantId: string | null, url: string) {
  if (!tenantId) {
    // preview-only path: call ingest engine directly (best-effort)
    if (!INGEST_ENGINE_URL) return null;
    try {
      const res = await fetch(`${INGEST_ENGINE_URL}/ingest?url=${encodeURIComponent(url)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const text = await res.text().catch(() => "");
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      return {
        id: null,
        tenant_id: null,
        source_url: url,
        normalized_payload: parsed ?? null,
        raw_payload: null,
      };
    } catch (e: any) {
      return {
        id: null,
        tenant_id: null,
        source_url: url,
        normalized_payload: null,
        raw_payload: null,
        last_error: String(e?.message ?? e),
      };
    }
  }

  const freshnessThreshold = new Date(Date.now() - INGEST_CACHE_MINUTES * 60_000).toISOString();

  // 1) check fresh ingestion
  const { data: existing } = await sb
    .from("product_ingestions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("source_url", url)
    .gte("created_at", freshnessThreshold)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing;

  // 2) create a stub row with status pending
  const { data: inserted } = await sb
    .from("product_ingestions")
    .insert({
      tenant_id: tenantId,
      user_id: null,
      source_url: url,
      status: "pending",
      options: { includeSeo: true, includeDocs: true, includeSpecs: true, includeVariants: true },
    })
    .select("*")
    .single()
    .catch(() => ({ data: null }));

  if (!inserted) return null;

  // 3) call ingest engine synchronously to obtain normalized preview (best-effort)
  if (!INGEST_ENGINE_URL) return inserted;
  try {
    const res = await fetch(`${INGEST_ENGINE_URL}/ingest?url=${encodeURIComponent(url)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch {}
    // persist normalized pieces if present
    const updates: any = { updated_at: new Date().toISOString() };
    if (parsed) {
      updates.normalized_payload = parsed;
      updates.status = "completed";
      updates.completed_at = new Date().toISOString();
    }
    await sb.from("product_ingestions").update(updates).eq("id", inserted.id).catch(() => null);
    const { data: finalRow } = await sb.from("product_ingestions").select("*").eq("id", inserted.id).single().catch(() => ({ data: inserted }));
    return finalRow?.data ?? finalRow ?? inserted;
  } catch (e: any) {
    await sb
      .from("product_ingestions")
      .update({
        last_error: `ingest_exception:${String(e?.message || e)}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inserted.id)
      .catch(() => null);
    return inserted;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Use safeGetAuth inside handler (avoids Clerk middleware-detection warnings)
    const { userId, orgId } = (safeGetAuth(req as any) as any) ?? {};
    // Parse body early so we can support unauthenticated preview requests
    const body = await req.json().catch(() => ({}));
    const parsed = postSeoUrlOnlySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "SEO_INVALID_URL", detail: parsed.error.flatten() } }, { status: 400 });
    }
    const { url, persist } = parsed.data as { url: string; persist?: boolean };

    // Resolve tenantId:
    let tenantId: string | null = orgId ?? null;
    let sbForProfile: any = null;
    if (!tenantId && userId) {
      try {
        sbForProfile = getServiceSupabaseClient();
        const { data: profileData, error: profileError } = await sbForProfile
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", userId)
          .limit(1)
          .single();
        if (!profileError && profileData?.tenant_id) {
          tenantId = profileData.tenant_id;
        }
      } catch (e) {
        // supabase service client missing or profile lookup failed; continue defensively
        console.warn("profile lookup failed while resolving tenantId:", String(e));
      }
    }

    const wantsPersist = !!persist;
    if (wantsPersist && !tenantId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED_TO_PERSIST", message: "Authentication or tenant required to persist SEO output" } }, { status: 401 });
    }

    const sb = tenantId ? (sbForProfile ?? getServiceSupabaseClient()) : null;

    // Obtain ingestion (either tenant-backed upsert OR preview via ingest engine)
    const ingestion = await upsertIngestionForUrlIfTenant(sb, tenantId, url);
    if (!ingestion && wantsPersist) {
      return NextResponse.json({ error: { code: "SEO_INGESTION_FAILED", message: "Ingestion not created" } }, { status: 500 });
    }

    // Load tenant instructions — if fetch fails, fall back to empty/default instructions
    let instructions: string | null = null;
    try {
      instructions = await loadCustomGptInstructions(tenantId ?? null);
    } catch (insErr) {
      console.warn("loadCustomGptInstructions: failed, falling back to default instructions:", String(insErr));
      instructions = null;
    }

    // Strong strict JSON fallback and placeholders (no concrete example text to avoid copy/paste bias).
    const strictJsonFallback = `
You are AvidiaSEO, an automated SEO content generator. MUST FOLLOW THESE RULES:
1) Return VALID JSON ONLY as the entire response body. No commentary, no markdown, no surrounding text.
2) JSON OBJECT MUST contain exactly these top-level keys:
   - description_html: string (full HTML description)
   - seo_payload: object with keys { h1: string, title: string, metaDescription: string }
   - features: array (can be empty)
3) If a field cannot be produced from the provided input, return an empty string "" or an empty array [].
4) Use ONLY the provided extractData and manufacturerText. Do NOT invent facts or add content not present in the input.
5) DO NOT COPY OR REUSE ANY SAMPLE VALUES — the snippet below is a TEMPLATE showing shape only. Replace placeholders with content derived from the input.
TEMPLATE (placeholders only):
{
  "description_html": "<p>{DESCRIPTION_HTML}</p>",
  "seo_payload": {
    "h1": "{H1_TEXT}",
    "title": "{TITLE_TEXT}",
    "metaDescription": "{META_TEXT}"
  },
  "features": ["{FEATURE_1}", "{FEATURE_2}"]
}
`.trim();

    // Combine tenant instructions (if present) with strict fallback — place the strict rules AFTER tenant instructions
    const finalInstructions = instructions ? `${instructions}\n\n${strictJsonFallback}` : strictJsonFallback;

    // Assemble prompt from available normalized payload (may be null)
    const { system, user } = assembleSeoPrompt({
      instructions: finalInstructions,
      extractData: ingestion?.normalized_payload ?? {},
      manufacturerText: ingestion?.raw_payload?.manufacturer_text ?? ""
    });

    // Build an explicit strict system message that reiterates placeholders and DO NOT COPY rule
    const strictSystem = `${system || "You are AvidiaSEO."}

IMPORTANT RULES (repeat):
- Return ONLY a VALID JSON object with keys: description_html, seo_payload, features.
- Do NOT reuse placeholder example text; placeholders in examples are templates only.
- Use ONLY the provided extractData and manufacturerText. Do NOT invent facts.
- If a field is missing in input, return "" or [] (empty array).`;

    // Call OpenAI (strict generation expecting JSON). Keep temperature low for determinism.
    const model = process.env.OPENAI_SEO_MODEL || "gpt-4o";
    const completion = await callOpenaiChat({
      model,
      messages: [
        { role: "system", content: strictSystem },
        { role: "user", content: JSON.stringify(user) }
      ],
      temperature: 0.0,
      max_tokens: 1400
    });

    const raw = completion?.choices?.[0]?.message?.content ?? "";
    // 1) try JSON.parse
    let out: any = null;
    try {
      out = raw ? JSON.parse(raw) : null;
    } catch {
      // 2) try to extract JSON from text (handles fenced codeblocks or commentary around JSON)
      out = extractJsonFromText(raw);
    }

    // If invalid, return detailed diagnostic (and when SEO_DEBUG enabled include raw and normalized payload)
    const seoDebug = process.env.SEO_DEBUG === "true" || process.env.SEO_DEBUG === "1";
    if (!out || typeof out !== "object") {
      console.error("SEO model returned non-JSON output:", { rawPreview: String(raw).slice(0, 4000) });
      const resp: any = {
        error: {
          code: "SEO_MODEL_ERROR",
          message:
            "Model did not return a valid JSON object. Check server logs for raw model output. Ensure custom_gpt_instructions exists and is strict.",
          raw,
        },
      };
      if (seoDebug) {
        resp.debug = {
          ingestion_normalized_payload: ingestion?.normalized_payload ?? null,
        };
      }
      return NextResponse.json(resp, { status: 502 });
    }

    const descriptionHtml = out.description_html ?? "";
    const seoPayload = out.seo_payload ?? { h1: "", title: "", metaDescription: "" };
    const features = Array.isArray(out.features) ? out.features : [];

    // Auto-heal the output
    const healed = autoHeal(descriptionHtml, seoPayload, features, { strict: true });

    // Persist seo_outputs if tenant-backed and requested
    let inserted: any = null;
    if (tenantId) {
      const insertBody: any = {
        tenant_id: tenantId,
        ingestion_id: ingestion?.id ?? null,
        input_snapshot: { url, normalized_snapshot_keys: Object.keys(ingestion?.normalized_payload ?? {}) },
        description_html: healed.html,
        seo_payload: healed.seo,
        features: healed.features,
        autoheal_log: healed.log,
        model_info: { model }
      };

      const { data: insData, error: insErr } = await sb.from("seo_outputs").insert(insertBody).select("*").single().catch((e: any) => ({ data: null, error: e }));
      if (insErr) {
        console.error("Failed to persist seo_outputs:", insErr);
        return NextResponse.json({ error: { code: "SEO_DB_ERROR", message: insErr.message || String(insErr) } }, { status: 500 });
      }
      inserted = insData;
    }

    const responseBody: any = {
      seoId: inserted?.id ?? null,
      tenantId: tenantId,
      ingestionId: ingestion?.id ?? null,
      url,
      descriptionHtml: inserted?.description_html ?? healed.html,
      seoPayload: inserted?.seo_payload ?? healed.seo,
      features: inserted?.features ?? healed.features,
      autohealLog: inserted?.autoheal_log ?? healed.log,
      createdAt: inserted?.created_at ?? new Date().toISOString()
    };

    // When debugging, include raw model output and normalized payload for inspection
    if (seoDebug) {
      responseBody._debug = {
        rawModelOutput: raw,
        parsedModelOutput: out,
        ingestion_normalized_payload: ingestion?.normalized_payload ?? null,
      };
    }

    return NextResponse.json(responseBody, { status: 200 });

  } catch (e: any) {
    console.error("POST /api/v1/seo error", e);
    return NextResponse.json({ error: { code: "SEO_MODEL_ERROR", message: String(e?.message || e) } }, { status: 500 });
  }
}
