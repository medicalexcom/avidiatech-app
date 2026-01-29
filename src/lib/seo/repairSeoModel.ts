import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";
import { requireField } from "@/lib/utils/requireField"; // adjust import to your actual requireField location
import { isNonEmptyString } from "@/lib/utils/strings"; // adjust to your actual helper
import { callSeoModel } from "@/lib/seo/callSeoModel";

/**
 * Repair strategy:
 * - Same model as SEO generation (reuse callSeoModel)
 * - Feed previous output + violations and ask the model to regenerate a corrected output
 *
 * NOTE: This implementation assumes you can add optional fields to callSeoModel's prompt-building,
 * or you can implement a second model call path internally. If you cannot easily modify callSeoModel,
 * you can instead create a "callSeoRepairModel" that shares the same lower-level OpenAI call.
 */
export async function repairSeoModel(params: {
  normalizedPayload: any;
  correlationId?: string | null;
  sourceUrl?: string | null;
  tenantId?: string | null;

  attempt: number; // 2 or 3
  previousOutput: any;
  violations: any[]; // from linter (blockers + warnings)
}): Promise<any> {
  const { text: instructions } = await loadCustomGptInstructionsWithInfo(params.tenantId ?? null);
  requireField(isNonEmptyString(instructions), "seo_missing_custom_instructions: custom_gpt_instructions are required");

  /**
   * Minimal approach without refactoring callSeoModel internals:
   * - We attach "repair context" into the normalizedPayload as additional fields
   * - Then instruct model via existing custom instructions + packet
   *
   * Better approach (recommended): extend callSeoModel to accept a "repairContext" and insert it in the user prompt.
   */
  const repairContext = {
    mode: "repair",
    attempt: params.attempt,
    violations: params.violations,
    previous_output: params.previousOutput,
    rules: [
      "Fix ALL blocker violations. Reduce warnings where possible without inventing facts.",
      "Do NOT add ungrounded facts. Use ONLY packet fields as grounding.",
      "NA/N/A is allowed; all other placeholder words must be removed from customer-facing copy.",
      "H1 must be 90–110 chars and MUST NOT include multiple packaging references (allow at most one, e.g., '100 gloves/box' only).",
      "Do not skip required sections; ensure required sections exist and are in the correct order.",
      "Exactly 2 internal links are required in the HTML.",
      "Return the full JSON output matching the schema, not a patch.",
    ],
  };

  const enrichedPayload = {
    ...(params.normalizedPayload ?? {}),
    __repair_context: repairContext,
  };

  // For now, reuse callSeoModel; you will need to ensure callSeoModel includes packet fields verbatim,
  // so __repair_context reaches the model in the ground truth packet.
  return callSeoModel(
    enrichedPayload,
    params.correlationId ?? null,
    params.sourceUrl ?? null,
    params.tenantId ?? null
  );
}
