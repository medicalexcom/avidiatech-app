import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getAvailableProfiles, loadPromptProfile } from "@/lib/gpt/loadPromptProfile";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

const EXPECTED_PROFILE_KEYS = [
  "medicalex.bigcommerce.longform",
  "general.bigcommerce.longform",
  "general.amazon.listing",
  "general.facebook.catalog",
] as const;

const PROMPTS_ROOT = path.join(process.cwd(), "tools", "render-engine", "prompts");

function isAuthorized(req: NextRequest): boolean {
  const headerKey = req.headers.get("x-smoke-key") || "";
  const envKey = process.env.SMOKE_TEST_KEY || process.env.INTERNAL_API_KEY || "";
  return Boolean(envKey) && headerKey === envKey;
}

async function checkFileExists(relPath: string): Promise<boolean> {
  try {
    await fs.access(path.join(PROMPTS_ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenantId");

  const result: Record<string, any> = {
    timestamp: new Date().toISOString(),
    checks: {},
    pass: false,
  };

  try {
    const availableProfiles = await getAvailableProfiles();
    const availableKeys = availableProfiles.map((p) => p.key).sort();
    const missingExpected = EXPECTED_PROFILE_KEYS.filter((k) => !availableKeys.includes(k));

    result.checks.available_profiles = {
      ok: missingExpected.length === 0,
      count: availableKeys.length,
      availableKeys,
      missingExpected,
    };

    const fileChecks = await Promise.all([
      ...EXPECTED_PROFILE_KEYS.map(async (k) => ({
        file: `profiles/${k}.json`,
        exists: await checkFileExists(`profiles/${k}.json`),
      })),
      { file: "custom_gpt_instructions-33.md", exists: await checkFileExists("custom_gpt_instructions-33.md") },
    ]);

    result.checks.prompt_files = {
      ok: fileChecks.every((f) => f.exists),
      files: fileChecks,
    };

    try {
      const defaultProfile = await loadPromptProfile({
        tenantId,
        storeVars: { STORE_NAME: "Smoke Store" },
      });

      const generalProfile = await loadPromptProfile({
        profileKey: "general.bigcommerce.longform",
        storeVars: { STORE_NAME: "Smoke Store" },
      });

      result.checks.profile_loader = {
        ok:
          defaultProfile.compiledPrompt.trim().length > 0 &&
          generalProfile.compiledPrompt.trim().length > 0,
        defaultResolvedKey: defaultProfile.profileKey,
        defaultPromptLength: defaultProfile.compiledPrompt.length,
        generalResolvedKey: generalProfile.profileKey,
        generalPromptLength: generalProfile.compiledPrompt.length,
      };
    } catch (error: any) {
      result.checks.profile_loader = {
        ok: false,
        error: error?.message || String(error),
      };
    }

    if (tenantId) {
      const { data, error } = await supabaseServiceRole
        .from("tenants")
        .select("id, name, default_profile_key")
        .eq("id", tenantId)
        .maybeSingle();

      result.checks.tenant_lookup = {
        ok: Boolean(data) && !error,
        tenantId,
        data,
        error: error ? { message: error.message } : null,
      };
    } else {
      result.checks.tenant_lookup = {
        ok: true,
        skipped: true,
        reason: "No tenantId supplied",
      };
    }

    const checks = Object.values(result.checks) as Array<{ ok?: boolean }>;
    result.pass = checks.every((c) => c.ok !== false);

    return NextResponse.json(result, { status: result.pass ? 200 : 500 });
  } catch (error: any) {
    return NextResponse.json(
      {
        pass: false,
        error: error?.message || String(error),
        checks: result.checks,
      },
      { status: 500 }
    );
  }
}
