import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";

/**
 * Try to build a normalized_payload object from the extract artifact structure.
 * This is intentionally permissive: it uses the richest available fields and
 * keeps the shape reasonably similar to what other parts of the app expect.
 */
function buildNormalizedFromExtractArtifact(extract: any) {
  if (!extract || typeof extract !== "object") return null;

  // Prefer explicit normalized_payload if present
  if (extract.normalized_payload && typeof extract.normalized_payload === "object") {
    return extract.normalized_payload;
  }

  const normalized: any = {};

  // Name - prefer name_best, then name_raw
  normalized.name = extract.name_best || extract.name_raw || extract.title || null;
  normalized.name_best = normalized.name;

  // Description - prefer description_raw or sections.description or a join of features_html
  normalized.description =
    extract.description_raw ||
    extract.sections?.description ||
    (Array.isArray(extract.features_html) ? extract.features_html.slice(0, 6).join("\n\n") : null) ||
    null;

  // Images - standardize to array of { url, alt? }
  if (Array.isArray(extract.images)) {
    normalized.images = extract.images
      .map((i: any) => {
        if (!i) return null;
        if (typeof i === "string") return { url: i };
        if (i.url) return { url: i.url, alt: i.alt ?? null };
        return null;
      })
      .filter(Boolean);
  } else {
    normalized.images = [];
  }

  // PDF manuals
  normalized.pdf_manual_urls = Array.isArray(extract.pdf_manual_urls)
    ? extract.pdf_manual_urls
    : Array.isArray(extract.pdfs)
    ? extract.pdfs
    : [];

  // Features: prefer features_structured, features_raw, features_html
  if (Array.isArray(extract.features_structured) && extract.features_structured.length > 0) {
    normalized.features_raw = extract.features_structured;
  } else if (Array.isArray(extract.features_raw) && extract.features_raw.length > 0) {
    normalized.features_raw = extract.features_raw;
  } else if (Array.isArray(extract.features_html) && extract.features_html.length > 0) {
    normalized.features_raw = extract.features_html;
  } else {
    normalized.features_raw = [];
  }

  // Specs: prefer structured specs
  normalized.specs = extract.specs_structured || extract.specs || extract.sections?.specifications || {};

  // brand, sku
  if (extract.brand) normalized.brand = extract.brand;
  if (extract.sku) normalized.sku = extract.sku;

  // small metadata & fallback fields
  if (extract.quality_score != null) normalized.quality_score = extract.quality_score;
  normalized._source = extract.source || null;
  normalized._artifact_generated_at = extract.generatedAt || extract.created_at || null;

  // Cleanup empty arrays/objects for cleanliness
  if (Array.isArray(normalized.images) && normalized.images.length === 0) delete normalized.images;
  if (Array.isArray(normalized.features_raw) && normalized.features_raw.length === 0) delete normalized.features_raw;
  if (Array.isArray(normalized.pdf_manual_urls) && normalized.pdf_manual_urls.length === 0) delete normalized.pdf_manual_urls;
  if (normalized.specs && Object.keys(normalized.specs).length === 0) delete normalized.specs;

  // Ensure we return at least one usable field
  if (!normalized.name && !normalized.description && !normalized.features_raw && !normalized.specs) return null;
  return normalized;
}

/**
 * runSeoForIngestion
 *
 * - Loads product_ingestions row for ingestionId.
 * - If normalized_payload missing, tries to fallback to the extractor artifact:
 *   - looks up module_runs (input_ref = ingestionId, module_name = 'extract') for an output_ref
 *   - if found, fetches the artifact via internal output endpoint (using PIPELINE_INTERNAL_SECRET)
 *   - attempts to build a normalized payload from the artifact and persists it
 * - Calls callSeoModel with a normalized payload and persists seo results.
 */
