import { getServiceSupabaseClient } from "@/lib/supabase";
import { callSeoModel } from "@/lib/seo/callSeoModel";
import { repairSeoModel } from "@/lib/seo/repairSeoModel";
import { lintSeoOutput } from "@/lib/audit/seoComplianceLinter";
import { loadPromptProfile } from "@/lib/gpt/loadPromptProfile";
import { mapSeoResultToStore } from "@/lib/seo/compatSeoMapping";

type AnyObj = Record<string, any>;

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

function mapIngestionFieldToSeoInput(ingestion: AnyObj) {
  const raw = ingestion?.normalized_payload || {};
  const out: AnyObj = { ...DEFAULT_MAPPINGS };

  for (const [key, value] of Object.entries(raw)) {
    if (
      value !== null &&
      value !== undefined &&
      Object.prototype.hasOwnProperty.call(out, key)
    ) {
      out[key] = value;
    }
  }

  if (!out.name_raw && typeof raw?.name === "string") out.name_raw = raw.name;
  if (!out.name && typeof raw?.name === "string") out.name = raw.name;
  if (!out.source_url && typeof ingestion?.source_url === "string") {
    out.source_url = ingestion.source_url;
  }

  return out;
}

function chooseBestAttempt(
  attempts: Array<{
    attempt: number;
    seoResult: any;
    lint: ReturnType<typeof lintSeoOutput>;
  }>
) {
  return attempts
    .slice()
    .sort((a, b) => {
      const aOk = a.lint.ok ? 1 : 0;
      const bOk = b.lint.ok ? 1 : 0;
      if (aOk !== bOk) return bOk - aOk;

      const aBlockers = (a.lint.blockers || []).length;
      const bBlockers = (b.lint.blockers || []).length;
      if (aBlockers !== bBlockers) return aBlockers - bBlockers;

      const aWarnings = (a.lint.warnings || []).length;
      const bWarnings = (b.lint.warnings || []).length;
      return aWarnings - bWarnings;
    })[0];
}

async function loadIngestionById(ingestionId: string) {
  const supabase = getServiceSupabaseClient();

  const { data, error } = await supabase
    .from("ingestions")
    .select("*")
    .eq("id", ingestionId)
    .maybeSingle();

  if (error) {
    throw new Error(`ingestion_load_failed: ${error.message || String(error)}`);
  }

  if (!data) {
    throw new Error("ingestion_not_found");
  }

  return data;
}

async function persistSeoResult(
  ingestionId: string,
  enrichedResult: any,
  attempts: any[],
  bestLint: ReturnType<typeof lintSeoOutput>
) {
  const supabase = getServiceSupabaseClient();
  const now = new Date().toISOString();

  const fullPayload = {
    status: "seo_complete",
    seo_result: enrichedResult,
    seo_payload: mapSeoResultToStore(enrichedResult),
    description_html: enrichedResult.descriptionHtml,
    features: enrichedResult.features ?? [],
    seo_attempts: attempts.map((a) => a.seoResult),
    seo_generated_at: now,
    updated_at: now,
  };

  const fullUpdate = await supabase
    .from("ingestions")
    .update(fullPayload)
    .eq("id", ingestionId);

  if (!fullUpdate.error) {
    return;
  }

  const fallbackPayload = {
    status: "seo_complete",
    seo_result: enrichedResult,
    seo_attempts: attempts.map((a) => a.seoResult),
    updated_at: now,
  };

  const fallbackUpdate = await supabase
    .from("ingestions")
    .update(fallbackPayload)
    .eq("id", ingestionId);

  if (fallbackUpdate.error) {
    throw new Error(
      `seo_persist_failed: ${
        fallbackUpdate.error.message || fullUpdate.error.message || "unknown"
      }`
    );
  }

  console.warn("[runSeoForIngestion] Fallback persistence used", {
    ingestionId,
    blockers: bestLint.blockers?.length ?? 0,
    warnings: bestLint.warnings?.length ?? 0,
  });
}

