import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// Use safeGetAuth to avoid Clerk middleware-detection warnings
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";
import { assembleSeoPrompt } from "@/lib/seo/assemblePrompt";
import { autoHeal } from "@/lib/seo/autoHeal";
import { callOpenaiChat } from "@/lib/openai";
import { applySeoPostprocessing } from "@/lib/seo/postprocess";

const INGEST_CACHE_MINUTES = parseInt(process.env.INGEST_CACHE_MINUTES || "1440", 10);

/**
 * Important: This route ENFORCES ingestion-first behavior.
 * - Request body MUST include { ingestionId: string, persist?: boolean }
 * - URL-only requests are rejected with 400.
 */

const postSeoSchema = z.object({
  ingestionId: z.string().min(1),
  persist: z.boolean().optional()
});

function extractJsonFromText(raw: string): any | null {
  if (!raw || typeof raw !== "string") return null;
  let t = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  t = t.replace(/```(?:json)?/gi, "").replace(/```/g, "");
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
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = safeGetAuth(req as any) as any;
    const { userId, orgId } = auth ?? {};

    // Parse and validate body (ingestionId required)
    const body = await req.json().catch(() => ({}));
    const parsed = postSeoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "SEO_MISSING_INGESTION", message: "ingestionId is required for /api/v1/seo" } }, { status: 400 });
    }
    const { ingestionId, persist } = parsed.data as { ingestionId: string; persist?: boolean };

    // Resolve tenantId if possible
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
        if (!profileError && profileData?.tenant_id) tenantId = profileData.tenant_id;
      } catch (e) {
        console.warn("Profile lookup failed:", String(e));
      }
    }

    // Use a Supabase service client to read ingestion row (must exist)
    const sb = getServiceSupabaseClient();

    let ingestionRow: any = null;
    let ingestionErr: any = null;
    try {
      const res = await sb.from("product_ingestions").select("*").eq("id", ingestionId).limit(1).single();
      ingestionRow = res.data;
      ingestionErr = res.error;
    } catch (e) {
      ingestionRow = null;
      ingestionErr = e;
    }

    if (ingestionErr || !ingestionRow) {
      return NextResponse.json({ error: { code: "SEO_INGESTION_NOT_FOUND", message: "ingestionId not found" } }, { status: 404 });
    }

    // Optional: If tenantId present, ensure ingestion belongs to same tenant (basic guard)
    if (tenantId && ingestionRow.tenant_id && ingestionRow.tenant_id !== tenantId) {
      return NextResponse.json({ error: { code: "SEO_INGESTION_TENANT_MISMATCH", message: "ingestion does not belong to your tenant" } }, { status: 403 });
    }

    // Use normalized_payload from the ingestion row as the ground truth. Do NOT scrape here.
    const extractData = ingestionRow.normalized_payload ?? {};

    // Load tenant instructions (with source info)
    let instructionsInfo = { text: null as string | null, source: "none" as any };
    try {
      instructionsInfo = await loadCustomGptInstructionsWithInfo(tenantId ?? null);
    } catch (e) {
      console.warn("loadCustomGptInstructionsWithInfo error:", String(e));
      instructionsInfo = { text: null, source: "none" };
    }
    const instructions = instructionsInfo.text ?? null;

    // Build strict instruction fallback (keeps shape rules)
    const strictJsonFallback = `
You are AvidiaSEO. MUST:
1) Return only a single JSON object (no commentary/markdown).
2) Object must contain keys: description_html, seo_payload {h1,title,metaDescription}, features (array).
3) Use ONLY the provided extractData. Do not invent facts.
4) If a value cannot be produced, return "" or [].
`.trim();

    const finalInstructions = instructions ? `${instructions}\n\n${strictJsonFallback}` : strictJsonFallback;

    const { system, user } = assembleSeoPrompt({
      instructions: finalInstructions,
      extractData,
      manufacturerText: ingestionRow.raw_payload?.manufacturer_text ?? ""
    });

    const strictSystem = `${system || "You are AvidiaSEO."}\n\nIMPORTANT: Return ONLY a VALID JSON object with keys: description_html, seo_payload, features. Use ONLY the provided extractData. Do NOT invent facts.`;

    // Call model
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
    let parsedOut: any = null;
    try {
      parsedOut = raw ? JSON.parse(raw) : null;
    } catch {
      parsedOut = extractJsonFromText(raw);
    }

    if (!parsedOut || typeof parsedOut !== "object") {
      return NextResponse.json({ error: { code: "SEO_MODEL_ERROR", message: "Model did not return valid JSON", raw } }, { status: 502 });
    }

    const descriptionHtml = parsedOut.description_html ?? "";
    const seoPayload = parsedOut.seo_payload ?? { h1: "", title: "", metaDescription: "" };
    const features = Array.isArray(parsedOut.features) ? parsedOut.features : [];

    // run auto-heal
    const healed = autoHeal(descriptionHtml, seoPayload, features, { strict: true });

    // persist seo_outputs if requested and tenant available
    let insertedSeo: any = null;
    if (persist && tenantId) {
      const insertBody: any = {
        tenant_id: tenantId,
        ingestion_id: ingestionId,
        input_snapshot: { normalized_snapshot_keys: Object.keys(extractData ?? {}) },
        description_html: healed.html,
        seo_payload: healed.seo,
        features: healed.features,
        autoheal_log: healed.log,
        model_info: { model }
      };

      try {
        const res = await sb.from("seo_outputs").insert(insertBody).select("*").single();
        if (res.error) {
          console.error("Failed to persist seo_outputs:", res.error);
        } else {
          insertedSeo = res.data;
          // Optionally update ingestion row metadata (non-destructive)
          try {
            await sb.from("product_ingestions").update({
              updated_at: new Date().toISOString()
            }).eq("id", ingestionId);
          } catch {
            // ignore update failures
          }
        }
      } catch (e) {
        console.error("Failed to persist seo_outputs:", e);
      }
    }

    const responseBody: any = {
      seoId: insertedSeo?.id ?? null,
      tenantId,
      ingestionId,
      url: ingestionRow.source_url ?? null,
      descriptionHtml: insertedSeo?.description_html ?? healed.html,
      seoPayload: insertedSeo?.seo_payload ?? healed.seo,
      features: insertedSeo?.features ?? healed.features,
      autohealLog: insertedSeo?.autoheal_log ?? healed.log,
      createdAt: insertedSeo?.created_at ?? new Date().toISOString()
    };

    const seoDebug = process.env.SEO_DEBUG === "true" || process.env.SEO_DEBUG === "1";
    if (seoDebug) {
      responseBody._debug = {
        rawModelOutput: raw,
        parsedModelOutput: parsedOut,
        ingestion_normalized_payload: extractData,
        instructionsSource: instructionsInfo.source,
        instructionsPreview: instructionsInfo.text ? instructionsInfo.text.slice(0, 1000) : null
      };
    }

    return NextResponse.json(responseBody, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/v1/seo error", e);
    return NextResponse.json({ error: { code: "SEO_MODEL_ERROR", message: String(e?.message || e) } }, { status: 500 });
  }
}
