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

/**
 * If we have a tenantId, persist and/or upsert a product_ingestions row and
 * (optionally) call the ingest engine to obtain a normalized preview. If no
 * tenantId is provided we instead call the ingest engine directly (preview-only)
 * and do NOT persist DB rows.
 */
async function upsertIngestionForUrlIfTenant(sb: any, tenantId: string | null, url: string) {
  if (!tenantId) {
    // preview-only path: call ingest engine directly (best-effort) and return an object shaped
    // similarly to persisted ingestion rows (no id).
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

  // tenant-backed path: try to upsert / reuse a recent ingestion and persist it.
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
    // - prefer orgId from Clerk (when users are in org context)
    // - otherwise, if userId present, try to look up profiles. If no profile/tenant found, tenantId remains null.
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

    // If the request wants to persist results (or create an ingestion row), require a tenant/user.
    const wantsPersist = !!persist;
    if (wantsPersist && !tenantId) {
      // user not authorized to persist without tenant context
      return NextResponse.json({ error: { code: "UNAUTHORIZED_TO_PERSIST", message: "Authentication or tenant required to persist SEO output" } }, { status: 401 });
    }

    // If we need SB for tenant-backed operations, ensure we have it
    const sb = tenantId ? (sbForProfile ?? getServiceSupabaseClient()) : null;

    // Obtain ingestion (either tenant-backed upsert OR preview via ingest engine)
    const ingestion = await upsertIngestionForUrlIfTenant(sb, tenantId, url);
    if (!ingestion) {
      // For preview-only, we may still proceed with normalized_payload null; for tenant-backed persist this is an error.
      if (wantsPersist) {
        return NextResponse.json({ error: { code: "SEO_INGESTION_FAILED", message: "Ingestion not created" } }, { status: 500 });
      }
    }

    // Load tenant instructions (allow empty/default when tenantId missing)
    const instructions = await loadCustomGptInstructions(tenantId ?? null);

    // Assemble prompt from available normalized payload (may be null)
    const { system, user } = assembleSeoPrompt({
      instructions,
      extractData: ingestion?.normalized_payload ?? {},
      manufacturerText: ingestion?.raw_payload?.manufacturer_text ?? ""
    });

    // Call OpenAI (strict generation expecting JSON)
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
      // Return a useful error for the client
      return NextResponse.json({ error: { code: "SEO_MODEL_ERROR", message: "Model returned non-JSON", raw } }, { status: 500 });
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
        return NextResponse.json({ error: { code: "SEO_DB_ERROR", message: insErr.message || String(insErr) } }, { status: 500 });
      }
      inserted = insData;
    }

    // Return response shaped for the dashboard UI. If persisted -> include ids, otherwise return preview fields.
    return NextResponse.json({
      seoId: inserted?.id ?? null,
      tenantId: tenantId,
      ingestionId: ingestion?.id ?? null,
      url,
      descriptionHtml: inserted?.description_html ?? healed.html,
      seoPayload: inserted?.seo_payload ?? healed.seo,
      features: inserted?.features ?? healed.features,
      autohealLog: inserted?.autoheal_log ?? healed.log,
      createdAt: inserted?.created_at ?? new Date().toISOString()
    }, { status: 200 });

  } catch (e: any) {
    console.error("POST /api/v1/seo error", e);
    return NextResponse.json({ error: { code: "SEO_MODEL_ERROR", message: String(e?.message || e) } }, { status: 500 });
  }
}