export async function runSeoForIngestion(ingestionId: string): Promise<{
  ingestionId: string;
  seo_payload: any;
  description_html: string | null;
  features: string[] | null;
}> {
  const supabase = getServiceSupabaseClient();

  // 1) Load ingestion row
  const { data: ingestion, error: loadErr } = await supabase
    .from("product_ingestions")
    .select(
      "id, tenant_id, user_id, source_url, normalized_payload, seo_payload, description_html, features, correlation_id, diagnostics, status"
    )
    .eq("id", ingestionId)
    .maybeSingle();

  if (loadErr) {
    throw new Error(`ingestion_load_failed: ${loadErr.message || String(loadErr)}`);
  }

  if (!ingestion) {
    throw new Error("ingestion_not_found");
  }

  // 2) If normalized_payload missing, try to recover it from extract artifact or build from extract data
  let normalized = (ingestion as any).normalized_payload as any;

  if (!normalized) {
    try {
      // Find latest extract module_run that references this ingestion by input_ref
      const { data: extractRow, error: extractErr } = await supabase
        .from("module_runs")
        .select("pipeline_run_id, module_index, output_ref, created_at")
        .eq("input_ref", ingestionId)
        .eq("module_name", "extract")
        .not("output_ref", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (extractErr) {
        console.warn("[runSeoForIngestion] module_runs query failed:", extractErr);
      } else if (extractRow && extractRow.output_ref) {
        // Try to fetch the artifact via internal output endpoint
        const pipelineRunId = extractRow.pipeline_run_id;
        const moduleIndex = extractRow.module_index;

        const internalUrl = `${process.env.APP_URL?.replace(/\/$/, "")}/api/v1/pipeline/run/${encodeURIComponent(
          String(pipelineRunId)
        )}/output/${encodeURIComponent(String(moduleIndex))}`;

        try {
          const res = await fetch(internalUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "x-pipeline-secret": process.env.PIPELINE_INTERNAL_SECRET || "",
            },
          });

          if (res.ok) {
            const body = await res.json().catch(() => null);

            // Candidate shapes:
            // - artifact may be returned as body.output.extract
            // - artifact may embed normalized_payload at various places
            let candidate =
              body?.normalized_payload ?? body?.data?.normalized_payload ?? body?.data ?? body ?? null;

            // If API returns wrapper { output: { extract: { ... } } }
            if (!candidate && body?.output?.extract) {
              candidate = body.output.extract;
            } else if (!candidate && body?.output) {
              candidate = body.output;
            }

            // Now try to build normalized payload from candidate if needed
            let maybeNormalized: any = null;
            if (candidate && typeof candidate === "object") {
              // If candidate already looks normalized (has keys we expect), use it
              if (candidate.name || candidate.name_best || candidate.features_raw || candidate.specs) {
                maybeNormalized = candidate;
              } else if (candidate.extract) {
                maybeNormalized = buildNormalizedFromExtractArtifact(candidate.extract);
              } else {
                maybeNormalized = buildNormalizedFromExtractArtifact(candidate);
              }
            }

            if (maybeNormalized) {
              normalized = maybeNormalized;
              // persist normalized_payload back into product_ingestions so future runs don't need fallback
              try {
                const { error: updErr } = await supabase
                  .from("product_ingestions")
                  .update({
                    normalized_payload: normalized,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", ingestionId);

                if (updErr) {
                  console.warn("[runSeoForIngestion] failed to persist normalized_payload from artifact:", updErr);
                } else {
                  console.log("[runSeoForIngestion] persisted normalized_payload from extract artifact for", ingestionId);
                }
              } catch (err) {
                console.warn("[runSeoForIngestion] error persisting normalized_payload:", err);
              }
            } else {
              console.warn("[runSeoForIngestion] artifact fetch returned no usable normalized payload", {
                pipelineRunId,
                moduleIndex,
                output_ref: extractRow.output_ref,
              });
            }
          } else {
            const txt = await res.text().catch(() => "");
            console.warn("[runSeoForIngestion] failed to fetch artifact via internal output endpoint", {
              internalUrl,
              status: res.status,
              body: txt,
            });
          }
        } catch (err) {
          console.warn("[runSeoForIngestion] error fetching artifact via internal output endpoint", err);
        }
      } else {
        console.info("[runSeoForIngestion] no extract artifact output_ref found for ingestion", ingestionId);
      }
    } catch (err) {
      console.warn("[runSeoForIngestion] artifact fallback error", err);
    }
  }

  // If still missing, abort
  if (!normalized) {
    throw new Error("ingestion_not_ready");
  }

  const startedAt = new Date().toISOString();

  // 3) Call central GPT
  const seoResult = await callSeoModel(
    normalized,
    (ingestion as any).correlation_id || null,
    (ingestion as any).source_url || null,
    (ingestion as any).tenant_id || null
  );

  const finishedAt = new Date().toISOString();

  // 4) Merge diagnostics
  const diagnostics = (ingestion as any).diagnostics || {};
  const seoDiagnostics = {
    ...(diagnostics.seo || {}),
    last_run_at: finishedAt,
    started_at: startedAt,
    status: "completed",
  };
  const updatedDiagnostics = {
    ...diagnostics,
    seo: seoDiagnostics,
  };

  // 5) Persist SEO into product_ingestions
  const { data: updatedRows, error: updErr } = await supabase
    .from("product_ingestions")
    .update({
      seo_payload: seoResult.seo_payload,
      description_html: seoResult.description_html,
      features: seoResult.features,
      seo_generated_at: finishedAt,
      diagnostics: updatedDiagnostics,
      updated_at: finishedAt,
    })
    .eq("id", ingestionId)
    .select("id, seo_payload, description_html, features")
    .maybeSingle();

  if (updErr) {
    throw new Error(`seo_persist_failed: ${updErr.message || String(updErr)}`);
  }

  console.log("[api/v1/seo] SEO persisted", {
    ingestionId,
    hasSeo: !!updatedRows?.seo_payload,
    hasDescription: !!updatedRows?.description_html,
    featuresCount: Array.isArray(updatedRows?.features) ? updatedRows?.features.length : null,
  });

  // 6) Return SEO to caller
  return {
    ingestionId,
    seo_payload: updatedRows?.seo_payload ?? seoResult.seo_payload,
    description_html: updatedRows?.description_html ?? seoResult.description_html,
    features: updatedRows?.features ?? seoResult.features,
  };
}
