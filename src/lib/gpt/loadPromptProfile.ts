/**
 * loadPromptProfile.ts
 *
 * Profile-based prompt loading system for AvidiaTech content generation.
 * Replaces loadInstructions.ts with support for modular prompt composition.
 *
 * Key features:
 * - MedicalEx continues using canonical file (zero regression risk)
 * - General ecommerce profiles use modular composition
 * - Runtime variable injection for store names and customization
 * - Automatic fallback to MedicalEx profile for backward compatibility
 */

import path from "path";
import fs from "fs/promises";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export type InstrSource = "local";

export interface PromptProfile {
  compiledPrompt: string;
  profileKey: string;
  schemaKey: string;
  linterKey: string;
  metaTitleSuffix: string;
  h1Length: { min: number; max: number };
  internalLinks: boolean;
  manualsSection: boolean;
  storeNameVar: string;
  sourceParts: string[];
}

interface ProfileConfig {
  key: string;
  useCanonicalFile: boolean;
  canonicalFile?: string;
  promptParts?: string[];
  schemaKey: string;
  linterKey: string;
  metaTitleSuffix: string;
  h1Length: { min: number; max: number };
  internalLinks: boolean;
  manualsSection: boolean;
  storeNameVar: string;
  description?: string;
  channels?: string[];
  domains?: string[];
  tenants?: string[];
}

const BUILTIN_PROFILE_CONFIGS: Record<string, ProfileConfig> = {
  "medicalex.bigcommerce.longform": {
    key: "medicalex.bigcommerce.longform",
    description: "MedicalEx canonical longform profile (backward-compatible default)",
    useCanonicalFile: true,
    canonicalFile: "custom_gpt_instructions-33.md",
    schemaKey: "describeSchema.json",
    linterKey: "medicalexBigcommerceSeo",
    h1Length: { min: 90, max: 110 },
    metaTitleSuffix: "| MedicalEx",
    internalLinks: true,
    manualsSection: true,
    storeNameVar: "MedicalEx",
    channels: ["bigcommerce"],
    domains: ["medical"],
    tenants: ["medicalex"],
  },
  "general.bigcommerce.longform": {
    key: "general.bigcommerce.longform",
    description: "General ecommerce longform profile for non-medical stores",
    useCanonicalFile: false,
    promptParts: [
      "core/grounding.md",
      "core/compliance.md",
      "core/formatting.md",
      "core/variants.md",
      "channels/bigcommerce-longform.md",
      "domains/general-ecommerce.md",
    ],
    schemaKey: "describeSchema.json",
    linterKey: "generalBigcommerceSeo",
    h1Length: { min: 60, max: 110 },
    metaTitleSuffix: "| {{STORE_NAME}}",
    internalLinks: false,
    manualsSection: true,
    storeNameVar: "{{STORE_NAME}}",
    channels: ["bigcommerce"],
    domains: ["general"],
  },
  "general.amazon.listing": {
    key: "general.amazon.listing",
    description: "General ecommerce Amazon listing profile",
    useCanonicalFile: false,
    promptParts: [
      "core/grounding.md",
      "core/compliance.md",
      "core/formatting.md",
      "core/variants.md",
      "channels/amazon-listing.md",
      "domains/general-ecommerce.md",
    ],
    schemaKey: "describeSchema.json",
    linterKey: "generalAmazonListing",
    h1Length: { min: 60, max: 200 },
    metaTitleSuffix: "",
    internalLinks: false,
    manualsSection: false,
    storeNameVar: "{{STORE_NAME}}",
    channels: ["amazon"],
    domains: ["general"],
  },
  "general.facebook.catalog": {
    key: "general.facebook.catalog",
    description: "General ecommerce Facebook catalog/shop profile",
    useCanonicalFile: false,
    promptParts: [
      "core/grounding.md",
      "core/compliance.md",
      "core/formatting.md",
      "core/variants.md",
      "channels/facebook-catalog.md",
      "domains/general-ecommerce.md",
    ],
    schemaKey: "describeSchema.json",
    linterKey: "generalFacebookCatalog",
    h1Length: { min: 40, max: 120 },
    metaTitleSuffix: "",
    internalLinks: false,
    manualsSection: false,
    storeNameVar: "{{STORE_NAME}}",
    channels: ["facebook"],
    domains: ["general"],
  },
};

