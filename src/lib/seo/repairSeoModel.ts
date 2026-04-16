import { loadPromptProfile } from "@/lib/gpt/loadPromptProfile";
import { callSeoModel } from "@/lib/seo/callSeoModel";

/**
 * Repair strategy (Option B):
 * - Use SAME model as SEO generation (re-use callSeoModel).
 * - Provide previous output + violations to drive targeted correction.
 * - Up to 2 repair attempts (total attempts = 3 including initial).
 *
 * NOTE:
 * This implementation injects __repair_context into the "packet" by adding it to the normalized payload object.
 * If callSeoModel constructs a packet that ignores unknown fields, you should instead modify callSeoModel to
 * explicitly include the repair context in its "system" or "user" prompt.
 *
 * UPDATED: Uses loadPromptProfile instead of loadCustomGptInstructionsWithInfo for consistency.
 */
export async function repairSeoModel(params: {
  normalizedPayload: any;
  correlationId?: string | null;
  sourceUrl?: string | null;
  tenantId?: string | null;

  attempt: number; // 2 or 3
  previousOutput: any;
  violations: any[]; // blockers + warnings (objects)
}): Promise<any> {
  // Use profile system for consistency with SEO generation
  const profile = await loadPromptProfile({ 
    tenantId: params.tenantId ?? null,
    storeVars: { STORE_NAME: "MedicalEx" } // Default, can be customized per tenant
  });
  
  if (!profile.compiledPrompt || !profile.compiledPrompt.trim()) {
    // If instructions are missing, we cannot repair safely—fallback to prior output (non-blocking policy).
    return params.previousOutput;
  }

  const repairContext = {
    mode: "repair",
    attempt: params.attempt,
    violations: params.violations,
    previous_output: params.previousOutput,
    profile_config: {
      h1_length: profile.h1Length,
      meta_title_suffix: profile.metaTitleSuffix,
      internal_links_required: profile.internalLinks,
      manuals_section_required: profile.manualsSection
    },
    rules: [
      "Fix ALL blocker violations. Reduce warnings where possible without inventing facts.",
      "Use ONLY packet fields as grounding. Do NOT invent specs, warranty, capacity, dimensions, packaging, etc.",
      "Allowed placeholders: NA / N/A and any 'Not Applicable' variants (including punctuation and parentheses).",
      "Blocked placeholders include: OK, TBD, To Be Determined, Unknown, Not Provided, Not Available, etc.",
      `H1 must be ${profile.h1Length.min}–${profile.h1Length.max} chars and must NOT include multiple packaging references (allow at most one like '100 gloves/box').`,
      "Ensure required sections exist and appear in the correct order; ensure FAQs have 5–7 Q&A pairs.",
      profile.internalLinks ? "Exactly 2 internal links are required in the HTML." : "Internal links may be omitted for this profile.",
      "Return the full JSON output matching the schema (not a patch).",
    ],
  };

  const enrichedPayload = {
    ...(params.normalizedPayload ?? {}),
    __repair_context: repairContext,
  };

  return callSeoModel(
    enrichedPayload,
    params.sourceUrl ?? null,
    params.tenantId ?? null,
    params.correlationId ?? null
  );
}
