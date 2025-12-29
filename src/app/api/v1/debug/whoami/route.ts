import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * Debug endpoint to confirm Clerk auth context.
 * NOTE: This is under /api/v1/debug/* which is already bypassed by middleware.
 */
export async function GET() {
  try {
    const { userId, sessionId, orgId } = (await auth()) as any;
    return NextResponse.json({
      ok: true,
      clerk: {
        userId: userId || null,
        sessionId: sessionId || null,
        orgId: orgId || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "auth_failed", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
