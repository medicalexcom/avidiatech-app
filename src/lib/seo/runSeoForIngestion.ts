import { createSeoIngestionJob } from "@/lib/seo/seoIngestionQueue";
import { callSeoModel } from "@/lib/seo/callSeoModel";
import { repairSeoModel } from "@/lib/seo/repairSeoModel";
import { lintSeoOutput } from "@/lib/audit/seoComplianceLinter";
import { loadPromptProfile } from "@/lib/gpt/loadPromptProfile";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

const DEFAULT_MAPPINGS = {
  name_raw: null,
  name: null,
  description_raw: null,
  pdf_text: "",
  pdf_docs: [],
  pdf_manual_urls: [],
  browsed_text: null,
  variant_matrix: null,
  features_raw: [],
  images: [],
  specs: {},
  brand: null,
  sku: null,
  category_path: null,
  category_leaf: null,
  source_url: null,
  qrcode_text: null,
  warranty_text: null,
  manuals_list: [],
  internal_links: [],
};

function mapIngestionFieldToSeoInput(ingestion: any) {
  const raw = ingestion.normalized_payload || {};
  const out = { ...DEFAULT_MAPPINGS };

  for (const [k, v] of Object.entries(raw)) {
    if (v !== null && v !== undefined && Object.prototype.hasOwnProperty.call(out, k)) {
      (out as any)[k] = v;
    }
  }

  return out;
}

function mapSeoResultToStore(seoResult: any) {
  const def = {
    name: "",
    sku: "",
    short_description: "",
    description_html: "",
    meta_title: "",
    meta_description: "",
    generated_product_url: "",
    h1: "",
    search_keywords: [],
    features: [],
    internal_links: [],
  };

  return {
    ...def,
    name: String(seoResult?.seo?.h1 ?? "").trim(),
    sku: String(seoResult?.sku ?? "").trim(),
    short_description: String(seoResult?.seo?.shortDescription ?? "").trim(),
    description_html: String(seoResult?.descriptionHtml ?? "").trim(),
    meta_title: String(seoResult?.seo?.title ?? "").trim(),
    meta_description: String(seoResult?.seo?.metaDescription ?? "").trim(),
    generated_product_url: String(seoResult?.seo?.url ?? "").trim(),
    h1: String(seoResult?.seo?.h1 ?? "").trim(),
    search_keywords: Array.isArray(seoResult?.search_keywords) ? seoResult.search_keywords : [],
    features: Array.isArray(seoResult?.features) ? seoResult.features : [],
    internal_links: Array.isArray(seoResult?.internal_links) ? seoResult.internal_links : [],
  };
}

