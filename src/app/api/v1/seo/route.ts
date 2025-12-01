import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// Use safeGetAuth to avoid Clerk middleware-detection warnings
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { postSeoUrlOnlySchema } from "@/lib/seo/validators";
import { loadCustomGptInstructionsWithInfo } from "@/lib/gpt/loadInstructions";
import { assembleSeoPrompt } from "@/lib/seo/assemblePrompt";
import { autoHeal } from "@/lib/seo/autoHeal";
import { callOpenaiChat } from "@/lib/openai";

const INGEST_ENGINE_URL = (process.env.INGEST_ENGINE_URL || "").replace(/\/+$/, "");
const INGEST_CACHE_MINUTES = parseInt(process.env.INGEST_CACHE_MINUTES || "1440", 10);

/* Helper: attempt to extract a JSON object from text (strip fences, extract {...} block) */
function extractJsonFromText(raw: string): any | null {
  if (!raw || typeof raw !== "string") return null;
  // strip markdown code fences with optional language
  let t = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  t = t.replace(/```(?:json)?/gi, "").replace(/```/g, "");
  // find first {...} block
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = t.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // fallthrough
    }
  }
  // try full cleaned text
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/* Heuristic: is the model output meaningful (non-empty) */
function isMeaningfulOutput(out: any) {
  if (!out || typeof out !== "object") return false;
  const desc = (out.description_html ?? "") + "";
  const h1 = (out.seo_payload?.h1 ?? "") + "";
  const title = (out.seo_payload?.title ?? "") + "";
  return (desc.trim().length > 30) || (h1.trim().length > 3) || (title.trim().length > 10) || (Array.isArray(out.features) && out.features.length > 0);
}

/* Lightweight HTML scraping fallback to extract title/meta/first h1/first p */
async function scrapePageFallback(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "AvidiaSeoFallback/1.0 (+https://avidiatech.com)" } });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    // naive extraction
    const getTag = (tag: string) => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
      const m = text.match(re);
      return m ? m[1].replace(/\s+/g, " ").trim() : "";
    };
    const getMeta = (name: string) => {
      const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i");
      const m = text.match(re);
      return m ? m[1].trim() : "";
    };
    const title = getTag("title") || getMeta("og:title") || "";
    const metaDesc = getMeta("description") || getMeta("og:description") || "";
    const h1 = getTag("h1") || "";
    const pRe = /<p[^>]*>([\s\S]*?)<\/p>/i;
    const pMatch = text.match(pRe);
    const firstP = pMatch ? pMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";
    return { title, metaDesc, h1, firstP, raw: text.slice(0, 30_000) };
  } catch (e) {
    console.warn("scrapePageFallback failed:", String(e));
    return null;
  }
}