export async function runSeoForIngestion(
  ingestionOrId: string | AnyObj,
  opts?: { brandOverride?: string | null }
): Promise<{
  ingestionId: string;
  descriptionHtml: string;
  sections: Record<string, any>;
  seo: any;
  features: string[];
  data_gaps: string[];
  desc_audit: any;
  _meta?: any;
  seo_payload: any;
  description_html: string;
}> {
  const ingestion =
    typeof ingestionOrId === "string"
      ? await loadIngestionById(ingestionOrId)
      : ingestionOrId;

  if (!ingestion || !ingestion.id) {
    throw new Error("ingestion_not_found");
  }

  if (!ingestion.normalized_payload) {
    throw new Error("missing_required_ingestion_payload");
  }

  const startedAt = new Date().toISOString();
  const supabase = getServiceSupabaseClient();

  const markGenerating = await supabase
    .from("ingestions")
    .update({
      status: "generating_seo",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ingestion.id);

  if (markGenerating.error) {
    console.warn("[runSeoForIngestion] Failed to mark generating_seo", {
      ingestionId: ingestion.id,
      error: markGenerating.error.message,
    });
  }

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

  const brandOverride =
    typeof opts?.brandOverride === "string" && opts.brandOverride.trim()
      ? opts.brandOverride.trim()
      : null;

  if (brandOverride) {
    seoInput.__brand_override = brandOverride;
    if (!seoInput.brand) seoInput.brand = brandOverride;
  }

  const profile = await loadPromptProfile({
    tenantId: ingestion.tenant_id ?? null,
    storeVars: { STORE_NAME: "MedicalEx" },
  });

  const attempts: Array<{
    attempt: number;
    seoResult: any;
    lint: ReturnType<typeof lintSeoOutput>;
  }> = [];

  let currentSeoResult = await callSeoModel(
    seoInput as any,
    ingestion.source_url || seoInput.source_url || null,
    ingestion.tenant_id || null,
    ingestion.correlation_id || null
  );

  {
    const storePayload = mapSeoResultToStore(currentSeoResult);
    const currentLint = lintSeoOutput(
      {
        instructionsText: profile.compiledPrompt ?? null,
        seo_payload: storePayload,
        description_html: String(currentSeoResult?.descriptionHtml ?? ""),
        features: Array.isArray(currentSeoResult?.features)
          ? currentSeoResult.features
          : [],
        normalized_payload: seoInput,
      },
      profile.compiledPrompt,
      {
        h1Length: profile.h1Length,
        internalLinks: profile.internalLinks,
        manualsSection: profile.manualsSection,
        metaTitleSuffix: profile.metaTitleSuffix,
        storeNameVar: profile.storeNameVar,
      }
    );

    attempts.push({
      attempt: 1,
      seoResult: currentSeoResult,
      lint: currentLint,
    });
  }

  for (let attempt = 2; attempt <= 3; attempt++) {
    const prev = attempts[attempts.length - 1];
    if (!prev || prev.lint.ok) break;

    const violations = [...(prev.lint.blockers || []), ...(prev.lint.warnings || [])];

    currentSeoResult = await repairSeoModel({
      normalizedPayload: seoInput,
      correlationId: ingestion.correlation_id || null,
      sourceUrl: ingestion.source_url || seoInput.source_url || null,
      tenantId: ingestion.tenant_id || null,
      attempt,
      previousOutput: currentSeoResult,
      violations,
    });

    const storePayload = mapSeoResultToStore(currentSeoResult);
    const currentLint = lintSeoOutput(
      {
        instructionsText: profile.compiledPrompt ?? null,
        seo_payload: storePayload,
        description_html: String(currentSeoResult?.descriptionHtml ?? ""),
        features: Array.isArray(currentSeoResult?.features)
          ? currentSeoResult.features
          : [],
        normalized_payload: seoInput,
      },
      profile.compiledPrompt,
      {
        h1Length: profile.h1Length,
        internalLinks: profile.internalLinks,
        manualsSection: profile.manualsSection,
        metaTitleSuffix: profile.metaTitleSuffix,
        storeNameVar: profile.storeNameVar,
      }
    );

    attempts.push({
      attempt,
      seoResult: currentSeoResult,
      lint: currentLint,
    });
  }

  const best = chooseBestAttempt(attempts);
  const seoResult = best.seoResult;
  const finishedAt = new Date().toISOString();

  const enrichedResult = {
    ...seoResult,
    _meta: {
      ...(seoResult?._meta ?? {}),
      ingestion_id: ingestion.id,
      started_at: startedAt,
      ended_at: finishedAt,
      tenant_id: ingestion.tenant_id ?? null,
      profile_key: profile.profileKey,
      profile_config: {
        h1_length: profile.h1Length,
        meta_title_suffix: profile.metaTitleSuffix,
        internal_links: profile.internalLinks,
        manuals_section: profile.manualsSection,
      },
      total_attempts: attempts.length,
      best_attempt: best.attempt,
      final_lint: best.lint,
      all_attempts: attempts.map((a) => ({
        attempt: a.attempt,
        lint_ok: a.lint.ok,
        blockers: a.lint.blockers?.length ?? 0,
        warnings: a.lint.warnings?.length ?? 0,
      })),
      brandOverride,
    },
  };

  await persistSeoResult(ingestion.id, enrichedResult, attempts, best.lint);

  return {
    ingestionId: ingestion.id,
    descriptionHtml: enrichedResult.descriptionHtml,
    sections: enrichedResult.sections ?? {},
    seo: enrichedResult.seo ?? {},
    features: Array.isArray(enrichedResult.features) ? enrichedResult.features : [],
    data_gaps: Array.isArray(enrichedResult.data_gaps) ? enrichedResult.data_gaps : [],
    desc_audit: enrichedResult.desc_audit ?? null,
    _meta: enrichedResult._meta ?? null,
    seo_payload: mapSeoResultToStore(enrichedResult),
    description_html: enrichedResult.descriptionHtml,
  };
}
