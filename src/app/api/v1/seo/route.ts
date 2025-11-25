// POST /api/v1/seo - generate AvidiaSEO output for an existing ingestion job
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * This route generates AvidiaSEO content for an existing ingestion job.
 * It expects: { ingestionId: string }
 *
 * NOTE: This implementation uses a mock generator for testing. Replace
 * the mock block with your actual LLM/GPT call and token accounting.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ingestionId = body?.ingestionId;
    if (!ingestionId) return NextResponse.json({ error: "missing ingestionId" }, { status: 400 });

    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err?.message || err);
      return NextResponse.json({ error: "server misconfigured: missing Supabase envs" }, { status: 500 });
    }

    // Fetch job
    const { data: job, error: fetchErr } = await supabase.from("product_ingestions").select("*").eq("id", ingestionId).single();
    if (fetchErr || !job) {
      console.warn("job not found", { ingestionId, fetchErr });
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Pull source SEO and raw text to feed the generator
    const sourceSeo = job.normalized_payload?.source_seo || {};
    const rawPreview = job.normalized_payload?.raw_preview || job.raw_payload?.raw_preview || "";

    // Mock generator: produce title/meta/description using scraped values
    // Replace this with a proper GPT call that uses rawPreview + sourceSeo and prompts.
    const generated = {
      h1: sourceSeo.source_h1 || (job.normalized_payload?.name || "Product"),
      title: (sourceSeo.source_title_tag || (job.normalized_payload?.name || "Product")) + " | AvidiaTech",
      meta_description: (sourceSeo.source_meta_description && sourceSeo.source_meta_description.slice(0, 300)) || (`Buy ${(job.normalized_payload?.name) || "this product"} — features, specs, and manuals.`),
      seo_short_description: (sourceSeo.source_meta_description || "").slice(0, 160),
      features: job.normalized_payload?.features || [],
    };

    const descriptionHtml = `<h1>${generated.h1}</h1><p>${generated.meta_description}</p>`;

    // Persist only AvidiaSEO outputs: seo_payload, description_html, features (do NOT overwrite source_seo)
    const { error: updErr } = await supabase.from("product_ingestions").update({
      seo_payload: generated,
      description_html: descriptionHtml,
      features: generated.features,
      // optionally update a timestamp for seo_generated_at
      seo_generated_at: new Date().toISOString(),
    }).eq("id", ingestionId);

    if (updErr) {
      console.error("failed to update seo payload", updErr);
      return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ingestionId }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/v1/seo error:", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
