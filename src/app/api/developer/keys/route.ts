import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { handleRouteError, requireSubscriptionAndUsage, tenantFromRequest } from "@/lib/billing";
import { extractEmailFromSessionClaims } from "@/lib/clerk-utils";
import { HttpError } from "@/lib/errors";
import crypto from "node:crypto";

/**
 * GET /api/developer/keys
 * List API keys for the current tenant.
 * Returns { keys: [{ id, name, keyPreview, created_at, last_used, permissions }] }
 */
export async function GET(request: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    const context = await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
      userEmail,
    });

    if (context.role === "member") {
      throw new HttpError(403, "Only owners or admins can view API keys.");
    }

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, prefix, last_used_at, revoked_at, created_at")
      .eq("tenant_id", context.tenantId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Map to the shape ApiKeysManager expects
    const keys = (data || []).map((k) => ({
      id: k.id,
      name: k.name,
      keyPreview: `${k.prefix}.${"•".repeat(24)}`,
      created_at: k.created_at,
      last_used: k.last_used_at ?? undefined,
      permissions: ["read", "write"],
    }));

    return NextResponse.json({ keys });
  } catch (err) {
    return handleRouteError(err);
  }
}

/**
 * POST /api/developer/keys
 * Create a new API key.
 * Body: { name: string }
 * Returns { key: string, meta: { id, name, prefix, created_at } }
 */
export async function POST(request: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userEmail = extractEmailFromSessionClaims(sessionClaims);
    const context = await requireSubscriptionAndUsage({
      userId,
      requestedTenantId: tenantFromRequest(request),
      userEmail,
    });

    if (context.role !== "owner") {
      throw new HttpError(403, "Only owners can create API keys.");
    }

    const body = await request.json().catch(() => ({}));
    const { name } = body as { name?: string };
    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const prefix = Math.random().toString(36).substring(2, 8);
    const secret = crypto.randomUUID().replace(/-/g, "");
    const rawKey = `${prefix}.${secret}`;

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedKey = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const supabase = getServiceSupabaseClient();
    const { data, error } = await supabase
      .from("api_keys")
      .insert({ tenant_id: context.tenantId, name: name.trim(), prefix, hashed_key: hashedKey })
      .select("id, name, prefix, created_at");

    if (error) throw new Error(error.message);

    return NextResponse.json({ key: rawKey, meta: data?.[0] });
  } catch (err) {
    return handleRouteError(err);
  }
}
