import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

/**
 * GET /api/_clerk_test
 * Returns getAuth() result so we can see whether Clerk middleware created context.
 */
export async function GET(req: Request) {
  try {
    // getAuth expects NextRequest in some versions; Clerk server helpers tolerate the NextRequest shape.
    const auth = getAuth((req as any));
    return NextResponse.json({ ok: true, auth });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
