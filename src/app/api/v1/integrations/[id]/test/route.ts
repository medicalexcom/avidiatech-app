// src/app/api/v1/integrations/[id]/test/route.ts
//
// POST /api/v1/integrations/:id/test
// Server-side wrapper that calls lib/integrations/service.testConnection(integration)
// and returns { ok: boolean, error?: string }

import { NextResponse } from "next/server";
import { getIntegration, testConnection } from "@/lib/integrations/service";

/**
 * Note: Next's context.params can be a Promise in some versions; normalize it here.
 */
export async function POST(req: Request, context: any) {
  try {
    let params = context?.params;
    if (params && typeof params?.then === "function") {
      params = await params;
    }
    const id = params?.id;
    if (!id) return NextResponse.json({ ok: false, error: "missing_integration_id" }, { status: 400 });

    const integration = await getIntegration(id);
    if (!integration) return NextResponse.json({ ok: false, error: "integration_not_found" }, { status: 404 });

    const result = await testConnection(integration);
    // testConnection returns { ok: boolean, error?: string } per service helper
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("integration test error:", err);
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
