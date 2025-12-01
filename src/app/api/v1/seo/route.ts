// Force Node runtime (avoids Edge quirks)
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
// ⬇️ remove direct `auth()` usage
// import { auth } from "@clerk/nextjs/server";
import { safeGetAuth } from "@/lib/clerkSafe";

import { getServiceSupabaseClient } from "@/lib/supabase";
import { postSeoUrlOnlySchema, postSeoBodySchema } from "@/lib/seo/validators";
import { upsertIngestionForUrl } from "@/lib/ingest/upsertIngestionForUrl";
import loadCustomGptInstructions from "@/lib/gpt/loadInstructions";
import { assembleSeoPrompt } from "@/lib/seo/assemblePrompt";
import { autoHeal } from "@/lib/seo/autoHeal";
import { callOpenaiChat, extractAssistantContent } from "@/lib/openai";
import { assertTenantQuota } from "@/lib/usage/quotas";

export async function POST(req: NextRequest) {
  try {
    // ✅ Use your safe helper so we don't depend on Clerk middleware detection
    const { userId, orgId } = safeGetAuth(req) as { userId?: string | null; orgId?: string | null };

    if (!userId || !orgId) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } },
        { status: 401 }
      );
    }
    const tenantId = orgId;

    // Count SEO against extract quota for now
    await assertTenantQuota(tenantId, { kind: "extract" });

    const body = await req.json();
    const hasUrl = typeof body?.url === "string" && body.url.length > 0;
    const hasIngestionId = typeof body?.ingestionId === "string" && body.ingestionId.length > 0;

    if (!hasUrl && !hasIngestionId) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Provide url or ingestionId." } },
        { status: 400 }
      );
    }

    const sb = getServiceSupabaseClient();

    // 1) Ingest or reuse
    let ingestionId: string;
    if (hasUrl) {
      const { url } = postSeoUrlOnlySchema.parse({ url: body.url });
      const ingestion = await upsertIngestionForUrl(tenantId, url);
      if (!ingestion?.id) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "SEO_INGESTION_MISSING_ID",
              message: "Ingest succeeded but no ingestionId was persisted.",
            },
          },
          { status: 500 }
        );
      }
      ingestionId = ingestion.id;
    } else {
      const parsed = postSeoBodySchema.parse({
        ingestionId: body.ingestionId,
        options: body.options, // tolerated by validator even if unused here
      });
      ingestionId = parsed.ingestionId;
    }

    // 2) Load ingestion payload for prompt composition
    const { data: fullIngestion, error: ingErr } = await sb
      .from("product_ingestions")
      .select(
        "id, url, structured_product, specs_normalized, manuals_normalized, variants_normalized, images_normalized, source_seo, manufacturer_text"
      )
      .eq("tenant_id", tenantId)
      .eq("id", ingestionId)
      .single();

    if (ingErr || !fullIngestion) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "SEO_INGESTION_NOT_FOUND",
            message: "Could not load ingestion payload after persist.",
          },
        },
        { status: 404 }
      );
    }

    // 3) Instructions (string) + prompt assembly
    const instr = await loadCustomGptInstructions(tenantId);
    const instructionsText =
      typeof instr === "string" && instr.trim().length > 0
        ? instr
        : "You are AvidiaSEO. Produce strictly-structured, compliant SEO product descriptions from normalized inputs.";

    const { system, user } = assembleSeoPrompt({
      instructions: instructionsText,
      extractData: {
        structuredProduct: fullIngestion.structured_product,
        specsNormalized: fullIngestion.specs_normalized,
        manualsNormalized: fullIngestion.manuals_normalized,
        variantsNormalized: fullIngestion.variants_normalized,
        imagesNormalized: fullIngestion.images_normalized,
        sourceSeo: fullIngestion.source_seo,
      },
      manufacturerText: fullIngestion.manufacturer_text ?? "",
    });

    // 4) OpenAI via wrapper (messages array)
    const resp = await callOpenaiChat({
      model: process.env.OPENAI_SEO_MODEL || "gpt-4.1",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
      max_tokens: 1400,
    });

    const content = extractAssistantContent(resp);
    let out: any;
    try {
      out = JSON.parse(content || "{}");
    } catch {
      out = {};
    }

    const descriptionHtml: string = out.description_html ?? "";
    const seoPayload = out.seo_payload ?? { h1: "", title: "", metaDescription: "" };
    const features: string[] = Array.isArray(out.features) ? out.features : [];

    // 5) Auto-heal
    const healed = autoHeal(descriptionHtml, seoPayload, features, { strict: true });

    // 6) Persist seo_outputs
    const { data: inserted, error: insErr } = await sb
      .from("seo_outputs")
      .insert({
        tenant_id: tenantId,
        ingestion_id: fullIngestion.id,
        input_snapshot: user,
        description_html: healed.html,
        seo_payload: healed.seo,
        features: healed.features,
        autoheal_log: healed.log,
        model_info: {
          model: process.env.OPENAI_SEO_MODEL || "gpt-4.1",
          usage: resp?.usage ?? null,
        },
      })
      .select("id, created_at, description_html, seo_payload, features, autoheal_log")
      .single();

    if (insErr || !inserted?.id) {
      return NextResponse.json(
        { ok: false, error: { code: "SEO_DB_ERROR", message: insErr?.message || "Could not insert SEO output." } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      ingestionId: fullIngestion.id,
      seoId: inserted.id,
      url: fullIngestion.url,
      descriptionHtml: inserted.description_html,
      seoPayload: inserted.seo_payload,
      features: inserted.features,
      autohealLog: inserted.autoheal_log,
      createdAt: inserted.created_at,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { code: "SEO_MODEL_ERROR", message: String(e?.message || e) } },
      { status: 500 }
    );
  }
}
