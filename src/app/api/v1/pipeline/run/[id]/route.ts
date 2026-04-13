import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import crypto from "crypto";

function clerkUserIdToUuid(clerkUserId: string): string {
  const hash = crypto.createHash("sha1").update(`clerk:${clerkUserId}`).digest("hex");
  const a = hash.slice(0, 8);
  const b = hash.slice(8, 12);
  const c = ((parseInt(hash.slice(12, 16), 16) & 0x0fff) | 0x5000).toString(16).padStart(4, "0");
  const d = ((parseInt(hash.slice(16, 20), 16) & 0x3fff) | 0x8000).toString(16).padStart(4, "0");
  const e = hash.slice(20, 32);
  return `${a}-${b}-${c}-${d}-${e}`;
}

function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient } = require("@supabase/supabase-js");
  return createClient(url, key, { auth: { persistSession: false } });
}

function isInternalAuthed(req: Request): boolean {
  const expected = String(process.env.PIPELINE_INTERNAL_SECRET || "");
  if (!expected) return false;

  const a = String(req.headers.get("x-pipeline-secret") || "");
  if (a && a === expected) return true;

  const b = String(req.headers.get("x-service-api-key") || "");
  if (b && b === expected) return true;

  return false;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const internal = isInternalAuthed(req);

  let createdBy: string | null = null;
  if (!internal) {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    createdBy = clerkUserIdToUuid(userId);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "supabase_not_configured", message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }

  const { id } = await ctx.params;

  const { data: run, error: runErr } = await supabase
    .from("pipeline_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (runErr) {
    return NextResponse.json({ error: "run_query_failed", details: String(runErr?.message ?? runErr) }, { status: 500 });
  }
  if (!run) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // For external users, enforce ownership. For internal worker calls, allow access.
  if (!internal && createdBy && run.created_by !== createdBy) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: modules, error: modErr } = await supabase
    .from("module_runs")
    .select("*")
    .eq("pipeline_run_id", id)
    .order("module_index", { ascending: true });

  if (modErr) {
    return NextResponse.json(
      { error: "modules_query_failed", details: String(modErr?.message ?? modErr) },
      { status: 500 }
    );
  }

  return NextResponse.json({ run, modules: modules ?? [] }, { status: 200 });
}
