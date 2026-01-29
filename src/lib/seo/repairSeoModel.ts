import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";
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
  const { text: instructions } = await loadCustomGptInstructionsWithInfo(params.tenantId ?? null);
  if (!instructions || !instructions.trim()) {
    // If instructions are missing, we cannot repair safely—fallback to prior output (non-blocking policy).
    return params.previousOutput;
  }

  const repairContext = {
    mode: "repair",
    attempt: params.attempt,
    violations: params.violations,
    previous_output: params.previousOutput,
    rules: [
      "Fix ALL blocker violations. Reduce warnings where possible without inventing facts.",
      "Use ONLY packet fields as grounding. Do NOT invent specs, warranty, capacity, dimensions, packaging, etc.",
      "Allowed placeholders: NA / N/A and any 'Not Applicable' variants (including punctuation and parentheses).",
      "Blocked placeholders include: OK, TBD, To Be Determined, Unknown, Not Provided, Not Available, etc.",
      "H1 must be 90–110 chars and must NOT include multiple packaging references (allow at most one like '100 gloves/box').",
      "Ensure required sections exist and appear in the correct order; ensure FAQs have 5–7 Q&A pairs.",
      "Exactly 2 internal links are required in the HTML.",
      "Return the full JSON output matching the schema (not a patch).",
    ],
  };

  const enrichedPayload = {
    ...(params.normalizedPayload ?? {}),
    __repair_context: repairContext,
  };

  return callSeoModel(
    enrichedPayload,
    params.correlationId ?? null,
    params.sourceUrl ?? null,
    params.tenantId ?? null
  );
}
