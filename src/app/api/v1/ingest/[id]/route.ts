// https://github.com/medicalexcom/avidiatech-app/blob/main/src/app/api/v1/ingest/%5Bid%5D/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/v1/ingest/:id
 *
 * Robustly extract the id from either context.params or the request URL (fallback).
 * Requires a signed-in user via Clerk (getAuth). Returns the ingestion row directly.
 */
export async function GET(req: NextRequest, context: { params?: any }) {
  try {
    // Optional: log for debugging (remove in production)
    console.log("GET /api/v1/ingest/:id called", { params: context?.params });

    const { userId } = getAuth(req as any);
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // Try params first, then fallback to parsing the URL path
    let id = context?.params?.id;
    if (!id) {
      try {
        const url = new URL(req.url);
        // pathname like /api/v1/ingest/<id> -> take last segment
        const parts = url.pathname.split("/").filter(Boolean);
        id = parts.length > 0 ? parts[parts.length - 1] : undefined;
      } catch (e) {
        // ignore and let the missing id handling run below
      }
    }

    if (!id) {
      console.warn("missing id param for GET /api/v1/ingest/:id");
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

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
      console.warn("ingest row not found", { id, error });
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Return the row directly (client components expect the row shape)
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/v1/ingest/:id error", err);
    return NextResponse.json({ error: err?.message || "internal_error" }, { status: 500 });
  }
}
