import crypto from "crypto";

export type ViolationSeverity = "blocker" | "warning";

export type ComplianceViolation = {
  severity: ViolationSeverity;
  code: string;
  message: string;
  field?: string;
  snippet?: string;
  evidence?: Record<string, any>;
};

export type ComplianceCheck = {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail?: string;
};

export type LintResult = {
  ok: boolean; // no blockers
  blockers: ComplianceViolation[];
  warnings: ComplianceViolation[];
  checks: ComplianceCheck[];
  meta: {
    instructions_sha256: string | null;
    profile_key?: string;
    linter_key?: string;
  };
};

export interface ProfileLinterConfig {
  h1Length?: { min: number; max: number };
  internalLinks?: boolean;
  manualsSection?: boolean;
  metaTitleSuffix?: string;
  storeNameVar?: string;
}

function sha256(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function safeSnippet(s: string, max = 260): string {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&");
}

/** Basic HTML entity decoding (limited, deterministic) */
function decodeHtmlEntities(s: string): string {
  if (!s) return "";
  const replacements: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
  };
  let out = s;
  for (const [k, v] of Object.entries(replacements)) out = out.replace(new RegExp(k, "gi"), v);
  out = out.replace(/&#(\\d+);/g, (_m, code) => {
    try {
      const num = parseInt(code, 10);
      if (num >= 32 && num <= 126) return String.fromCharCode(num);
    } catch {
      // ignore
    }
    return "";
  });
  return out;
}

function stripHtml(html: string): string {
  if (!html) return "";
  const decoded = decodeHtmlEntities(html);
  return decoded.replace(/<[^>]*>/g, "").replace(/\\s+/g, " ").trim();
}

function normalizeForComparison(text: string): string {
  return stripHtml(text).toLowerCase().replace(/[^a-z0-9\\s]/g, " ").replace(/\\s+/g, " ").trim();
}

type SectionKey = "overview" | "hook" | "mainDescription" | "featuresBenefits" | "specifications" | "internalLinks" | "whyChoose" | "manuals" | "faqs";

function getSectionFromHtml(html: string, sectionKey: SectionKey): string | null {
  if (!html) return null;
  
  const patterns: Record<SectionKey, string[]> = {
    overview: ["<p[^>]*>([^<]+)</p>"],
    hook: ["<p[^>]*>([^<]+)</p>"],
    mainDescription: ["<h2[^>]*>[^<]*</h2>\\\\s*<p[^>]*>([^<]+)</p>"],
    featuresBenefits: ["<h2[^>]*>Features and Benefits</h2>([\\\\s\\\\S]*?)(?=<h2|$)"],
    specifications: ["<h2[^>]*>Product Specifications</h2>([\\\\s\\\\S]*?)(?=<h2|$)"],
    internalLinks: ["class=[\"']explore-links[\"'][^>]*>([^<]*)</"],
    whyChoose: ["<h2[^>]*>(?:Why Choose|[^<]*Benefits?)[^<]*</h2>([\\\\s\\\\S]*?)(?=<h2|$)"],
    manuals: ["<h2[^>]*>Manuals and Troubleshooting Guides</h2>([\\\\s\\\\S]*?)(?=<h2|$)"],
    faqs: ["<h2[^>]*>Frequently Asked Questions</h2>([\\\\s\\\\S]*?)(?=<h2|$)"]
  };

  for (const pattern of patterns[sectionKey] || []) {
    const match = html.match(new RegExp(pattern, "i"));
    if (match) return match[1]?.trim() || null;
  }
  
  return null;
}

/**
 * Enhanced SEO compliance linter with profile configuration support
 */
