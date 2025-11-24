// GET status for a job: /api/v1/ingest/:id
// NOTE: Use NextRequest type from next/server to match exports in this Next.js version.
// Use a permissive context type so TypeScript doesn't complain about differing RouteHandlerConfig shapes.

import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * Runtime handler: GET /api/v1/ingest/:id
 * Accepts NextRequest and a permissive context so it compiles across Next.js type variants.
 */
export async function GET(req: NextRequest, context: { params: any }) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const id = context?.params?.id;
    if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

    // Create supabase client lazily using service-role key (throws if misconfigured)
    let supabase;
    try {
      supabase = getServiceSupabaseClient();
    } catch (err: any) {
      console.error("Supabase configuration missing", err?.message || err);
      return NextResponse.json({ error: "server misconfigured: missing Supabase envs" }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("product_ingestions")
      .select("id, status, normalized_payload, error, created_at, completed_at")
      .eq("id", id)
      .single();

    if (error || !data) {
      // Row not found or DB error
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Return the row directly (not wrapped) so the client receives the expected shape
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/v1/ingest/:id error", err);
    return NextResponse.json({ error: err.message || "internal_error" }, { status: 500 });
  }
}