export async function runSeoForIngestion(ingestion: any): Promise<{ ok: boolean; result: any }> {
  if (
    !ingestion ||
    !ingestion.id ||
    ingestion.status !== "normalized" ||
    !ingestion.normalized_payload
  ) {
    return { ok: false, result: `invalid_ingestion_for_seo: ${JSON.stringify(ingestion?.id)}` };
  }

  try {
    const seoIngestionId = `${ingestion.id}-seo-${Date.now()}`;

    // Auto-heal if name_raw looks like a URL or is empty.
    const seoInput = mapIngestionFieldToSeoInput(ingestion);
    if (
      !seoInput.name_raw ||
      String(seoInput.name_raw).toLowerCase().includes("http") ||
      String(seoInput.name_raw).toLowerCase().includes("www.")
    ) {
      if (seoInput.description_raw && typeof seoInput.description_raw === "string") {
        const firstLine = seoInput.description_raw.split("\n")[0]?.trim();
        if (firstLine && firstLine.length < 300 && !firstLine.toLowerCase().includes("http")) {
          seoInput.name_raw = firstLine;
        }
      }
    }

    console.info(
      `[runSeoForIngestion] Starting for ingestion ${ingestion.id} (tenant: ${
        (ingestion as any).tenant_id ?? "null"
      })`
    );

    await supabaseServiceRole
      .from("ingestions")
      .update({ status: "generating_seo", seo_result: null, seo_attempts: [] })
      .eq("id", ingestion.id)
      .throwOnError();

    const startedAt = Date.now();

    // Update to use profile system with linter configuration
    const profile = await loadPromptProfile({ 
      tenantId: (ingestion as any).tenant_id ?? null,
      storeVars: { STORE_NAME: "MedicalEx" } // Default, can be customized per tenant
    });

    // Profile metadata for the SEO result
    const seoMeta = {
      ingestion_id: ingestion.id,
      seo_ingestion_id: seoIngestionId,
      started_at: new Date(startedAt).toISOString(),
      tenant_id: (ingestion as any).tenant_id ?? null,
      profile_key: profile.profileKey,
      profile_config: {
        h1_length: profile.h1Length,
        meta_title_suffix: profile.metaTitleSuffix,
        internal_links: profile.internalLinks,
        manuals_section: profile.manualsSection,
      },
    };

    const attempts: Array<{
      attempt: number;
      seoResult: any;
      lint: ReturnType<typeof lintSeoOutput>;
    }> = [];

    // Attempt 1: initial generation
    let currentSeoResult = await callSeoModel(
      seoInput as any,
      (ingestion as any).source_url || null,
      (ingestion as any).tenant_id || null,
      (ingestion as any).correlation_id || null
    );

    {
      const storePayload = mapSeoResultToStore(currentSeoResult);
      
      // Pass profile configuration to linter
      const currentLint = lintSeoOutput(
        {
          instructionsText: profile.compiledPrompt ?? null,
          seo_payload: storePayload,
          description_html: String(currentSeoResult?.descriptionHtml ?? ""),
          features: Array.isArray(currentSeoResult?.features) ? currentSeoResult.features : [],
          normalized_payload: seoInput,
        },
        profile.compiledPrompt,
        {
          h1Length: profile.h1Length,
          internalLinks: profile.internalLinks,
          manualsSection: profile.manualsSection,
          metaTitleSuffix: profile.metaTitleSuffix,
          storeNameVar: profile.storeNameVar
        }
      );

      attempts.push({ attempt: 1, seoResult: currentSeoResult, lint: currentLint });
    }

    // Attempts 2-3: repair if blockers exist
    for (let attempt = 2; attempt <= 3; attempt++) {
      const prev = attempts[attempts.length - 1];
      if (!prev) break;
      if (prev.lint.ok) break;

      const violations = [...(prev.lint.blockers || []), ...(prev.lint.warnings || [])];

      currentSeoResult = await repairSeoModel({
        normalizedPayload: seoInput,
        correlationId: (ingestion as any).correlation_id || null,
        sourceUrl: (ingestion as any).source_url || null,
        tenantId: (ingestion as any).tenant_id || null,
        attempt,
        previousOutput: currentSeoResult,
        violations,
      });

      const storePayload = mapSeoResultToStore(currentSeoResult);
      
      // Pass profile configuration to linter for repair attempts too
      const currentLint = lintSeoOutput(
        {
          instructionsText: profile.compiledPrompt ?? null,
          seo_payload: storePayload,
          description_html: String(currentSeoResult?.descriptionHtml ?? ""),
          features: Array.isArray(currentSeoResult?.features) ? currentSeoResult.features : [],
          normalized_payload: seoInput,
        },
        profile.compiledPrompt,
        {
          h1Length: profile.h1Length,
          internalLinks: profile.internalLinks,
          manualsSection: profile.manualsSection,
          metaTitleSuffix: profile.metaTitleSuffix,
          storeNameVar: profile.storeNameVar
        }
      );

      attempts.push({ attempt, seoResult: currentSeoResult, lint: currentLint });

      if (currentLint.ok) break;
    }

    const endedAt = Date.now();
    const lastAttempt = attempts[attempts.length - 1];
    const finalLint = lastAttempt?.lint;

    const enrichedResult = {
      ...currentSeoResult,
      _meta: {
        ...(currentSeoResult?._meta ?? {}),
        ...seoMeta,
        ended_at: new Date(endedAt).toISOString(),
        duration_ms: endedAt - startedAt,
        total_attempts: attempts.length,
        final_lint: finalLint,
        all_attempts: attempts.map((a) => ({
          attempt: a.attempt,
          lint_ok: a.lint.ok,
          blockers: a.lint.blockers?.length ?? 0,
          warnings: a.lint.warnings?.length ?? 0,
          checks: a.lint.checks?.length ?? 0,
        })),
      },
    };

    console.info(
      `[runSeoForIngestion] Completed ${attempts.length} attempts, final lint.ok=${finalLint?.ok} for ingestion ${ingestion.id}`
    );

    await supabaseServiceRole
      .from("ingestions")
      .update({
        status: "seo_complete",
        seo_result: enrichedResult,
        seo_attempts: attempts.map((a) => a.seoResult),
      })
      .eq("id", ingestion.id)
      .throwOnError();

    // Create the background job for persistent storage
    await createSeoIngestionJob(seoIngestionId, ingestion.id, enrichedResult);

    return { ok: true, result: enrichedResult };
  } catch (err: any) {
    console.error("[runSeoForIngestion] Error:", err);

    try {
      await supabaseServiceRole
        .from("ingestions")
        .update({
          status: "seo_failed",
          seo_result: { error: String(err?.message || err) },
        })
        .eq("id", ingestion.id)
        .throwOnError();
    } catch (updateErr) {
      console.error("[runSeoForIngestion] Failed to update ingestion with error status:", updateErr);
    }

    return { ok: false, result: String(err?.message || err) };
  }
}
