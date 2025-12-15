import { NextResponse } from "next/server";

/**
 * Return current user's org context.
 * - In dev you can set DEV_ORG_ID env var to simulate a logged-in org.
 * - TODO: integrate Clerk or your auth provider server-side to derive org_id from session.
 */

export async function GET() {
  try {
    const devOrg = process.env.DEV_ORG_ID;
    if (devOrg) {
      return NextResponse.json({ ok: true, org_id: devOrg });
    }

    // TODO: Integrate Clerk / session verification here.
    // Example (Clerk): const session = await getAuth(req); derive org_id from session
    return NextResponse.json({ ok: false, error: "Not authenticated (DEV_ORG_ID not set). Integrate Clerk or session." }, { status: 401 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
