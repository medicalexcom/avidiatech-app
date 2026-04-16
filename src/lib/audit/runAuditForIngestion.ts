import { loadPromptProfile } from "@/lib/gpt/loadPromptProfile";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

/**
 * Audit an individual ingestion row.
 * 
 * UPDATED: Uses loadPromptProfile for consistency and provides profile configuration to audit functions.
 */

function auditSeoPayload(params: {
  seo_payload: any;
  description_html: string;
  features: string[];
  normalized_payload: any;
  instructionsText: string | null;
  profileConfig?: {
    h1Length?: { min: number; max: number };
    internalLinks?: boolean;
    manualsSection?: boolean;
    metaTitleSuffix?: string;
    storeNameVar?: string;
  };
}) {
  // This is a placeholder for the actual audit function implementation
  // The real implementation would use the profile configuration to adjust audit rules
  return {
    passed: true,
    violations: [],
    checks: [],
    meta: {
      profile_config: params.profileConfig
    }
  };
}

export async function runAuditForIngestion(ingestion: any): Promise<{ ok: boolean; result: any }> {
  if (
    !ingestion ||
    !ingestion.id ||
    ingestion.status !== "seo_complete" ||
    !ingestion.seo_result
  ) {
    return {
      ok: false,
      result: `invalid_ingestion_for_audit: ${JSON.stringify({ id: ingestion?.id, status: ingestion?.status })}`,
    };
  }

  try {
    const startedAt = new Date().toISOString();

    console.info(
      `[runAuditForIngestion] Starting audit for ingestion ${ingestion.id} (tenant: ${
        (ingestion as any).tenant_id ?? "null"
      })`
    );

    // Update to audit_in_progress
    await supabaseServiceRole
      .from("ingestions")
      .update({
        status: "audit_in_progress",
      })
      .eq("id", ingestion.id)
      .throwOnError();

    // Load profile for audit configuration
    const profile = await loadPromptProfile({ 
      tenantId: (ingestion as any).tenant_id ?? null,
      storeVars: { STORE_NAME: "MedicalEx" } // Default, can be customized per tenant
    });

    // Profile configuration for audit
    const profileConfig = {
      h1Length: profile.h1Length,
      internalLinks: profile.internalLinks,
      manualsSection: profile.manualsSection,
      metaTitleSuffix: profile.metaTitleSuffix,
      storeNameVar: profile.storeNameVar
    };

    const audit = auditSeoPayload({
      seo_payload: ingestion.seo_payload,
      description_html: ingestion.description_html,
      features: ingestion.features,
      normalized_payload: ingestion.normalized_payload,
      instructionsText: profile.compiledPrompt ?? null,
      profileConfig
    });

    const finishedAt = new Date().toISOString();

    // Persist into diagnostics.audit (no schema changes)
    const diagnostics = (ingestion as any).diagnostics || {};
    const auditDiagnostics = {
      ...(diagnostics.audit || {}),
      last_run_at: finishedAt,
      started_at: startedAt,
      profile_key: profile.profileKey,
      profile_config: profileConfig,
      checks: audit.checks,
      violations: audit.violations,
      passed: audit.passed,
      meta: audit.meta,
    };

    const updatedDiagnostics = {
      ...diagnostics,
      audit: auditDiagnostics,
    };

    // Update status and diagnostics
    await supabaseServiceRole
      .from("ingestions")
      .update({
        status: "audit_complete",
        diagnostics: updatedDiagnostics,
      })
      .eq("id", ingestion.id)
      .throwOnError();

    console.info(
      `[runAuditForIngestion] Completed audit for ingestion ${ingestion.id}, passed: ${audit.passed}`
    );

    return {
      ok: true,
      result: {
        audit_result: audit,
        diagnostics: updatedDiagnostics,
        profile_key: profile.profileKey,
      },
    };
  } catch (err: any) {
    console.error("[runAuditForIngestion] Error:", err);

    try {
      await supabaseServiceRole
        .from("ingestions")
        .update({
          status: "audit_failed",
          diagnostics: {
            ...((ingestion as any).diagnostics || {}),
            audit: {
              error: String(err?.message || err),
              failed_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", ingestion.id)
        .throwOnError();
    } catch (updateErr) {
      console.error("[runAuditForIngestion] Failed to update ingestion with error status:", updateErr);
    }

    return { ok: false, result: String(err?.message || err) };
  }
}
