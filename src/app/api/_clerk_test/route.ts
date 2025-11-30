// Add this import at the top:
import { safeGetAuth } from "@/lib/clerkSafe";

// Then replace the line that does:
// const auth = getAuth((req as any));
// with:
const auth = safeGetAuth((req as any));

// Rest of file unchanged.


import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  try {
    const auth = getAuth((req as any));
    return NextResponse.json({ ok: true, auth });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
  }
}