export function lintSeoOutput(
  result: any,
  instructions: string,
  profileConfig?: ProfileLinterConfig
): LintResult {
  const blockers: ComplianceViolation[] = [];
  const warnings: ComplianceViolation[] = [];
  const checks: ComplianceCheck[] = [];

  // Use profile config with fallbacks to original MedicalEx defaults
  const h1MinLength = profileConfig?.h1Length?.min ?? 90;
  const h1MaxLength = profileConfig?.h1Length?.max ?? 110;
  const requireInternalLinks = profileConfig?.internalLinks ?? true;
  const requireManualsSection = profileConfig?.manualsSection ?? true;
  const metaTitleSuffix = profileConfig?.metaTitleSuffix ?? "| MedicalEx";
  const storeNameVar = profileConfig?.storeNameVar ?? "MedicalEx";

  // Basic structure validation
  const h1 = result?.seo?.h1 || result?.product_name || "";
  const title = result?.seo?.title || result?.meta_title || "";
  const metaDesc = result?.seo?.metaDescription || result?.meta_description || "";
  const shortDesc = result?.seo?.shortDescription || "";
  const url = result?.seo?.url || result?.generated_product_url || "";
  const html = result?.description_html || result?.final_description || "";

  // H1 validation with profile-specific length requirements
  if (!h1.trim()) {
    blockers.push({ severity: "blocker", code: "H1_MISSING", message: "Missing H1", field: "seo.h1" });
    checks.push({ key: "h1", label: "H1 present", status: "fail", detail: "seo.h1 is empty" });
  } else {
    checks.push({ key: "h1", label: "H1 present", status: "pass" });
    
    const len = h1.length;
    if (len < h1MinLength || len > h1MaxLength) {
      blockers.push({
        severity: "blocker",
        code: "H1_LENGTH_VIOLATION",
        message: `H1 length must be ${h1MinLength}–${h1MaxLength} chars; got ${len}`,
        field: "seo.h1",
        snippet: safeSnippet(h1)
      });
      checks.push({ key: "h1_len", label: `H1 length ${h1MinLength}–${h1MaxLength}`, status: "fail", detail: `len=${len}` });
    } else {
      checks.push({ key: "h1_len", label: `H1 length ${h1MinLength}–${h1MaxLength}`, status: "pass", detail: `len=${len}` });
    }
  }

  // Meta title validation with profile-specific suffix
  const expectedSuffix = metaTitleSuffix.replace("{{STORE_NAME}}", storeNameVar);
  if (title && !title.endsWith(expectedSuffix)) {
    blockers.push({
      severity: "blocker", 
      code: "META_TITLE_SUFFIX_MISSING",
      message: `Meta title must end with "${expectedSuffix}"`,
      field: "seo.title",
      snippet: safeSnippet(title)
    });
  }

  // Core required fields (warnings, not blockers)
  if (!title.trim()) warnings.push({ severity: "warning", code: "TITLE_MISSING", message: "Missing SEO title", field: "seo.title" });
  if (!metaDesc.trim())
    warnings.push({ severity: "warning", code: "META_DESCRIPTION_MISSING", message: "Missing meta description", field: "seo.metaDescription" });
  if (!shortDesc.trim())
    warnings.push({ severity: "warning", code: "SHORT_DESCRIPTION_MISSING", message: "Missing short description", field: "seo.shortDescription" });
  if (!url.trim()) warnings.push({ severity: "warning", code: "URL_MISSING", message: "Missing SEO url/slug", field: "seo.url" });

  // HTML structure validation
  if (html) {
    if (!html.trim()) {
      blockers.push({ severity: "blocker", code: "HTML_MISSING", message: "Missing HTML description", field: "description_html" });
      checks.push({ key: "html", label: "HTML description present", status: "fail", detail: "description_html is empty" });
    } else {
      checks.push({ key: "html", label: "HTML description present", status: "pass" });
      
      // Check required sections with profile awareness
      const requiredOrder: Array<{ key: SectionKey; required: boolean }> = [
        { key: "overview", required: true },
        { key: "hook", required: true },
        { key: "mainDescription", required: true },
        { key: "featuresBenefits", required: true },
        { key: "specifications", required: true },
        { key: "internalLinks", required: requireInternalLinks },
        { key: "whyChoose", required: true },
        { key: "manuals", required: requireManualsSection }, // may be null but must exist per schema
        { key: "faqs", required: true },
      ];

      for (const item of requiredOrder) {
        if (!item.required) continue; // Skip sections not required by this profile
        
        const section = getSectionFromHtml(html, item.key);
        if (item.key === "manuals" && section === null) {
          // Manuals section can be conditionally omitted
          continue;
        }
        if (!section) {
          blockers.push({
            severity: "blocker",
            code: "REQUIRED_SECTION_MISSING",
            message: `Missing required section: ${item.key}`,
            field: "description_html"
          });
        }
      }

      // Internal links check (only if required by profile)
      if (requireInternalLinks) {
        const internalLinksSection = getSectionFromHtml(html, "internalLinks");
        if (!internalLinksSection) {
          blockers.push({
            severity: "blocker",
            code: "INTERNAL_LINKS_MISSING", 
            message: "Missing internal links section",
            field: "description_html"
          });
        }
      }
    }
  }

  // Features validation
  const features = result?.features || [];
  if (!Array.isArray(features) || features.length === 0) {
    warnings.push({ severity: "warning", code: "FEATURES_EMPTY", message: "No feature bullets found (features[] is empty)", field: "features" });
    checks.push({ key: "features", label: "Feature bullets present", status: "warn", detail: "features[] is empty" });
  } else {
    checks.push({ key: "features", label: "Feature bullets present", status: "pass" });
    if (features.length < 3) {
      warnings.push({
        severity: "warning",
        code: "FEATURES_COUNT_LOW",
        message: `Only ${features.length} feature bullets found; recommend 3+`,
        field: "features"
      });
    }
  }

  // Compile results
  const meta = {
    instructions_sha256: instructions ? sha256(instructions) : null,
    profile_key: profileConfig ? "profile-aware" : "legacy",
    linter_key: `${profileConfig ? "profile" : "medicalex"}ComplianceLinter`
  };

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    checks,
    meta
  };
}

/**
 * Legacy function for backward compatibility
 */
export function lintSeoOutputLegacy(result: any, instructions: string): LintResult {
  return lintSeoOutput(result, instructions);
}

export default lintSeoOutput;
