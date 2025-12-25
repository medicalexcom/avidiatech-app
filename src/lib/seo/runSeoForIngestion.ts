import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";

/**
 * runSeoForIngestion
 *
 * - Loads product_ingestions row for ingestionId.
 * - If normalized_payload missing, tries to fallback to the extractor artifact:
 *   - looks up module_runs (input_ref = ingestionId, module_name = 'extract') for an output_ref
 *   - if found, fetches the artifact via internal output endpoint
 *   - if artifact contains normalized_payload, persist it to product_ingestions
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

  // 2) If normalized_payload missing, try to recover it from extract artifact
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

        // Construct internal output URL and call with internal secret (server-side)
        const internalUrl = `${process.env.APP_URL?.replace(/\/$/, "")}/api/v1/pipeline/run/${encodeURIComponent(
          String(pipelineRunId)
        )}/output/${encodeURIComponent(String(moduleIndex))}`;

        try {
          const res = await fetch(internalUrl, {
            method: "GET",
            headers: {
              "Accept": "application/json",
              // include internal secret so internal endpoint authenticates
              "x-pipeline-secret": process.env.PIPELINE_INTERNAL_SECRET || "",
            },
          });

          if (res.ok) {
            const body = await res.json().catch(() => null);
            // Try common shapes: { normalized_payload } or { data: { normalized_payload } } or direct object
            const candidate =
              body?.normalized_payload ?? body?.data?.normalized_payload ?? body?.data ?? body;

            if (candidate && typeof candidate === "object" && Object.keys(candidate).length > 0) {
              normalized = candidate;
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
              console.warn("[runSeoForIngestion] artifact fetch returned no normalized payload", { pipelineRunId, moduleIndex });
            }
          } else {
            const txt = await res.text().catch(() => "");
            console.warn("[runSeoForIngestion] failed to fetch artifact via internal output endpoint", { internalUrl, status: res.status, body: txt });
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
