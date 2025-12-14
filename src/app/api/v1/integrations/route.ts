import { NextResponse } from "next/server";
import { createIntegration, listIntegrations, testConnection } from "@/lib/integrations/service";
import { z } from "zod";

/**
 * GET: list integrations for the current org
 * POST: create new integration (api-key style)
 *
 * IMPORTANT:
 * - You MUST verify the caller's session and org membership before allowing these actions.
 *   TODO: integrate Clerk server-side verification and extract orgId from session.
 */

export async function GET(req: Request) {
  try {
    // TODO: verify session & derive orgId from session
    const url = new URL(req.url);
    const orgId = url.searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ ok: false, error: "orgId required" }, { status: 400 });

    const rows = await listIntegrations(orgId);
    return NextResponse.json({ ok: true, integrations: rows });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

const CreateBody = z.object({
  org_id: z.string().uuid(),
  provider: z.string(),
  name: z.string().optional(),
  config: z.any().optional(),
  secrets: z.any().optional(),
  test: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = CreateBody.parse(body);

    // TODO: verify session & that current user can create for parsed.org_id

    const created = await createIntegration({
      orgId: parsed.org_id,
      provider: parsed.provider,
      name: parsed.name,
      config: parsed.config,
      secrets: parsed.secrets,
      createdBy: undefined,
    });

    // Optionally run a connection test
    if (parsed.test) {
      const testRes = await testConnection(created);
      if (!testRes.ok) {
        // update status on integrations table (optional)
        // TODO: update integration status to 'failed'
        return NextResponse.json({ ok: true, integration: created, test: testRes }, { status: 200 });
      }
      return NextResponse.json({ ok: true, integration: created, test: testRes }, { status: 201 });
    }

    return NextResponse.json({ ok: true, integration: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