// Cache for compiled prompts and profile configs
let profileCache: Map<string, { profile: PromptProfile; fetchedAt: number }> = new Map();
let configCache: Map<string, ProfileConfig> = new Map();

const DEFAULT_TTL = parseInt(process.env.RENDER_PROMPTS_TTL_SECONDS || "600", 10);
const PROMPTS_DIR = path.join(process.cwd(), "tools", "render-engine", "prompts");

/** Get tenant's default profile key from Supabase (`tenants.default_profile_key`). */
async function getTenantDefaultProfile(tenantId?: string | null): Promise<string | null> {
  if (!tenantId) return null;

  try {
    const { data, error } = await supabaseServiceRole
      .from("tenants")
      .select("default_profile_key")
      .eq("id", tenantId)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.warn("getTenantDefaultProfile: lookup failed, using fallback", {
        tenantId,
        message: error.message,
      });
      return null;
    }

    return typeof data?.default_profile_key === "string" && data.default_profile_key.trim()
      ? data.default_profile_key.trim()
      : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("getTenantDefaultProfile: unexpected error, using fallback", {
      tenantId,
      error,
    });
    return null;
  }
}

function buildProfileCacheKey(profileKey: string, storeVars?: Record<string, string>): string {
  const entries = Object.entries(storeVars ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const varsKey = JSON.stringify(entries);
  return `${profileKey}::${varsKey}`;
}

/**
 * Load and parse profile configuration JSON
 */
async function loadProfileConfig(profileKey: string): Promise<ProfileConfig> {
  if (configCache.has(profileKey)) {
    return configCache.get(profileKey)!;
  }

  const profilePath = path.join(PROMPTS_DIR, "profiles", `${profileKey}.json`);
  
  try {
    const configText = await fs.readFile(profilePath, "utf8");
    const config: ProfileConfig = JSON.parse(configText);
    
    // Validate required fields
    if (!config.key || !config.schemaKey || !config.linterKey) {
      throw new Error(`Invalid profile config: ${profileKey}`);
    }

    configCache.set(profileKey, config);
    return config;
  } catch (error) {
    const builtIn = BUILTIN_PROFILE_CONFIGS[profileKey];
    if (builtIn) {
      configCache.set(profileKey, builtIn);
      return builtIn;
    }
    throw new Error(`Failed to load profile config: ${profileKey} - ${error}`);
  }
}

/**
 * Load individual prompt file
 */
async function loadPromptFile(filePath: string): Promise<string> {
  const fullPath = path.join(PROMPTS_DIR, filePath);
  try {
    return await fs.readFile(fullPath, "utf8");
  } catch (error) {
    throw new Error(`Failed to load prompt file: ${filePath} - ${error}`);
  }
}

/**
 * Inject runtime variables into prompt text
 */
function injectVariables(prompt: string, variables: Record<string, string>): string {
  let result = prompt;
  
  // Default variables
  const defaultVars = {
    STORE_NAME: variables.STORE_NAME || "Your Store"
  };

  const allVars = { ...defaultVars, ...variables };

  // Replace all {{VARIABLE}} patterns
  for (const [key, value] of Object.entries(allVars)) {
    const pattern = new RegExp(`{{${key}}}`, "g");
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * Main function to load and compile a prompt profile
 */
export async function loadPromptProfile(params: {
  tenantId?: string | null;
  profileKey?: string | null;
  storeVars?: Record<string, string>;
}): Promise<PromptProfile> {
  
  // Resolution order: explicit request > tenant default > MedicalEx fallback
  const resolvedKey = params.profileKey
    ?? await getTenantDefaultProfile(params.tenantId)
    ?? "medicalex.bigcommerce.longform";

  // Check cache first
  const now = Date.now();
  const cacheKey = buildProfileCacheKey(resolvedKey, params.storeVars);
  const cached = profileCache.get(cacheKey);
  if (cached && (now - cached.fetchedAt) / 1000 < DEFAULT_TTL) {
    return cached.profile;
  }

  try {
    // Load profile configuration
    const config = await loadProfileConfig(resolvedKey);
    
    let compiledPrompt: string;
    let sourceParts: string[];

    if (config.useCanonicalFile) {
      // MedicalEx mode: use the existing canonical file directly
      if (!config.canonicalFile) {
        throw new Error(`Profile ${resolvedKey} is set to use canonical file but none specified`);
      }
      
      const canonicalPath = path.join(PROMPTS_DIR, config.canonicalFile);
      compiledPrompt = await fs.readFile(canonicalPath, "utf8");
      sourceParts = [config.canonicalFile];
      
      // eslint-disable-next-line no-console
      console.info(`loadPromptProfile: using canonical file for ${resolvedKey}:`, canonicalPath);
    } else {
      // General profiles: compose from modular parts
      if (!config.promptParts || config.promptParts.length === 0) {
        throw new Error(`Profile ${resolvedKey} has no prompt parts specified`);
      }

      const parts = await Promise.all(
        config.promptParts.map(part => loadPromptFile(part))
      );
      
      const combined = parts.join("\n\n---\n\n");
      compiledPrompt = injectVariables(combined, params.storeVars || {});
      sourceParts = config.promptParts;
      
      // eslint-disable-next-line no-console
      console.info(`loadPromptProfile: composed ${resolvedKey} from ${config.promptParts.length} parts`);
    }

    // Validate compiled prompt
    if (!compiledPrompt || compiledPrompt.trim().length === 0) {
      throw new Error(`Compiled prompt for ${resolvedKey} is empty`);
    }

    // Build return object
    const profile: PromptProfile = {
      compiledPrompt,
      profileKey: resolvedKey,
      schemaKey: config.schemaKey,
      linterKey: config.linterKey,
      metaTitleSuffix: config.metaTitleSuffix,
      h1Length: config.h1Length,
      internalLinks: config.internalLinks,
      manualsSection: config.manualsSection,
      storeNameVar: config.storeNameVar,
      sourceParts
    };

    // Cache result
    profileCache.set(cacheKey, { profile, fetchedAt: now });
    
    return profile;

  } catch (error) {
    // If profile loading fails, fall back to MedicalEx canonical if not already trying it
    if (resolvedKey !== "medicalex.bigcommerce.longform") {
      // eslint-disable-next-line no-console
      console.warn(`Failed to load profile ${resolvedKey}, falling back to MedicalEx:`, error);
      
      return loadPromptProfile({
        ...params,
        profileKey: "medicalex.bigcommerce.longform"
      });
    }
    
    throw new Error(`Failed to load prompt profile ${resolvedKey}: ${error}`);
  }
}

/**
 * Legacy compatibility function - loads with default MedicalEx profile
 */
export async function loadCustomGptInstructions(tenantId?: string | null): Promise<string> {
  const profile = await loadPromptProfile({ tenantId });
  return profile.compiledPrompt;
}

/**
 * Legacy compatibility function with source info
 */
export async function loadCustomGptInstructionsWithInfo(tenantId?: string | null): Promise<{ text: string; source: InstrSource }> {
  const profile = await loadPromptProfile({ tenantId });
  return { text: profile.compiledPrompt, source: "local" };
}

/**
 * Clear all caches (for testing/development)
 */
export function clearLoadPromptProfileCache(): void {
  profileCache.clear();
  configCache.clear();
}

/**
 * Get available profile keys (for UI dropdown)
 */
export async function getAvailableProfiles(): Promise<{ key: string; description?: string }[]> {
  try {
    const profilesDir = path.join(PROMPTS_DIR, "profiles");
    const files = await fs.readdir(profilesDir);
    
    const profiles = await Promise.all(
      files
        .filter(file => file.endsWith(".json"))
        .map(async file => {
          const key = file.replace(".json", "");
          try {
            const config = await loadProfileConfig(key);
            return { key, description: config.description };
          } catch {
            return { key };
          }
        })
    );
    
    return profiles.sort((a, b) => a.key.localeCompare(b.key));
  } catch {
    return Object.values(BUILTIN_PROFILE_CONFIGS)
      .map((cfg) => ({ key: cfg.key, description: cfg.description }))
      .sort((a, b) => a.key.localeCompare(b.key));
  }
}

export default loadPromptProfile;
