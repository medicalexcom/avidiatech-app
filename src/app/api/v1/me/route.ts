import { NextResponse } from "next/server";
import { getClerkSession, getOrgFromClerkSession } from "@/lib/auth/clerkServer";

/**
 * GET /api/v1/me
 * Returns basic user/org info derived from server session (Clerk).
 */
export async function GET(req: Request) {
  try {
    const sess = await getClerkSession(req);
    if (!sess) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const org = await getOrgFromClerkSession(req);
    const user = { id: sess.userId };

    return NextResponse.json({ ok: true, org_id: org ?? null, user });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 });
  }
}
