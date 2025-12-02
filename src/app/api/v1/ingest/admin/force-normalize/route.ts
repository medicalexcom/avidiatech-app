url=https://github.com/medicalexcom/avidiatech-app/blob/main/src/app/api/v1/ingest/admin/force-normalize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * Admin helper (temporary).
 * POST /api/v1/ingest/admin/force-normalize
 * Body: { ingestionId: string }
 *
 * - Auth: requires an authenticated user who has a profile row (owner/admin). Adjust as needed.
 * - Performs a lightweight scrape of ingestion.source_url and writes normalized_payload,
 *   sets status='completed', completed_at, and returns the updated row.
 *
 * Use only for debugging or emergency/unblock; remove when worker is fixed.
 */

async function scrapePageFallback(url: string | null) {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "AvidiaForceNormalize/1.0" } });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
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
    return {
      title: title || "",
      metaDescription: metaDesc || "",
      name: h1 || title || "",
      description_raw: firstP || "",
      browsed_text: text.slice(0, 30_000)
    };
  } catch (e) {
    console.warn("force-normalize scrape failed:", String(e));
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = safeGetAuth(req as any) as any;
    const { userId } = auth ?? {};
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({} as any));
    const ingestionId = (body?.ingestionId || "").toString();
    if (!ingestionId) return NextResponse.json({ error: "missing ingestionId" }, { status: 400 });

    // Optional: verify profile/role (owner/admin); adjust query per your profiles schema
    const sbProfile = getServiceSupabaseClient();
    const { data: profile, error: profErr } = await sbProfile.from("profiles").select("id,role,tenant_id").eq("user_id", userId).limit(1).single();
    if (profErr || !profile) {
      return NextResponse.json({ error: "profile_not_found" }, { status: 403 });
    }
    // allow owner or admin (adjust as needed)
    const role = profile.role ?? "member";
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Load ingestion row
    const sb = getServiceSupabaseClient();
    const { data: ingestionRow, error: rowErr } = await sb.from("product_ingestions").select("*").eq("id", ingestionId).limit(1).single();
    if (rowErr || !ingestionRow) return NextResponse.json({ error: "ingestion_not_found" }, { status: 404 });

    // perform fallback scrape -> create normalized payload
    const normalizedPayload = await scrapePageFallback(ingestionRow.source_url || ingestionRow.url || null);
    if (!normalizedPayload) {
      return NextResponse.json({ error: "scrape_failed" }, { status: 502 });
    }

    // Update ingestion row with normalized_payload and mark completed
    const updateBody: any = {
      normalized_payload: normalizedPayload,
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: updated, error: updateErr } = await sb.from("product_ingestions").update(updateBody).eq("id", ingestionId).select("*").single();
    if (updateErr || !updated) {
      console.error("force-normalize update failed", updateErr);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ingestion: updated }, { status: 200 });
  } catch (e: any) {
    console.error("force-normalize error", e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
