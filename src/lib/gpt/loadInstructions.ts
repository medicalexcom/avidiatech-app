import { getServiceSupabaseClient } from "@/lib/supabase";

const CANONICAL_RAW_URL =
  "https://raw.githubusercontent.com/medicalexcom/medx-ingest-api/34dd54c508824b84d2ad3cd21d782af219044718/tools/render-engine/prompts/custom_gpt_instructions.md";

// Simple in-memory cache to avoid repeated DB/fileserver fetches during a single server instance lifetime.
const cache: Record<string, any> = {
  // "tenant:<tenantId>": {...},
  // "canonical": {...}
};

export async function loadCustomGptInstructions(tenantId?: string) {
  // 1) tenant override (db)
  if (tenantId) {
    const key = `tenant:${tenantId}`;
    if (cache[key]) return cache[key];

    try {
      const sb = getServiceSupabaseClient();
      const { data, error } = await sb
        .from("tenant_gpt_instructions")
        .select("instructions")
        .eq("tenant_id", tenantId)
        .single();

      if (!error && data?.instructions) {
        cache[key] = data.instructions;
        return data.instructions;
      }
    } catch (e) {
      // non-fatal — fall through to canonical
      console.warn("loadCustomGptInstructions: tenant lookup failed", String(e));
    }
  }

  // 2) canonical fallback (raw file from medx repo)
  if (cache["canonical"]) return cache["canonical"];

  try {
    const res = await fetch(CANONICAL_RAW_URL, { method: "GET" });
    if (res.ok) {
      const md = await res.text();
      // Provide both raw markdown and quick parsed structure as minimal convenience.
      const instructions = { raw: md, system: md }; // consumer can parse or use as-is
      cache["canonical"] = instructions;
      return instructions;
    } else {
      console.warn("loadCustomGptInstructions: failed to fetch canonical prompt", res.status);
    }
  } catch (e) {
    console.warn("loadCustomGptInstructions: fetch error", String(e));
  }

  // 3) final fallback: minimal built-in instructions (avoid runtime crash)
  const fallback = {
    raw: "",
    system:
      "You are AvidiaSEO. Use only the provided structured product data to generate strict JSON according to the server contract.",
  };
  cache["canonical"] = fallback;
  return fallback;
}
