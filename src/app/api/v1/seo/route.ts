import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// replaced auth() with safeGetAuth(req)
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { postSeoUrlOnlySchema } from "@/lib/seo/validators";
import { loadCustomGptInstructions } from "@/lib/gpt/loadInstructions";
import { assembleSeoPrompt } from "@/lib/seo/assemblePrompt";
import { autoHeal } from "@/lib/seo/autoHeal";
import { callOpenaiChat } from "@/lib/openai";

const INGEST_ENGINE_URL = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");
const INGEST_CACHE_MINUTES = parseInt(process.env.INGEST_CACHE_MINUTES || "1440", 10);

async function upsertIngestionForUrl(sb: any, tenantId: string, url: string) {
  // 1) check fresh ingestion
  const freshnessThreshold = new Date(Date.now() - INGEST_CACHE_MINUTES * 60_000).toISOString();
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
    .single();

  // 3) call ingest engine synchronously to obtain normalized preview (best-effort)
  if (!INGEST_ENGINE_URL) return inserted;
  try {
    const res = await fetch(`${INGEST_ENGINE_URL}/ingest?url=${encodeURIComponent(url)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    if (res.ok) {
      let parsed: any = {};
      try { parsed = JSON.parse(text); } catch {}
      // persist normalized pieces if present
      const updates: any = { updated_at: new Date().toISOString() };
      if (parsed) {
        updates.normalized_payload = parsed;
        updates.status = "completed";
        updates.completed_at = new Date().toISOString();
      }
      await sb.from("product_ingestions").update(updates).eq("id", inserted.id);
      const { data: finalRow } = await sb.from("product_ingestions").select("*").eq("id", inserted.id).single();
      return finalRow;
    } else {
      // record last_error
      await sb.from("product_ingestions").update({
        last_error: `ingest_failed_${res.status}`,
        updated_at: new Date().toISOString(),
      }).eq("id", inserted.id);
      return inserted;
    }
  } catch (e: any) {
    await sb.from("product_ingestions").update({
      last_error: `ingest_exception:${String(e?.message||e)}`,
      updated_at: new Date().toISOString(),
    }).eq("id", inserted.id);
    return inserted;
  }
}

export async function POST(req: NextRequest) {
  try {
    // use safeGetAuth inside handler scope to avoid Clerk middleware-detection warnings
    const { userId, orgId } = (safeGetAuth(req as any) as any) ?? {};
    if (!userId || !orgId) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    const tenantId = orgId as string;

    const body = await req.json();
    const parsed = postSeoUrlOnlySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "SEO_INVALID_URL", detail: parsed.error.flatten() } }, { status: 400 });
    }
    const { url } = parsed.data;

    const sb = getServiceSupabaseClient();

    // 1) obtain ingestion (fresh or new)
    const ingestion = await upsertIngestionForUrl(sb, tenantId, url);

    // If ingestion indicates failure or missing normalized payload, surface an error
    if (!ingestion) {
      return NextResponse.json({ error: { code: "SEO_INGESTION_FAILED", message: "Ingestion not created" } }, { status: 500 });
    }

    if (!ingestion.normalized_payload) {
      // still allow attempt, but warn
      // we could return an error here; for UX we attempt generation with whatever exists
    }

    // 2) load tenant instructions
    const instructions = await loadCustomGptInstructions(tenantId);

    // 3) assemble prompt strictly from normalized fields
    const { system, user } = assembleSeoPrompt({
      instructions,
      extractData: ingestion.normalized_payload ?? {},
      manufacturerText: ingestion.raw_payload?.manufacturer_text ?? ""
    });

    // 4) enforce tenant quota (placeholder - implement assertTenantQuota as needed)
    // await assertTenantQuota(tenantId, { kind: "seo" });

    // 5) call OpenAI (strict generation, expecting JSON)
    const model = process.env.OPENAI_SEO_MODEL || "gpt-4o";
    const completion = await callOpenaiChat({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) }
      ],
      temperature: 0.2,
      max_tokens: 1200
    });

    const raw = completion?.choices?.[0]?.message?.content ?? "{}";
    let out: any = {};
    try { out = JSON.parse(raw); } catch (e) {
      return NextResponse.json({ error: { code: "SEO_MODEL_ERROR", message: "Model returned non-JSON" , raw } }, { status: 500 });
    }

    const descriptionHtml = out.description_html ?? "";
    const seoPayload = out.seo_payload ?? { h1: "", title: "", metaDescription: "" };
    const features = Array.isArray(out.features) ? out.features : [];

    // 6) autoHeal strict
    const healed = autoHeal(descriptionHtml, seoPayload, features, { strict: true });

    // 7) persist seo_outputs
    const insertBody: any = {
      tenant_id: tenantId,
      ingestion_id: ingestion.id,
      input_snapshot: { url, normalized_snapshot_keys: Object.keys(ingestion.normalized_payload ?? {}) },
      description_html: healed.html,
      seo_payload: healed.seo,
      features: healed.features,
      autoheal_log: healed.log,
      model_info: { model }
    };

    const { data: inserted, error: insErr } = await sb.from("seo_outputs").insert(insertBody).select("*").single();
    if (insErr) {
      return NextResponse.json({ error: { code: "SEO_DB_ERROR", message: insErr.message } }, { status: 500 });
    }

    // TODO: increment tenant usage counters

    return NextResponse.json({
      seoId: inserted.id,
      tenantId,
      ingestionId: ingestion.id,
      url,
      descriptionHtml: inserted.description_html,
      seoPayload: inserted.seo_payload,
      features: inserted.features,
      autohealLog: inserted.autoheal_log,
      createdAt: inserted.created_at
    }, { status: 200 });

  } catch (e: any) {
    console.error("POST /api/v1/seo error", e);
    return NextResponse.json({ error: { code: "SEO_MODEL_ERROR", message: String(e?.message || e) } }, { status: 500 });
  }
}
