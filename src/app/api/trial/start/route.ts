import { NextResponse } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";
import { getServiceSupabaseClient } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";

const TRIAL_DAYS = 14;

// Quota mapping for trial (same as Starter plan — upgrade after trial)
const TRIAL_QUOTAS = {
  ingestion_quota: 500,
  seo_quota:       500,
  variant_quota:   250,
  match_quota:     100,
};

/**
 * POST /api/trial/start
 *
 * Called from the trial-setup page after the user selects a plan.
 * Creates:
 *  1. A team_members row (tenantId = userId, role = "owner")
 *  2. A tenant_subscriptions row with status = "trialing" and 14-day period_end
 *  3. A usage_counters row (all counts at 0)
 *
 * Idempotent — safe to call multiple times.
 */
export async function POST(req: Request) {
  try {
    const { userId } = (safeGetAuth(req as any) as { userId?: string | null }) || {};
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // Optionally read plan from body (defaults to starter)
    let planName = "starter";
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.plan && typeof body.plan === "string") {
        planName = body.plan.toLowerCase();
      }
    } catch (_) {}

    // Fetch email and name from Clerk for welcome email
    let email: string | undefined;
    let firstName: string | undefined;
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const client = await clerkClient();
      const user   = await client.users.getUser(userId);
      email        = user?.emailAddresses?.[0]?.emailAddress;
      firstName    = user?.firstName ?? undefined;
    } catch (err) {
      console.warn("Unable to fetch Clerk user for trial creation:", String(err));
    }

    const supabase  = getServiceSupabaseClient();
    const tenantId  = userId; // 1 user = 1 tenant for self-serve
    const nowIso    = new Date().toISOString();
    const trialEnd  = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // ── 1. Ensure team_members row ───────────────────────────────────────────
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .limit(1);

    if (!existingMember || existingMember.length === 0) {
      const { error: memberErr } = await supabase
        .from("team_members")
        .insert({ tenant_id: tenantId, user_id: userId, role: "owner" });

      if (memberErr && !memberErr.message.includes("duplicate")) {
        console.error("trial/start: team_members insert error:", memberErr.message);
        return NextResponse.json({ error: "Failed to create team membership", details: memberErr.message }, { status: 500 });
      }
    }

    // ── 2. Upsert tenant_subscriptions ──────────────────────────────────────
    const { error: subErr } = await supabase
      .from("tenant_subscriptions")
      .upsert(
        {
          tenant_id:          tenantId,
          plan_name:          planName,
          status:             "trialing",
          current_period_end: trialEnd,
          ...TRIAL_QUOTAS,
        },
        { onConflict: "tenant_id" }
      );

    if (subErr) {
      console.error("trial/start: tenant_subscriptions upsert error:", subErr.message);
      return NextResponse.json({ error: "Failed to create trial subscription", details: subErr.message }, { status: 500 });
    }

    // ── 3. Ensure usage_counters row ─────────────────────────────────────────
    const { data: existingUsage } = await supabase
      .from("usage_counters")
      .select("id")
      .eq("tenant_id", tenantId)
      .limit(1);

    if (!existingUsage || existingUsage.length === 0) {
      const { error: usageErr } = await supabase
        .from("usage_counters")
        .insert({
          tenant_id:       tenantId,
          period_start:    nowIso,
          ingestion_count: 0,
          seo_count:       0,
          variants_count:  0,
          match_count:     0,
        });

      if (usageErr && !usageErr.message.includes("duplicate")) {
        console.warn("trial/start: usage_counters insert warning:", usageErr.message);
        // Non-fatal — billing.ts will create this on demand
      }
    }

    // Send welcome / trial-started email
    if (email) {
      try {
        await sendEmail.trialStarted({
          to:           email,
          name:         firstName ?? "there",
          trialEndsAt:  new Date(trialEnd),
        });
      } catch (emailErr) {
        console.warn("[trial/start] Could not send welcome email:", emailErr);
      }
    }

    console.info(`[trial/start] Created trial for userId=${userId} email=${email ?? "unknown"} plan=${planName} trialEnd=${trialEnd}`);

    return NextResponse.json({
      ok:       true,
      tenantId,
      plan:     planName,
      trialEnd,
    });
  } catch (err: any) {
    console.error("trial/start error:", err);
    return NextResponse.json({ error: "Failed to start trial", details: String(err?.message ?? err) }, { status: 500 });
  }
}
