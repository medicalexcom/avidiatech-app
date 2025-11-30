import { NextResponse, NextRequest } from "next/server";
import { safeGetAuth } from "@/lib/clerkSafe";

/**
 * Diagnostic route to verify Clerk auth context and middleware behavior.
 * Returns a minimal auth object or an error. Uses safeGetAuth to avoid
 * Clerk runtime warnings when middleware detection is imperfect.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = safeGetAuth(req as any);
    return NextResponse.json({ ok: true, auth });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
