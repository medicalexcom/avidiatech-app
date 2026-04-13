/**
 * loadInstructions.ts
 *
 * REQUIRED POLICY (per repo requirement):
 * - The ONLY instruction source is the local canonical file:
 *     tools/render-engine/prompts/custom_gpt_instructions.md
 * - No tenant overrides
 * - No GitHub raw fetch fallbacks
 * - Fail hard if missing/empty (callers must not proceed without instructions)
 *
 * Exports:
 * - loadCustomGptInstructions(tenantId?) -> Promise<string>  (backwards-compatible, but now throws on missing)
 * - loadCustomGptInstructionsWithInfo(tenantId?) -> Promise<{ text: string, source: "local" }>
 */

import path from "path";
import fs from "fs/promises";

type InstrSource = "local";

let cached: { value: string; fetchedAt: number; source: InstrSource } | null = null;

const DEFAULT_TTL = parseInt(process.env.RENDER_PROMPTS_TTL_SECONDS || "600", 10);
const CANONICAL_PATH = path.join(
  process.cwd(),
  "tools",
  "render-engine",
  "prompts",
  "custom_gpt_instructions.md"
);

async function readCanonicalInstructions(): Promise<string> {
  const stat = await fs.stat(CANONICAL_PATH).catch(() => null);
  if (!stat || !stat.isFile()) {
    throw new Error(`custom_gpt_instructions_missing_or_empty: missing ${CANONICAL_PATH}`);
  }

  const txt = await fs.readFile(CANONICAL_PATH, { encoding: "utf8" });
  if (!txt || txt.trim().length === 0) {
    throw new Error(`custom_gpt_instructions_missing_or_empty: empty ${CANONICAL_PATH}`);
  }

  // eslint-disable-next-line no-console
  console.info("loadInstructions: loaded local prompt from", CANONICAL_PATH);
  return txt;
}

/**
 * Returns text only.
 * NOTE: this now THROWS if missing/empty to enforce strict compliance.
 */
export default async function loadCustomGptInstructions(_tenantId?: string | null): Promise<string> {
  const info = await loadCustomGptInstructionsWithInfo(_tenantId);
  return info.text;
}

/**
 * Return text and source info.
 */
export async function loadCustomGptInstructionsWithInfo(_tenantId?: string | null): Promise<{ text: string; source: InstrSource }> {
  const now = Date.now();
  if (cached && (now - cached.fetchedAt) / 1000 < DEFAULT_TTL) {
    return { text: cached.value, source: "local" };
  }

  const txt = await readCanonicalInstructions();
  cached = { value: txt, fetchedAt: Date.now(), source: "local" };
  return { text: txt, source: "local" };
}

export function clearLoadInstructionsCache() {
  cached = null;
}
