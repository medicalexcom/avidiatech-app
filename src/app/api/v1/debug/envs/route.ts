import { NextResponse } from "next/server";

function mask(v?: string | null) {
  if (!v) return null;
  if (v.length <= 8) return "****";
  return v.slice(0, 4) + "..." + v.slice(-4);
}

export async function GET() {
  // Don't return raw secrets; return presence + masked samples for safe debugging.
  const envs = {
    PIPELINE_INTERNAL_SECRET: !!process.env.PIPELINE_INTERNAL_SECRET,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    CENTRAL_GPT_URL: !!process.env.CENTRAL_GPT_URL,
    CENTRAL_GPT_KEY: !!process.env.CENTRAL_GPT_KEY,
    APP_URL: !!process.env.APP_URL,
    INGEST_ENGINE_URL: !!process.env.INGEST_ENGINE_URL,
    INGEST_SECRET: !!process.env.INGEST_SECRET,
    // For convenience show masked samples (if you are running locally and need to verify)
    SAMPLE_MASKED: {
      PIPELINE_INTERNAL_SECRET: mask(process.env.PIPELINE_INTERNAL_SECRET || null),
      CENTRAL_GPT_KEY: mask(process.env.CENTRAL_GPT_KEY || null),
      SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY || null),
    },
  };

  return NextResponse.json({ ok: true, envs });
}
