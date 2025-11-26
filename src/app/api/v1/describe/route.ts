import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { getAuth } from "@clerk/nextjs/server";
import type { DescribeRequest } from "@/components/describe/types";

/**
 * API: POST /api/v1/describe
 *
 * Validates Clerk auth, input payload, quota (stub), forwards to Render engine,
 * persists ingestion record (stubbed) and increments usage counter (stubbed).
 *
 * TODO: wire the TODO blocks to your Supabase helpers / usage counter implementations.
 */

const BodySchema = z.object({
  name: z.string().min(1),
  shortDescription: z.string().min(1),
  brand: z.string().optional(),
  specs: z.record(z.string()).optional(),
  format: z.string().optional(),
});

async function checkQuota(tenantId: string | null) {
  // TODO: implement usage quota lookup/increment against your usage_counters table.
  // Return true if allowed, false if quota exceeded.
  return true;
}

async function saveIngestion(payload: any, status = "success") {
  // TODO: implement save into Supabase product_ingestions table using your server client.
  // Example using @supabase/supabase-js (server) with SERVICE_ROLE key:
  // const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  // await supabase.from("product_ingestions").insert({...})
  return { id: null };
}

export async function POST(req: NextRequest) {
  try {
    // NextRequest is the correct type here so getAuth(req) types align with Clerk helpers
    const auth = getAuth(req);
    if (!auth || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = auth.userId;

    // tenant identification — adapt to how you store tenant info (publicMetadata or lookup)
    // Keep this generic; update to match your tenant model
    const tenantId = ((auth.actor as any)?.tenantId as string) || null;

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 422 });
    }
    const payload = parsed.data as DescribeRequest;

    // Check quota
    const ok = await checkQuota(tenantId);
    if (!ok) {
      return NextResponse.json({ error: "Quota exceeded" }, { status: 402 });
    }

    // Forward to render engine
    const engineUrl = process.env.RENDER_ENGINE_ENDPOINT;
    const engineSecret = process.env.RENDER_ENGINE_SECRET;
    if (!engineUrl || !engineSecret) {
      return NextResponse.json({ error: "Render engine not configured" }, { status: 500 });
    }

    const forwardBody = {
      tenant_id: tenantId,
      user_id: userId,
      ...payload,
    };

    const engineRes = await fetch(`${engineUrl.replace(/\/$/, "")}/describe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-engine-key": engineSecret,
      },
      body: JSON.stringify(forwardBody),
    });

    const engineJson = await engineRes.json();

    // Basic engine error handling
    if (!engineRes.ok) {
      // Save failed ingestion for debugging
      await saveIngestion({ request: forwardBody, response: engineJson }, "failed");
      return NextResponse.json({ error: engineJson?.error || "Render engine error" }, { status: engineRes.status || 500 });
    }

    // Save ingestion record and increment usage counters (TODO: wire to Supabase)
    const saved = await saveIngestion({ request: forwardBody, response: engineJson }, "success");
    // TODO: increment usage counter for metric 'describe_calls' for tenantId

    // Return structured engine response (you can adapt keys as engine returns)
    return NextResponse.json(engineJson);
  } catch (err: any) {
    console.error("describe route error:", err);
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
