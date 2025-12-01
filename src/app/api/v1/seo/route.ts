// src/app/api/v1/seo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { postSeoUrlOnlySchema } from "@/lib/seo/validators";
import { upsertIngestionForUrl } from "@/lib/ingest/upsertIngestionForUrl";
import { loadCustomGptInstructions } from "@/lib/gpt/loadInstructions";
import { assembleSeoPrompt } from "@/lib/seo/assemblePrompt";
import { autoHeal } from "@/lib/seo/autoHeal";
import { openai } from "@/lib/openai";
import { assertTenantQuota } from "@/lib/usage/quotas";

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = auth();
    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Authentication required." } }, { status: 401 });
    }
    const tenantId = orgId;

    const body = await req.json();
    const { url } = postSeoUrlOnlySchema.parse(body);

    await assertTenantQuota(tenantId, { kind: "seo" });

    // 1) Ingest (reuse fresh or create new) and guarantee we have a DB id
    const ingestion = await upsertIngestionForUrl(tenantId, url);
    if (!ingestion?.id) {
      return NextResponse.json(
        { ok: false, error: { code: "SEO_INGESTION_MISSING_ID", message: "Ingest succeeded but no ingestionId was persisted." } },
        { status: 500 }
      );
    }

    // 2) Load the ingestion payload for prompt composition
    const sb = getServiceSupabaseClient();
    const { data: fullIngestion, error: ingErr } = await sb
      .from("product_ingestions")
      .select(
        "id, structured_product, specs_normalized, manuals_normalized, variants_normalized, images_normalized, source_seo, manufacturer_text"
      )
      .eq("tenant_id", tenantId)
      .eq("id", ingestion.id)
      .single();

    if (ingErr || !fullIngestion) {
      return NextResponse.json(
        { ok: false, error: { code: "SEO_INGESTION_NOT_FOUND", message: "Could not load ingestion payload after persist." } },
        { status: 404 }
      );
    }

    // 3) Custom GPT instructions
    const instructions = await loadCustomGptInstructions(tenantId);

    // 4) Prompt assembly (strict by default)
    const { system, user } = assembleSeoPrompt({
      instructions,
      extractData: {
        structuredProduct: fullIngestion.structured_product,
        specsNormalized: fullIngestion.specs_normalized,
        manualsNormalized: fullIngestion.manuals_normalized,
        variantsNormalized: fullIngestion.variants_normalized,
        imagesNormalized: fullIngestion.images_normalized,
        sourceSeo: fullIngestion.source_seo,
      },
      manufacturerText: fullIngestion.manufacturer_text ?? "",
      options: { includeManualsSection: true, includeSpecsSection: true, strictMode: true },
    });

    // 5) OpenAI
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_SEO_MODEL || "gpt-4.1",
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    let out: any;
    try {
      out = JSON.parse(raw);
    } catch {
      out = {};
    }

    const descriptionHtml: string = out.description_html ?? "";
    const seoPayload = out.seo_payload ?? { h1: "", title: "", metaDescription: "" };
    const features: string[] = Array.isArray(out.features) ? out.features : [];

    // 6) Auto-heal
    const healed = autoHeal(descriptionHtml, seoPayload, features, { strict: true });

    // 7) Persist seo_outputs
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
        model_info: { model: process.env.OPENAI_SEO_MODEL || "gpt-4.1" },
      })
      .select("id, created_at, description_html, seo_payload, features, autoheal_log")
      .single();

    if (insErr || !inserted?.id) {
      return NextResponse.json(
        { ok: false, error: { code: "SEO_DB_ERROR", message: insErr?.message || "Could not insert SEO output." } },
        { status: 500 }
      );
    }

    // Optionally increment usage here
    // await incrementTenantUsage(tenantId, { kind: "seo" });

    return NextResponse.json({
      ok: true,
      ingestionId: fullIngestion.id,
      seoId: inserted.id,
      url,
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