/* Build deterministic fallback SEO from a small payload */
function fallbackFromExtracted(ex: any, url: string) {
  const brandTitle = ex.title || ex.h1 || url.replace(/^https?:\/\//, "").split("/")[0];
  const descText = ex.firstP || ex.metaDesc || (ex.raw ? ex.raw.slice(0, 300).replace(/\s+/g, " ") : "Product overview");
  const meta = (ex.metaDesc || descText).slice(0, 160);
  const seoPayload = {
    h1: ex.h1 || brandTitle,
    title: brandTitle.length > 65 ? brandTitle.slice(0, 62) + "..." : brandTitle,
    metaDescription: meta,
  };
  const description_html = `<p>${escapeHtml(descText)}</p>`;
  return { description_html, seo_payload: seoPayload, features: [] };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Repair prompt helper */
function makeRepairUserPrompt(previousRaw: string, extractDataPreview: any) {
  return `The model returned invalid or empty JSON previously. Previous output (verbatim):
---
${previousRaw}
---

Using ONLY the provided extractData (below), return STRICTLY a single JSON object with these keys:
- description_html: string (full HTML description)
- seo_payload: object { h1: string, title: string, metaDescription: string }
- features: array of short strings (may be empty)

If a field cannot be grounded from the provided extractData, return an empty string "" or empty array [] (do not invent facts). Provide no commentary, no markdown, no fences. ExtractData:
${JSON.stringify(extractDataPreview ?? {}, null, 2)}`;
}

export async function POST(req: NextRequest) {
  try {
    // Use safeGetAuth inside handler (avoids Clerk middleware-detection warnings)
    const { userId, orgId } = (safeGetAuth(req as any) as any) ?? {};
    // Parse body early so we can support unauthenticated preview requests
    const body = await req.json().catch(() => ({}));
    const parsed = postSeoUrlOnlySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "SEO_INVALID_URL", detail: parsed.error.flatten() } }, { status: 400 });
    }
    const { url, persist } = parsed.data as { url: string; persist?: boolean };

    let tenantId: string | null = orgId ?? null;
    let sbForProfile: any = null;
    if (!tenantId && userId) {
      try {
        sbForProfile = getServiceSupabaseClient();
        const { data: profileData, error: profileError } = await sbForProfile
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", userId)
          .limit(1)
          .single();
        if (!profileError && profileData?.tenant_id) {
          tenantId = profileData.tenant_id;
        }
      } catch (e) {
        console.warn("profile lookup failed while resolving tenantId:", String(e));
      }
    }

    const wantsPersist = !!persist;
    if (wantsPersist && !tenantId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED_TO_PERSIST", message: "Authentication or tenant required to persist SEO output" } }, { status: 401 });
    }

    const sb = tenantId ? (sbForProfile ?? getServiceSupabaseClient()) : null;

    // Obtain ingestion (either tenant-backed upsert OR preview via ingest engine)
    let ingestion: any = null;
    if (sb || INGEST_ENGINE_URL) {
      // call helper that lives elsewhere in your codebase - kept as-is
      // NOTE: if you copied this file, ensure upsertIngestionForUrlIfTenant is available
      // For brevity in this snippet we attempt a light call to your ingest endpoint
      try {
        if (INGEST_ENGINE_URL) {
          const res = await fetch(`${INGEST_ENGINE_URL}/ingest?url=${encodeURIComponent(url)}`);
          if (res.ok) {
            ingestion = await res.json().catch(() => null);
          }
        }
      } catch (e) {
        // continue
      }
    }

    // If ingestion missing, we'll attempt to scrape the page directly as a fallback preview source
    let extractDataForPrompt: any = ingestion?.normalized_payload ?? null;
    if (!extractDataForPrompt) {
      const scraped = await scrapePageFallback(url);
      if (scraped) {
        extractDataForPrompt = {
          title: scraped.title,
          metaDescription: scraped.metaDesc,
          name: scraped.h1 || scraped.title,
          description_raw: scraped.firstP,
          browsed_text: scraped.raw ? scraped.raw.slice(0, 30_000) : undefined,
          source: url
        };
      } else {
        extractDataForPrompt = null;
      }
    }

    // Load tenant/canonical instructions with source info
    let instructionsInfo = { text: null as string | null, source: "none" as any };
    try {
      instructionsInfo = await loadCustomGptInstructionsWithInfo(tenantId ?? null);
    } catch (insErr) {
      console.warn("loadCustomGptInstructionsWithInfo failed:", String(insErr));
      instructionsInfo = { text: null, source: "none" };
    }
    const instructions = instructionsInfo.text;

    const strictJsonFallback = `
You are AvidiaSEO, an automated SEO content generator. MUST FOLLOW THESE RULES:
1) Return VALID JSON ONLY as the entire response body. No commentary, no markdown, no surrounding text.
2) JSON OBJECT MUST contain exactly these top-level keys:
   - description_html: string (full HTML description)
   - seo_payload: object with keys { h1: string, title: string, metaDescription: string }
   - features: array (can be empty)
3) If a field cannot be produced from the provided input, return an empty string "" or an empty array [].
4) Use ONLY the provided extractData and manufacturerText. Do NOT invent facts.
5) DO NOT COPY OR REUSE ANY SAMPLE VALUES — placeholders are templates only.
`.trim();

    const finalInstructions = instructions ? `${instructions}\n\n${strictJsonFallback}` : strictJsonFallback;

    // Assemble prompt
    const { system, user } = assembleSeoPrompt({
      instructions: finalInstructions,
      extractData: extractDataForPrompt ?? {},
      manufacturerText: extractDataForPrompt?.manufacturer_text ?? ""
    });

    const strictSystem = `${system || "You are AvidiaSEO."}

IMPORTANT: Return ONLY a VALID JSON object with keys: description_html, seo_payload, features.
Do NOT reuse placeholder example text; placeholders in examples are templates only.
Use ONLY the provided extractData and manufacturerText. Do NOT invent facts.
If you cannot produce a field from the input, return an empty string or empty array.`;

    // First model call
    const model = process.env.OPENAI_SEO_MODEL || "gpt-4o";
    const initialCompletion = await callOpenaiChat({
      model,
      messages: [
        { role: "system", content: strictSystem },
        { role: "user", content: JSON.stringify(user) }
      ],
      temperature: 0.0,
      max_tokens: 1400
    });

    const raw = initialCompletion?.choices?.[0]?.message?.content ?? "";
    let out: any = null;
    try {
      out = raw ? JSON.parse(raw) : null;
    } catch {
      out = extractJsonFromText(raw);
    }

    // If output not meaningful, attempt a single repair retry with explicit REPAIR prompt
    if (!isMeaningfulOutput(out)) {
      try {
        const repairPrompt = makeRepairUserPrompt(raw, extractDataForPrompt);
        const repairCompletion = await callOpenaiChat({
          model,
          messages: [
            { role: "system", content: strictSystem },
            { role: "user", content: repairPrompt }
          ],
          temperature: 0.0,
          max_tokens: 1400
        });
        const repairRaw = repairCompletion?.choices?.[0]?.message?.content ?? "";
        let reparsed: any = null;
        try {
          reparsed = repairRaw ? JSON.parse(repairRaw) : null;
        } catch {
          reparsed = extractJsonFromText(repairRaw);
        }
        if (isMeaningfulOutput(reparsed)) {
          out = reparsed;
        } else {
          out = reparsed ?? out;
        }
      } catch (e) {
        console.warn("repair attempt failed:", String(e));
      }
    }

    // If still empty or not meaningful -> deterministic fallback from scraped data (if available)
    if (!isMeaningfulOutput(out)) {
      if (extractDataForPrompt) {
        const scraped = extractDataForPrompt;
        const fallback = fallbackFromExtracted({
          title: scraped.title,
          metaDesc: scraped.metaDescription || scraped.metaDesc,
          h1: scraped.name || scraped.h1,
          firstP: scraped.description_raw || scraped.firstP,
          raw: scraped.browsed_text || scraped.raw
        }, url);
        out = {
          description_html: fallback.description_html,
          seo_payload: fallback.seo_payload,
          features: fallback.features
        };
      } else {
        out = {
          description_html: "<p>Product overview</p>",
          seo_payload: { h1: "", title: "", metaDescription: "" },
          features: []
        };
      }
    }

    const descriptionHtml = out.description_html ?? "";
    const seoPayload = out.seo_payload ?? { h1: "", title: "", metaDescription: "" };
    const features = Array.isArray(out.features) ? out.features : [];

    // Auto-heal the output
    const healed = autoHeal(descriptionHtml, seoPayload, features, { strict: true });

    // Persist seo_outputs if tenant-backed and requested
    let inserted: any = null;
    if (tenantId) {
      const insertBody: any = {
        tenant_id: tenantId,
        ingestion_id: ingestion?.id ?? null,
        input_snapshot: { url, normalized_snapshot_keys: Object.keys(ingestion?.normalized_payload ?? {}) },
        description_html: healed.html,
        seo_payload: healed.seo,
        features: healed.features,
        autoheal_log: healed.log,
        model_info: { model }
      };

      const { data: insData, error: insErr } = await sb.from("seo_outputs").insert(insertBody).select("*").single().catch((e: any) => ({ data: null, error: e }));
      if (insErr) {
        console.error("Failed to persist seo_outputs:", insErr);
        return NextResponse.json({ error: { code: "SEO_DB_ERROR", message: insErr.message || String(insErr) } }, { status: 500 });
      }
      inserted = insData;
    }

    const responseBody: any = {
      seoId: inserted?.id ?? null,
      tenantId: tenantId,
      ingestionId: ingestion?.id ?? null,
      url,
      descriptionHtml: inserted?.description_html ?? healed.html,
      seoPayload: inserted?.seo_payload ?? healed.seo,
      features: inserted?.features ?? healed.features,
      autohealLog: inserted?.autoheal_log ?? healed.log,
      createdAt: inserted?.created_at ?? new Date().toISOString()
    };

    // Debug information when enabled
    const seoDebug = process.env.SEO_DEBUG === "true" || process.env.SEO_DEBUG === "1";
    if (seoDebug) {
      responseBody._debug = {
        rawModelOutput: raw,
        parsedModelOutput: out,
        ingestion_normalized_payload: ingestion?.normalized_payload ?? null,
        instructionsSource: instructionsInfo.source,
        instructionsPreview: instructionsInfo.text ? (instructionsInfo.text.slice(0, 1000)) : null
      };
    }

    return NextResponse.json(responseBody, { status: 200 });

  } catch (e: any) {
    console.error("POST /api/v1/seo error", e);
    return NextResponse.json({ error: { code: "SEO_MODEL_ERROR", message: String(e?.message || e) } }, { status: 500 });
  }
}
