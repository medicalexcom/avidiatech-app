import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/isOwnerUser";
import { getServiceSupabaseClient } from "@/lib/supabase";

/**
 * GET /api/billing/summary
 *
 * Returns billing and usage summary for the current user.
 * Used by BillingPanel (src/components/settings/BillingPanel.tsx).
 *
 * Response shape:
 * {
 *   isOwner: boolean
 *   plan: string                    // "Starter" | "Growth" | "Pro"
 *   status: string                  // "active" | "trialing" | "canceled" | "past_due"
 *   renewal: string                 // human-readable date e.g. "May 12, 2026"
 *   trialEnd: string | null
 *   daysUntilRenewal: number | null
 *   usage: {
 *     ingests:      { used: number; limit: number | null }
 *     seo:          { used: number; limit: number | null }
 *     variants:     { used: number; limit: number | null }
 *     matching:     { used: number; limit: number | null }
 *     translations: { used: number; limit: number | null }
 *   }
 * }
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const supabase = getServiceSupabaseClient();

    // ── Owner check ─────────────────────────────────────────────────────────
    let isOwner = false;
    try {
      isOwner = await isOwnerUser(userId);
    } catch (_) {}

    // ── Resolve tenantId ────────────────────────────────────────────────────
    // Self-serve: tenantId = userId. But look up team_members for org accounts.
    let tenantId: string = userId;
    try {
      const { data: membership } = await supabase
        .from("team_members")
        .select("tenant_id, role")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);
      if (membership && membership.length > 0) {
        tenantId = membership[0].tenant_id;
      }
    } catch (_) {}

    // ── Fetch subscription ──────────────────────────────────────────────────
    const { data: subRows } = await supabase
      .from("tenant_subscriptions")
      .select("plan_name, status, current_period_end, ingestion_quota, seo_quota, variant_quota, match_quota")
      .eq("tenant_id", tenantId)
      .order("current_period_end", { ascending: false })
      .limit(1);

    const sub = subRows?.[0];

    // ── Fetch usage ─────────────────────────────────────────────────────────
    const { data: usageRows } = await supabase
      .from("usage_counters")
      .select("ingestion_count, seo_count, variants_count, match_count")
      .eq("tenant_id", tenantId)
      .limit(1);

    const usage = usageRows?.[0];

    // ── Build response ──────────────────────────────────────────────────────
    const planRaw     = sub?.plan_name ?? null;
    const planDisplay = planRaw
      ? planRaw.charAt(0).toUpperCase() + planRaw.slice(1)
      : isOwner ? "Owner" : "No plan";

    const status    = sub?.status ?? (isOwner ? "active" : "none");
    const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;

    let renewal: string = "—";
    let daysUntilRenewal: number | null = null;
    if (periodEnd) {
      renewal = periodEnd.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      daysUntilRenewal = Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    const ingestUsed   = usage?.ingestion_count ?? 0;
    const seoUsed      = usage?.seo_count       ?? 0;
    const variantsUsed = usage?.variants_count   ?? 0;
    const matchUsed    = usage?.match_count      ?? 0;

    // Owners get null limits (unlimited display)
    const ingestLimit   = isOwner ? null : (sub?.ingestion_quota ?? null);
    const seoLimit      = isOwner ? null : (sub?.seo_quota       ?? null);
    const variantsLimit = isOwner ? null : (sub?.variant_quota   ?? null);
    const matchLimit    = isOwner ? null : (sub?.match_quota     ?? null);

    return NextResponse.json({
      isOwner,
      plan:    planDisplay,
      status,
      renewal,
      trialEnd:         status === "trialing" ? periodEnd?.toISOString() ?? null : null,
      daysUntilRenewal,
      usage: {
        ingests:      { used: ingestUsed,   limit: ingestLimit   },
        seo:          { used: seoUsed,      limit: seoLimit      },
        variants:     { used: variantsUsed, limit: variantsLimit },
        matching:     { used: matchUsed,    limit: matchLimit    },
        translations: { used: seoUsed,      limit: seoLimit      },
      },
    });
  } catch (err: any) {
    console.error("billing/summary error:", err);
    return NextResponse.json({ error: "Failed to fetch billing summary" }, { status: 500 });
  }
}
