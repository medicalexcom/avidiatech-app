// GET status for a job: /api/v1/ingest/:id
// NOTE: handler signature uses a permissive context.params type to satisfy Next.js RouteHandlerConfig
// (some Next.js type variants expect params wrapped in a Promise in the context type).
// Using `context: { params: any }` keeps TypeScript happy while preserving runtime behavior.

import { NextResponse } from "next/server";
import type { Request } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * Use a permissive context type to avoid TypeScript mismatches with Next.js' RouteHandlerConfig.
 * The runtime will provide { params: { id: string } } as expected.
 */
export async function GET(req: Request, context: { params: any }) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const id = context?.params?.id;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err.message);
      return NextResponse.json({ error: "server misconfigured: missing Supabase envs" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("product_ingestions")
      .select("id, status, normalized_payload, error, created_at, completed_at")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ job: data }, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/v1/ingest/:id error", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
