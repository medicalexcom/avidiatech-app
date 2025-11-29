// POST /api/v1/seo - generate AvidiaSEO output for an existing ingestion job OR from a raw URL
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * Request body:
 *  - { ingestionId }             // existing: persist seo to this ingestion
 *  - { url, persist?: boolean }   // direct-from-url: generate (and optionally persist to a new ingestion)
 *
 * Behavior:
 *  - If ingestionId provided: load job, run generator using job.normalized_payload or job.raw_payload, persist seo_payload + description_html
 *  - Else if url provided: fetch URL, scrape basic source_seo, run generator, if persist true create a product_ingestions row and persist seo there, else just return generated SEO (no DB write)
 *
 * NOTE: This route uses a simple mock generator for testing. Replace with your GPT/LLM integration.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ingestionId = body?.ingestionId;
    const url = body?.url;
    const persist = !!body?.persist;

    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err?.message || err);
      return NextResponse.json({ error: "server misconfigured: missing Supabase envs" }, { status: 500 });
    }

    let sourceSeo: any = {};
    let rawPreview = "";

    if (ingestionId) {
      // load existing job
      const { data: job, error: fetchErr } = await supabase.from("product_ingestions").select("*").eq("id", ingestionId).single();
      if (fetchErr || !job) {
        console.warn("job not found", { ingestionId, fetchErr });
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
      sourceSeo = job.normalized_payload?.source_seo || {};
      rawPreview = job.normalized_payload?.raw_preview || job.raw_payload?.raw_preview || "";
    } else if (url) {
      // fetch the url and extract simple metadata (title, meta description)
      try {
        const resp = await fetch(url, { method: "GET" });
        const html = await resp.text();
        rawPreview = html.slice(0, 20000);
        // simple parsing for title/meta (server-side)
        const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
        const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
        sourceSeo = {
          source_h1: (html.match(/<h1[^>]*>([^<]*)<\/h1>/i) || [null, null])[1] || null,
          source_title_tag: titleMatch ? titleMatch[1] : null,
          source_meta_description: metaMatch ? metaMatch[1] : null,
          canonical: (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i) || [null, null])[1] || null,
        };
      } catch (err) {
        console.warn("failed to fetch url for seo", url, err);
        // continue with empty sourceSeo/rawPreview
      }
    } else {
      return NextResponse.json({ error: "missing ingestionId or url" }, { status: 400 });
    }

    // MOCK generator: replace with GPT integration
    const generated = {
      h1: sourceSeo.source_h1 || "Product",
      title: (sourceSeo.source_title_tag || "Product") + " | AvidiaTech",
      meta_description: (sourceSeo.source_meta_description && sourceSeo.source_meta_description.slice(0, 300)) || `Buy ${(sourceSeo.source_title_tag || "this product")} — features and specs.`,
      seo_short_description: (sourceSeo.source_meta_description || "").slice(0, 160),
      features: [],
    };
    const descriptionHtml = `<h1>${generated.h1}</h1><p>${generated.meta_description}</p>`;

    // If ingestionId present -> persist to that ingestion row
    if (ingestionId) {
      const { error: updErr } = await supabase.from("product_ingestions").update({
        seo_payload: generated,
        description_html: descriptionHtml,
        features: generated.features,
        seo_generated_at: new Date().toISOString(),
      }).eq("id", ingestionId);

      if (updErr) {
        console.error("failed to update seo payload", updErr);
        return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, ingestionId }, { status: 200 });
    }

    // If url provided and persist requested: create a new ingestion row and persist seo there
    if (url && persist) {
      const insert = {
        tenant_id: null,
        user_id: userId,
        source_url: url,
        status: "success",
        raw_payload: { raw_preview: rawPreview },
        normalized_payload: { source_seo: sourceSeo }, // minimal normalized payload
        seo_payload: generated,
        description_html: descriptionHtml,
        features: generated.features,
        flags: { full_extract: false },
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      const { data: created, error: insertErr } = await supabase.from("product_ingestions").insert(insert).select("id").single();
      if (insertErr) {
        console.error("failed to create ingestion for seo persist", insertErr);
        return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, ingestionId: created.id }, { status: 200 });
    }

    // Otherwise return generated SEO (no persistence)
    return NextResponse.json({ ok: true, seo_payload: generated, description_html: descriptionHtml, source_seo: sourceSeo }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/v1/seo error:", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
